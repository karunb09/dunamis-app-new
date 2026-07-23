/**
 * One-off: apply the online/offline capacity rule to existing data.
 *   - Online group classes (no branchId): maxStudents 5
 *   - Offline group classes (branchId set): maxStudents UNLIMITED_STUDENTS
 * Demo and premium (1:1) rows are already 1 and left untouched.
 * Covers Slot docs, Teacher weeklyAvailability templates, and ClassRoster docs.
 * Idempotent — safe to re-run.
 *
 * Run from dunamis-lms-backend-main/:
 *   node scripts/updateSlotCapacity.js
 */

require("dotenv").config();
const mongoose = require("mongoose");

const Slot = require("../model/slot.model");
const Teacher = require("../model/teacher.model");
const ClassRoster = require("../model/classRoster.model");
const { UNLIMITED_STUDENTS } = require("../utils/slotCapacity");

async function run() {
  await mongoose.connect(process.env.MONGODB_URL, {
    maxPoolSize: 2,
    serverSelectionTimeoutMS: 10000,
  });
  console.log("DB connected\n");

  // Slot docs
  const slotOnline = await Slot.updateMany(
    { slotType: "enrolled", sessionType: "standard", branchId: null, maxStudents: { $ne: 5 } },
    { $set: { maxStudents: 5 } }
  );
  const slotOffline = await Slot.updateMany(
    {
      slotType: "enrolled",
      sessionType: "standard",
      branchId: { $ne: null },
      maxStudents: { $ne: UNLIMITED_STUDENTS },
    },
    { $set: { maxStudents: UNLIMITED_STUDENTS } }
  );
  console.log(
    `Slot: online -> 5 (${slotOnline.modifiedCount}), offline -> unlimited (${slotOffline.modifiedCount})`
  );

  // Teacher weeklyAvailability templates
  const onlineEntry = {
    slotType: "enrolled",
    sessionType: "standard",
    branchId: null,
    maxStudents: { $ne: 5 },
  };
  const teacherOnline = await Teacher.updateMany(
    { weeklyAvailability: { $elemMatch: onlineEntry } },
    { $set: { "weeklyAvailability.$[e].maxStudents": 5 } },
    {
      arrayFilters: [
        {
          "e.slotType": "enrolled",
          "e.sessionType": "standard",
          "e.branchId": null,
          "e.maxStudents": { $ne: 5 },
        },
      ],
    }
  );
  const offlineEntry = {
    slotType: "enrolled",
    sessionType: "standard",
    branchId: { $ne: null },
    maxStudents: { $ne: UNLIMITED_STUDENTS },
  };
  const teacherOffline = await Teacher.updateMany(
    { weeklyAvailability: { $elemMatch: offlineEntry } },
    { $set: { "weeklyAvailability.$[e].maxStudents": UNLIMITED_STUDENTS } },
    {
      arrayFilters: [
        {
          "e.slotType": "enrolled",
          "e.sessionType": "standard",
          "e.branchId": { $ne: null },
          "e.maxStudents": { $ne: UNLIMITED_STUDENTS },
        },
      ],
    }
  );
  console.log(
    `Teacher.weeklyAvailability: online -> 5 (${teacherOnline.modifiedCount} teacher docs), offline -> unlimited (${teacherOffline.modifiedCount} teacher docs)`
  );

  // ClassRoster docs
  const rosterOnline = await ClassRoster.updateMany(
    { sessionType: "standard", branchId: null, maxStudents: { $ne: 5 } },
    { $set: { maxStudents: 5 } }
  );
  const rosterOffline = await ClassRoster.updateMany(
    { sessionType: "standard", branchId: { $ne: null }, maxStudents: { $ne: UNLIMITED_STUDENTS } },
    { $set: { maxStudents: UNLIMITED_STUDENTS } }
  );
  console.log(
    `ClassRoster: online -> 5 (${rosterOnline.modifiedCount}), offline -> unlimited (${rosterOffline.modifiedCount})`
  );

  await mongoose.disconnect();
  console.log("\nDone.");
}

run().catch((error) => {
  console.error("updateSlotCapacity failed:", error);
  process.exit(1);
});
