"use strict";

// Integration tests for scripts/migrateOrgStructure.js.
//
// The script works on raw collections because it runs before the new schemas
// are deployed, so the fixtures here are raw documents in the old shapes:
// string zones on branches, the unused group-of-cities Zone, free-text
// Admin.department.
//
// Run with:  npm run test:integration

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const { startMemoryMongo, stopMemoryMongo } = require("./helpers/db");
const { migrateOrgStructure, mapDepartment } = require("../scripts/migrateOrgStructure");

const oid = () => new mongoose.Types.ObjectId();
let db;

before(async () => {
  await startMemoryMongo();
  db = mongoose.connection.db;
});
after(async () => {
  await stopMemoryMongo();
});
beforeEach(async () => {
  // Raw collections are invisible to the mongoose-model based clearCollections.
  await db.dropDatabase();
});

async function seedStaff({ department, permission = ["studentManagement"], accountStatus = "active", email }) {
  const userId = oid();
  await db.collection("users").insertOne({
    _id: userId,
    name: { firstName: "Staff", lastName: department || "None" },
    email: email || `${String(userId)}@example.com`,
    accountType: "admin",
    accountStatus,
  });
  await db.collection("admins").insertOne({
    userId,
    role: "Staff",
    accessLevel: "level 1",
    department,
    permission,
  });
  return userId;
}

async function seedLegacyData() {
  const hyderabad = oid();
  const pune = oid();
  await db.collection("cities").insertMany([
    { _id: hyderabad, cityName: "Hyderabad" },
    { _id: pune, cityName: "Pune" },
  ]);

  const alreadyMigrated = oid();
  await db.collection("zones").insertMany([
    // The old shape: a zone as a group of cities, with a manager and contact.
    { name: "Old", location: "x", manager: oid(), adminContact: 1, adminEmail: "a@x.com", city: [hyderabad] },
    { _id: alreadyMigrated, name: "Zone 9", city: pune },
  ]);

  const branchIds = {
    three: oid(),
    threeSpaced: oid(),
    south: oid(),
    blank: oid(),
    done: oid(),
  };
  await db.collection("branches").insertMany([
    { _id: branchIds.three, branchName: "Banjara", zone: "3", city: hyderabad },
    { _id: branchIds.threeSpaced, branchName: "Nagaram", zone: " 3 ", city: hyderabad },
    { _id: branchIds.south, branchName: "Koregaon", zone: "South", city: pune },
    { _id: branchIds.blank, branchName: "No zone", zone: "", city: hyderabad },
    { _id: branchIds.done, branchName: "Migrated", zone: alreadyMigrated, city: pune },
  ]);

  const ceo = await seedStaff({ department: "Leadership", permission: ["allAccess"], email: "ceo@example.com" });
  const bd = await seedStaff({ department: "Business Development" });
  const odd = await seedStaff({ department: "Front desk" });

  return { hyderabad, pune, alreadyMigrated, branchIds, users: { ceo, bd, odd } };
}

const branch = (id) => db.collection("branches").findOne({ _id: id });
const user = (id) => db.collection("users").findOne({ _id: id });

test("mapDepartment: keyword mapping onto the four departments", () => {
  assert.equal(mapDepartment("Leadership"), "leadership");
  assert.equal(mapDepartment("Operations Manager — South"), "operations");
  assert.equal(mapDepartment("HR"), "operations");
  assert.equal(mapDepartment("Business Development"), "marketing");
  assert.equal(mapDepartment("Academic"), "content");
  assert.equal(mapDepartment("Content"), "content");
  assert.equal(mapDepartment("Front desk"), null);
  assert.equal(mapDepartment(""), null);
});

test("dry run changes nothing", async () => {
  const { branchIds, users } = await seedLegacyData();

  const result = await migrateOrgStructure(db, { quiet: true });

  assert.equal(result.dryRun, true);
  assert.equal((await branch(branchIds.three)).zone, "3");
  assert.equal(await db.collection("zones").countDocuments(), 2);
  assert.equal((await user(users.ceo)).org, undefined);
});

test("--confirm turns each (city, zone) pair into one Zone and repoints its branches", async () => {
  const { hyderabad, pune, alreadyMigrated, branchIds } = await seedLegacyData();

  const result = await migrateOrgStructure(db, { confirm: true, quiet: true });

  assert.equal(result.zonesCreated, 2);
  assert.equal(result.branchesRepointed, 3);
  assert.equal(result.legacyZonesDeleted, 1);

  const zoneThree = await db.collection("zones").findOne({ city: hyderabad, name: "Zone 3" });
  const south = await db.collection("zones").findOne({ city: pune, name: "South" });
  assert.ok(zoneThree && south);
  assert.ok(zoneThree.createdAt instanceof Date);

  // Same zone after trimming, so both Hyderabad branches share one record.
  assert.deepEqual((await branch(branchIds.three)).zone, zoneThree._id);
  assert.deepEqual((await branch(branchIds.threeSpaced)).zone, zoneThree._id);
  assert.deepEqual((await branch(branchIds.south)).zone, south._id);
  // A blank zone is left for a person to fix; an ObjectId is left alone.
  assert.equal((await branch(branchIds.blank)).zone, "");
  assert.deepEqual((await branch(branchIds.done)).zone, alreadyMigrated);

  assert.equal(await db.collection("zones").countDocuments({ manager: { $exists: true } }), 0);
});

test("--confirm copies mapped departments and leaves unmapped ones unset", async () => {
  const { users } = await seedLegacyData();

  const result = await migrateOrgStructure(db, { confirm: true, quiet: true });

  assert.equal(result.departmentsCopied, 2);
  assert.equal((await user(users.ceo)).org.department, "leadership");
  assert.equal((await user(users.bd)).org.department, "marketing");
  assert.equal((await user(users.odd)).org, undefined);
  // Designations are never guessed.
  assert.equal((await user(users.bd)).org.designation, undefined);
  // Legacy fields stay until --unset-legacy (the old schema requires them).
  const admin = await db.collection("admins").findOne({ userId: users.bd });
  assert.equal(admin.department, "Business Development");
});

test("re-running is a no-op", async () => {
  await seedLegacyData();
  await migrateOrgStructure(db, { confirm: true, quiet: true });

  const again = await migrateOrgStructure(db, { confirm: true, quiet: true });

  assert.equal(again.zonesCreated, 0);
  assert.equal(again.branchesRepointed, 0);
  assert.equal(again.legacyZonesDeleted, 0);
  assert.equal(again.departmentsCopied, 0);
});

test("--confirm refuses to run when no active admin holds All Access", async () => {
  const { branchIds } = await seedLegacyData();
  await db.collection("admins").updateMany({}, { $set: { permission: ["studentManagement"] } });

  const result = await migrateOrgStructure(db, { confirm: true, quiet: true });

  assert.equal(result.aborted, true);
  assert.equal((await branch(branchIds.three)).zone, "3");
});

test("--grant-all-access names the account to recover with, then proceeds", async () => {
  const { branchIds, users } = await seedLegacyData();
  await db.collection("admins").updateMany({}, { $set: { permission: ["studentManagement"] } });

  const result = await migrateOrgStructure(db, { confirm: true, grantEmail: "CEO@example.com", quiet: true });

  assert.equal(result.aborted, false);
  const ceoAdmin = await db.collection("admins").findOne({ userId: users.ceo });
  assert.ok(ceoAdmin.permission.includes("allAccess"));
  assert.notEqual((await branch(branchIds.three)).zone, "3");
});

test("--unset-legacy removes Admin.department and accessLevel", async () => {
  await seedLegacyData();

  const result = await migrateOrgStructure(db, { confirm: true, unsetLegacy: true, quiet: true });

  assert.equal(result.legacyFieldsUnset, 3);
  const remaining = await db
    .collection("admins")
    .countDocuments({ $or: [{ department: { $exists: true } }, { accessLevel: { $exists: true } }] });
  assert.equal(remaining, 0);
});
