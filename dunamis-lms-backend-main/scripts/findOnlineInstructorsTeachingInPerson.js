/**
 * Report: instructors set up as online who are still linked to in-person
 * teaching — a branch, an offline course, or a schedule slot at a branch.
 *
 * Since Sep 2026 that can no longer happen (services/orgPlacement.js →
 * assertCanTeachInPerson), but links made before then remain. Such an
 * instructor gets no branch check-in, because check-in follows the mode. Fix
 * each one in the dashboard: Instructor Management → edit → mode offline or
 * hybrid (or remove the in-person links if they really are online-only).
 *
 * Read-only. Run from dunamis-lms-backend-main/:
 *   node scripts/findOnlineInstructorsTeachingInPerson.js
 */

require("dotenv").config();
const mongoose = require("mongoose");

require("../model/user.model");
require("../model/teacherApplication.model");
const Teacher = require("../model/teacher.model");
const { inPersonTeaching } = require("../services/orgPlacement");
const { formatUserName } = require("../utils/formatName");

(async () => {
  await mongoose.connect(process.env.MONGODB_URL);

  const teachers = await Teacher.find()
    .select("userId teacherDetail")
    .populate("userId", "name email employeeId")
    .populate("teacherDetail", "mode")
    .lean();
  const online = teachers.filter((teacher) => teacher.teacherDetail?.mode === "online");

  let found = 0;
  for (const teacher of online) {
    const links = await inPersonTeaching(teacher._id);
    if (!links.length) continue;
    found += 1;
    const who = formatUserName(teacher.userId?.name, "Instructor");
    const id = teacher.userId?.employeeId ? ` ${teacher.userId.employeeId}` : "";
    console.log(`${who}${id} <${teacher.userId?.email || "no email"}>: ${links.join("; ")}`);
  }

  console.log(
    found
      ? `\n${found} online instructor(s) still teach in person. Switch each to offline or hybrid, or remove the links.`
      : `Checked ${online.length} online instructor(s): none teach in person.`
  );
  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
