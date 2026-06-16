/**
 * One-time migration: seed versioned document arrays on Teacher from their accepted
 * TeacherApplication record.
 *
 * Run from dunamis-lms-backend-main/:
 *   node scripts/migrateInstructorDocs.js
 *
 * Safe to re-run: skips any teacher whose arrays are already populated (needsSeeding guard).
 * Prints a summary at the end. No data is deleted.
 */

require("dotenv").config();
const mongoose = require("mongoose");

const TeacherApplication = require("../model/teacherApplication.model");
const User = require("../model/user.model");
const Teacher = require("../model/teacher.model");

async function run() {
  await mongoose.connect(process.env.MONGODB_URL, {
    maxPoolSize: 2,
    serverSelectionTimeoutMS: 10000,
  });
  console.log("DB connected");

  const applications = await TeacherApplication.find({ status: "selected" }).lean();
  console.log(`Found ${applications.length} accepted application(s)`);

  let seeded = 0;
  let skipped = 0;
  let notFound = 0;

  for (const app of applications) {
    const user = await User.findOne({ email: app.email, accountType: "teacher" }).lean();
    if (!user || !user.roleId) {
      console.warn(`  [SKIP] No teacher user found for email: ${app.email}`);
      notFound++;
      continue;
    }

    const teacher = await Teacher.findById(user.roleId);
    if (!teacher) {
      console.warn(`  [SKIP] Teacher doc not found for roleId: ${user.roleId} (${app.email})`);
      notFound++;
      continue;
    }

    const needsSeeding =
      teacher.certificates.length === 0 &&
      teacher.profileVideos.length === 0 &&
      teacher.profilePictures.length === 0;

    if (!needsSeeding) {
      console.log(`  [SKIP] Already seeded: ${app.email}`);
      skipped++;
      continue;
    }

    const push = {};
    if (app.relevantCertificate) {
      push.certificates = { filePath: app.relevantCertificate, uploadedAt: app.updatedAt || new Date(), isActive: true };
    }
    if (app.profileVideo) {
      push.profileVideos = { filePath: app.profileVideo, uploadedAt: app.updatedAt || new Date(), isActive: true };
    }
    if (app.profilePicture) {
      push.profilePictures = { filePath: app.profilePicture, uploadedAt: app.updatedAt || new Date(), isActive: true };
    }

    if (Object.keys(push).length === 0) {
      console.log(`  [SKIP] No file fields on application: ${app.email}`);
      skipped++;
      continue;
    }

    await Teacher.findByIdAndUpdate(teacher._id, { $push: push });
    const fields = Object.keys(push).join(", ");
    console.log(`  [OK]   Seeded (${fields}): ${app.email}`);
    seeded++;
  }

  console.log(`\nDone — seeded: ${seeded}, skipped: ${skipped}, not found: ${notFound}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
