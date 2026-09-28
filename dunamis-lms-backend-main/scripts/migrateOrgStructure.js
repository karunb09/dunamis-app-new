/**
 * One-off: move existing data onto the org-structure shapes.
 *
 * 1. Zones. Branch.zone is a typed string today ("3", "South"). It becomes a
 *    reference to a Zone that belongs to the branch's city. Each distinct
 *    (city, zone) pair becomes one Zone and its branches point at it. Old
 *    Zone docs (the unused "group of cities" shape) are printed and deleted:
 *    nothing references them.
 * 2. Staff. Admin.department is free text. It is mapped by keyword onto
 *    User.org.department. Designations are only printed as suggestions:
 *    an employee-ID letter or a job title is not reliable enough to route
 *    messages on, so people are placed from the Reporting structure tab.
 * 3. --unset-legacy removes Admin.department / Admin.accessLevel.
 *
 * Uses raw collections so it does not depend on the new schemas, and must run
 * BEFORE the org-structure code is deployed: Mongoose refuses to populate
 * "3" as a Zone id, so the new code would fail every branch read until the
 * strings are gone. --unset-legacy is the exception: the old code requires
 * those fields, so it runs after the deploy (and repeats the zone pass to
 * catch branches created in between).
 *
 * Dry-runs by default. Idempotent — safe to re-run.
 *
 * Run from dunamis-lms-backend-main/:
 *   node scripts/migrateOrgStructure.js                       # report only
 *   node scripts/migrateOrgStructure.js --confirm             # before deploy
 *   node scripts/migrateOrgStructure.js --confirm --unset-legacy   # after deploy
 *   ... --grant-all-access=ceo@example.com   # if no active admin has All Access
 */

require("dotenv").config();
const mongoose = require("mongoose");

const noop = () => {};
const QUIET = { log: noop, table: noop, dir: noop, error: noop };

// Order matters: the first match wins.
const DEPARTMENT_RULES = [
  ["leadership", /leader|\bceo\b|founder|director|\bmd\b|central office/i],
  ["content", /content|course|curriculum|academ/i],
  ["operations", /operation|administration|\bhr\b|human resource|finance|account/i],
  ["marketing", /marketing|business|sales|\bbd[em]?\b|promotion|communication|tele|counsel/i],
];

const DESIGNATION_HINTS = [
  ["ceo", /\bceo\b|founder|managing director/i],
  ["resourceHead", /resource head/i],
  ["operationsHead", /operations? head/i],
  ["marketingHead", /marketing head/i],
  ["bdm", /regional manager|business development manager|\bbdm\b/i],
  ["bde", /branch manager|business development executive|\bbde\b/i],
  ["aa", /tele ?caller|counsel|admin(istrative)? assistant|\baa\b/i],
  ["courseManager", /course manager/i],
  ["contentCreator", /content/i],
  ["operationsManager", /operations? manager/i],
  ["hrManager", /\bhr\b|human resource/i],
  ["financeManager", /finance|account/i],
];

const mapDepartment = (value) => {
  const text = String(value || "").trim();
  if (!text) return null;
  const rule = DEPARTMENT_RULES.find(([, pattern]) => pattern.test(text));
  return rule ? rule[0] : null;
};

const suggestDesignation = ({ role, employeeId }) => {
  const byTitle = DESIGNATION_HINTS.find(([, pattern]) => pattern.test(role || ""));
  if (byTitle) return byTitle[0];
  if (/^DMPL/.test(employeeId || "")) return "ceo or a department head";
  if (/^(DSM|DSD|DCC)A/.test(employeeId || "")) return "aa, or content/operations staff";
  if (/^(DSM|DSD|DCC)B/.test(employeeId || "")) return "bde or bdm";
  return "";
};

const zoneNameFor = (raw) => (/^\d+$/.test(raw) ? `Zone ${raw}` : raw);

const toObjectId = (value) => {
  if (value instanceof mongoose.Types.ObjectId) return value;
  return mongoose.isValidObjectId(value) ? new mongoose.Types.ObjectId(String(value)) : null;
};

const fullName = (user) =>
  user ? `${user.name?.firstName || ""} ${user.name?.lastName || ""}`.trim() : "(no user)";

async function migrateZones(db, { confirm, out }) {
  const zones = db.collection("zones");
  const branches = db.collection("branches");
  const cities = db.collection("cities");

  const legacyZones = await zones
    .find({ $or: [{ manager: { $exists: true } }, { city: { $type: "array" } }] })
    .toArray();
  out.log(`Legacy Zone docs (old group-of-cities shape): ${legacyZones.length}`);
  for (const zone of legacyZones) out.dir(zone, { depth: null });

  const stringZoned = await branches
    .find({ zone: { $not: { $type: "objectId" } } })
    .project({ branchName: 1, zone: 1, city: 1 })
    .toArray();

  const cityDocs = await cities.find({}).project({ cityName: 1 }).toArray();
  const cityNames = new Map(cityDocs.map((city) => [String(city._id), city.cityName]));

  const groups = new Map();
  const manual = [];
  for (const branch of stringZoned) {
    const raw = typeof branch.zone === "string" ? branch.zone.trim() : "";
    const cityId = toObjectId(branch.city);
    if (!raw || !cityId || !cityNames.has(String(cityId))) {
      manual.push({
        branch: branch.branchName,
        zone: branch.zone ?? "(missing)",
        city: cityId ? cityNames.get(String(cityId)) || `(unknown ${cityId})` : "(missing)",
      });
      continue;
    }
    const name = zoneNameFor(raw);
    const key = `${cityId}|${name}`;
    if (!groups.has(key)) groups.set(key, { cityId, name, branchIds: [], branchNames: [] });
    groups.get(key).branchIds.push(branch._id);
    groups.get(key).branchNames.push(branch.branchName);
  }

  out.log(`\nBranches still on a string zone: ${stringZoned.length}`);
  if (groups.size) {
    out.table(
      [...groups.values()].map((group) => ({
        city: cityNames.get(String(group.cityId)),
        zone: group.name,
        branches: group.branchNames.join(", "),
      }))
    );
  }
  if (manual.length) {
    out.log("Need a manual fix (no zone, or no valid city) — the new code requires both:");
    out.table(manual);
  }

  if (!confirm) return { zonesCreated: 0, branchesRepointed: 0, legacyZonesDeleted: 0 };

  let created = 0;
  let repointed = 0;
  for (const group of groups.values()) {
    let zone = await zones.findOne({ city: group.cityId, name: group.name });
    if (!zone) {
      const now = new Date();
      // Raw insert: timestamps are not applied for us.
      const { insertedId } = await zones.insertOne({
        name: group.name,
        city: group.cityId,
        createdAt: now,
        updatedAt: now,
        __v: 0,
      });
      zone = { _id: insertedId };
      created += 1;
    }
    const result = await branches.updateMany(
      { _id: { $in: group.branchIds } },
      { $set: { zone: zone._id } }
    );
    repointed += result.modifiedCount;
  }

  let removed = 0;
  if (legacyZones.length) {
    const result = await zones.deleteMany({ _id: { $in: legacyZones.map((zone) => zone._id) } });
    removed = result.deletedCount;
  }

  out.log(`\nZones created: ${created}. Branches repointed: ${repointed}. Legacy zones deleted: ${removed}.`);
  return { zonesCreated: created, branchesRepointed: repointed, legacyZonesDeleted: removed };
}

async function reportStaff(db, { out }) {
  const admins = await db.collection("admins").find({}).toArray();
  const users = db.collection("users");
  const staffUsers = await users
    .find({ accountType: { $in: ["admin", "superadmin"] } })
    .project({ name: 1, email: 1, employeeId: 1, accountType: 1, accountStatus: 1, org: 1 })
    .toArray();
  const usersById = new Map(staffUsers.map((user) => [String(user._id), user]));
  const adminUserIds = new Set(admins.map((admin) => String(admin.userId)));

  const rows = admins.map((admin) => {
    const user = usersById.get(String(admin.userId));
    return {
      admin,
      user,
      mapped: mapDepartment(admin.department),
    };
  });

  out.log(`\nStaff (${rows.length} admin records):`);
  out.table(
    rows.map(({ admin, user, mapped }) => ({
      name: fullName(user),
      email: user?.email || "",
      employeeId: user?.employeeId || "",
      status: user?.accountStatus || "(user missing)",
      department: admin.department ?? "",
      "→ org.department": mapped || "UNMAPPED",
      jobTitle: admin.role || "",
      "suggested designation": suggestDesignation({ role: admin.role, employeeId: user?.employeeId }),
    }))
  );

  const unmapped = rows.filter((row) => row.admin.department && !row.mapped);
  if (unmapped.length) {
    out.log("Departments with no keyword match (set them from the dashboard):");
    for (const row of unmapped) out.log(`  - ${fullName(row.user)}: "${row.admin.department}"`);
  }

  const emptyPermissions = rows.filter((row) => !(row.admin.permission || []).length);
  if (emptyPermissions.length) {
    out.log("Admins with NO permissions (the dashboard currently treats that as full access):");
    for (const row of emptyPermissions) out.log(`  - ${fullName(row.user)} <${row.user?.email || "?"}>`);
  }

  const withoutAdminDoc = staffUsers.filter(
    (user) => user.accountType === "admin" && !adminUserIds.has(String(user._id))
  );
  if (withoutAdminDoc.length) {
    out.log("Admin users with no Admin record (no role or permissions stored):");
    for (const user of withoutAdminDoc) out.log(`  - ${fullName(user)} <${user.email}>`);
  }

  const superadmins = staffUsers.filter((user) => user.accountType === "superadmin");
  const inactive = staffUsers.filter((user) => user.accountStatus !== "active");
  out.log(`Superadmin accounts: ${superadmins.length}. Inactive staff accounts: ${inactive.length}.`);

  const activeAllAccess = rows.filter(
    (row) =>
      row.user?.accountStatus === "active" &&
      row.user?.accountType === "admin" &&
      (row.admin.permission || []).includes("allAccess")
  );
  out.log(
    `Active admins with All Access: ${activeAllAccess.length}` +
      (activeAllAccess.length ? ` (${activeAllAccess.map((row) => fullName(row.user)).join(", ")})` : "")
  );

  const activeSuperadmins = superadmins.filter((user) => user.accountStatus === "active");
  return { rows, activeAllAccessCount: activeAllAccess.length + activeSuperadmins.length };
}

async function applyStaff(db, rows, { out }) {
  const users = db.collection("users");
  let copied = 0;
  for (const { admin, mapped } of rows) {
    if (!mapped) continue;
    const result = await users.updateOne(
      { _id: admin.userId, "org.department": { $exists: false } },
      { $set: { "org.department": mapped } }
    );
    copied += result.modifiedCount;
  }
  out.log(`\nCopied department onto ${copied} user(s).`);
  return copied;
}

async function grantAllAccess(db, email, { out }) {
  const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const user = await db.collection("users").findOne({
    email: new RegExp(`^${escaped}$`, "i"),
    accountType: "admin",
    accountStatus: "active",
  });
  if (!user) throw new Error(`No active admin with email ${email}.`);
  const result = await db
    .collection("admins")
    .updateOne({ userId: user._id }, { $addToSet: { permission: "allAccess" } });
  if (!result.matchedCount) throw new Error(`${email} has no Admin record to grant All Access on.`);
  out.log(`Granted All Access to ${fullName(user)} <${user.email}>.`);
}

async function migrateOrgStructure(db, { confirm = false, unsetLegacy = false, grantEmail = null, quiet = false } = {}) {
  const out = quiet ? QUIET : console;
  out.log(`${confirm ? "APPLYING CHANGES" : "DRY RUN"}${unsetLegacy ? " (+ unset legacy admin fields)" : ""}\n`);

  const { rows, activeAllAccessCount } = await reportStaff(db, { out });

  // The server refuses to hand out All Access unless the caller holds it, so
  // with nobody holding it no one could ever grant it again from the dashboard.
  if (confirm && !activeAllAccessCount && !grantEmail) {
    out.error(
      "\nNo active admin has All Access. Re-run with --grant-all-access=<email> naming the CEO's admin account."
    );
    return { aborted: true };
  }

  out.log("");
  const zones = await migrateZones(db, { confirm, out });

  if (!confirm) {
    out.log("\nDry run — no changes made. With --confirm this would:");
    out.log("  - create one Zone per (city, zone) pair above and point those branches at it");
    out.log("  - delete the legacy Zone docs listed above");
    out.log("  - copy each mapped department onto User.org.department (where not already set)");
    if (unsetLegacy) out.log("  - unset Admin.department and Admin.accessLevel on every admin");
    if (grantEmail) out.log(`  - grant All Access to ${grantEmail}`);
    return { aborted: false, dryRun: true };
  }

  if (grantEmail) await grantAllAccess(db, grantEmail, { out });
  const departmentsCopied = await applyStaff(db, rows, { out });

  let legacyFieldsUnset = 0;
  if (unsetLegacy) {
    const result = await db
      .collection("admins")
      .updateMany({}, { $unset: { department: "", accessLevel: "" } });
    legacyFieldsUnset = result.modifiedCount;
    out.log(`Unset department/accessLevel on ${legacyFieldsUnset} admin record(s).`);
  }

  out.log("\nDone.");
  return { aborted: false, ...zones, departmentsCopied, legacyFieldsUnset };
}

async function main() {
  const grantArg = process.argv.find((arg) => arg.startsWith("--grant-all-access="));
  await mongoose.connect(process.env.MONGODB_URL, {
    maxPoolSize: 2,
    serverSelectionTimeoutMS: 10000,
  });
  console.log("DB connected");
  const result = await migrateOrgStructure(mongoose.connection.db, {
    confirm: process.argv.includes("--confirm"),
    unsetLegacy: process.argv.includes("--unset-legacy"),
    grantEmail: grantArg ? grantArg.split("=")[1].trim().toLowerCase() : null,
  });
  if (result.aborted) process.exitCode = 1;
  await mongoose.disconnect();
}

module.exports = { migrateOrgStructure, mapDepartment };

if (require.main === module) {
  main().catch(async (error) => {
    console.error(error);
    await mongoose.disconnect().catch(() => {});
    process.exitCode = 1;
  });
}
