const asyncHandler = require("../utils/asyncHandler");
const { getScope, loadStaff } = require("../middleware/auth");
const { buildTodaySchedule } = require("../services/todaySchedule");

const SECTION_KEYS = {
  instructors: "instructorManagement",
  students: "studentManagement",
  staff: "adminManagement",
};

exports.getTodaySchedule = asyncHandler(async (req, res) => {
  const staff = await loadStaff(req);
  const sections = Object.fromEntries(
    Object.entries(SECTION_KEYS).map(([section, key]) => [
      section,
      Boolean(staff?.unrestricted || staff?.permissions?.includes(key)),
    ])
  );
  const schedule = await buildTodaySchedule({ area: await getScope(req), sections });
  res.status(200).json({ success: true, ...schedule });
});
