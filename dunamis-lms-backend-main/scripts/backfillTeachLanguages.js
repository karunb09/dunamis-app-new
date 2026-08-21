/**
 * One-time backfill: give every instructor and course a teaching language so
 * the public site never renders a blank language. Defaults to English;
 * instructors correct their own from the dashboard profile page.
 *
 * Run from dunamis-lms-backend-main/:
 *   node scripts/backfillTeachLanguages.js            # dry run
 *   node scripts/backfillTeachLanguages.js --confirm  # write
 *
 * Safe to re-run: only missing/empty values are touched, so an instructor's
 * own correction is never overwritten.
 */

require("dotenv").config();
const mongoose = require("mongoose");

const Course = require("../model/course.model");
const TeacherDetail = require("../model/teacherApplication.model");
const { DEFAULT_TEACHING_LANGUAGES } = require("../constants/languages");

const CONFIRMED = process.argv.includes("--confirm");

const emptyFilter = (field) => ({
  $or: [
    { [field]: { $exists: false } },
    { [field]: null },
    { [field]: { $size: 0 } },
  ],
});

async function run() {
  await mongoose.connect(process.env.MONGODB_URL, {
    maxPoolSize: 2,
    serverSelectionTimeoutMS: 10000,
  });
  console.log("DB connected");
  console.log(CONFIRMED ? "MODE: write\n" : "MODE: dry run (pass --confirm to write)\n");

  const teacherFilter = emptyFilter("language.teach");
  const courseFilter = emptyFilter("languages");

  const teachers = await TeacherDetail.find(teacherFilter)
    .select("name email language")
    .lean();
  const courses = await Course.find(courseFilter).select("name code").lean();

  console.log(`Instructors without a teaching language: ${teachers.length}`);
  for (const teacher of teachers) {
    const fullName = `${teacher.name?.firstName || ""} ${teacher.name?.lastName || ""}`.trim();
    console.log(`  ${fullName || "(no name)"}  ${teacher.email || ""}`);
  }

  console.log(`\nCourses without a language: ${courses.length}`);
  for (const course of courses) {
    console.log(`  ${course.code || "(no code)"}  ${course.name || ""}`);
  }

  if (!CONFIRMED) {
    console.log("\nDry run complete. Nothing written.");
    return;
  }

  const teacherResult = await TeacherDetail.updateMany(teacherFilter, {
    $set: { "language.teach": DEFAULT_TEACHING_LANGUAGES },
  });
  const courseResult = await Course.updateMany(courseFilter, {
    $set: { languages: DEFAULT_TEACHING_LANGUAGES },
  });

  console.log(
    `\nUpdated ${teacherResult.modifiedCount} instructor(s) and ${courseResult.modifiedCount} course(s) to ${JSON.stringify(
      DEFAULT_TEACHING_LANGUAGES
    )}`
  );
}

run()
  .catch((error) => {
    console.error("Backfill failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
    console.log("DB disconnected");
  });
