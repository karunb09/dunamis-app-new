// Who is on the timetable today: instructors with a class or demo, learners on
// an active enrollment, and the offline AAs/BDEs whose branches are open.
// Classes come from the daily attendance report so both pages agree on what
// counts as a class.

const Branch = require("../model/branch.model");
const Course = require("../model/course.model");
const DemoBooking = require("../model/demoBooking.model");
const InstructorCheckIn = require("../model/instructorCheckIn.model");
const Slot = require("../model/slot.model");
const StaffCheckIn = require("../model/staffCheckIn.model");
const Student = require("../model/student.model");
require("../model/subCategory.model");
const User = require("../model/user.model");
const { buildDailyAttendanceReport } = require("./attendanceReport");
const { branchHoursFor, branchIdsFor, isStaffRole } = require("./staffCheckIn");
const { parseTimeMinutes } = require("../utils/classRoster");
const { formatUserName } = require("../utils/formatName");
const { dayKeyFromDate, dayLabel, dayWindow, istDayStart } = require("../utils/istMonth");
const { DESIGNATIONS } = require("../utils/orgStructure");
const { loadScopeCatalog } = require("../utils/orgScope");
const { isInScope } = require("../utils/scopeFilters");

const idOf = (value) => String(value?._id || value || "");
const unique = (values) => [...new Set(values.filter(Boolean))];
const timeOn = (dayKey, value) =>
  new Date(istDayStart(dayKey).getTime() + parseTimeMinutes(value) * 60000);

const enrolledClasses = (report, dayKey) =>
  report.classes.map((item) => ({
    slotId: item.slotId,
    kind: "class",
    courseId: item.courseId,
    courseName: item.courseName,
    teacherId: item.teacherId,
    teacherName: item.teacherName,
    employeeId: item.employeeId,
    branchId: item.branchId,
    branchName: item.branchName,
    startTime: item.startTime,
    endTime: item.endTime,
    startAt: timeOn(dayKey, item.startTime),
    endAt: timeOn(dayKey, item.endTime),
    learners: item.students
      .filter((student) => student.studentId)
      .map((student) => ({ studentId: student.studentId, name: student.name })),
  }));

// Demo slots with a booking that wasn't cancelled; a guest booking has a lead
// name but no student record.
const demoClasses = async (dayKey) => {
  const { start, end } = dayWindow(dayKey);
  const slots = await Slot.find({ slotType: "demo", date: { $gte: start, $lt: end } })
    .select("courseId branchId createdBy startTime endTime")
    .populate("courseId", "name")
    .populate("branchId", "branchName")
    .populate({ path: "createdBy", select: "userId", populate: { path: "userId", select: "name employeeId" } })
    .lean();
  if (!slots.length) return [];

  const bookings = await DemoBooking.find({
    slotId: { $in: slots.map((slot) => slot._id) },
    demoStatus: { $ne: "Cancelled" },
  })
    .select("slotId studentId lead")
    .populate({ path: "studentId", select: "userId", populate: { path: "userId", select: "name" } })
    .lean();
  const bookingsBySlot = new Map();
  for (const booking of bookings) {
    const key = idOf(booking.slotId);
    if (!bookingsBySlot.has(key)) bookingsBySlot.set(key, []);
    bookingsBySlot.get(key).push(booking);
  }

  return slots
    .filter((slot) => bookingsBySlot.has(idOf(slot._id)))
    .map((slot) => ({
      slotId: slot._id,
      kind: "demo",
      courseId: slot.courseId?._id || slot.courseId || null,
      courseName: slot.courseId?.name || "Demo",
      teacherId: slot.createdBy?._id || slot.createdBy || null,
      teacherName: formatUserName(slot.createdBy?.userId?.name, "Unknown instructor"),
      employeeId: slot.createdBy?.userId?.employeeId || null,
      branchId: slot.branchId?._id || slot.branchId || null,
      branchName: slot.branchId?.branchName || null,
      startTime: slot.startTime,
      endTime: slot.endTime,
      startAt: timeOn(dayKey, slot.startTime),
      endAt: timeOn(dayKey, slot.endTime),
      learners: bookingsBySlot.get(idOf(slot._id)).map((booking) => ({
        studentId: booking.studentId?._id || null,
        name: booking.studentId
          ? formatUserName(booking.studentId.userId?.name, "Student")
          : formatUserName(booking.lead, "Guest"),
      })),
    }));
};

// A class learner counts only while their enrollment in that course is
// in-progress and their account is usable; a class left with nobody is dropped.
const keepActiveLearners = async (classes) => {
  const ids = unique(classes.flatMap((item) => item.learners.map((learner) => idOf(learner.studentId))));
  if (!ids.length) return classes;
  const students = await Student.find({ _id: { $in: ids } })
    .select("userId adminActions enrolledCourses.courseId enrolledCourses.status")
    .populate("userId", "accountStatus")
    .lean();
  const activeCourses = new Map(
    students
      .filter(
        (student) =>
          student.userId?.accountStatus === "active" &&
          !student.adminActions?.isBlocked &&
          !student.adminActions?.isDisabled &&
          !student.adminActions?.isArchived
      )
      .map((student) => [
        idOf(student._id),
        new Set(
          (student.enrolledCourses || [])
            .filter((entry) => entry.status === "in-progress")
            .map((entry) => idOf(entry.courseId))
        ),
      ])
  );
  return classes
    .map((item) => ({
      ...item,
      learners: item.learners.filter((learner) =>
        activeCourses.get(idOf(learner.studentId))?.has(idOf(item.courseId))
      ),
    }))
    .filter((item) => item.learners.length > 0);
};

// Delivery mode and instruments (the course's subcategories) for the filters.
const withCourseFacets = async (classes) => {
  const courses = await Course.find({ _id: { $in: unique(classes.map((item) => idOf(item.courseId))) } })
    .select("mode subCategory")
    .populate("subCategory", "name")
    .lean();
  const byId = new Map(courses.map((course) => [idOf(course._id), course]));
  return classes.map((item) => {
    const course = byId.get(idOf(item.courseId));
    return {
      ...item,
      mode: item.branchId || course?.mode === "offline" ? "offline" : "online",
      instruments: (course?.subCategory || [])
        .filter((sub) => sub?.name)
        .map((sub) => ({ id: sub._id, name: sub.name })),
    };
  });
};

const describeCheckIns = (visits) => {
  if (!visits?.length) return { status: "none" };
  const ordered = [...visits].sort((a, b) => new Date(a.checkIn.at) - new Date(b.checkIn.at));
  const open = ordered.find((visit) => visit.status === "open");
  const last = ordered[ordered.length - 1];
  return {
    status: open ? "in" : "out",
    firstInAt: ordered[0].checkIn.at,
    lastOutAt: open ? null : last.checkOut?.at || null,
    branchName: (open || last).branchId?.branchName || null,
  };
};

const groupInstructors = (classes, checkIns) => {
  const byTeacher = new Map();
  for (const item of classes) {
    const key = idOf(item.teacherId);
    if (!byTeacher.has(key)) {
      byTeacher.set(key, {
        teacherId: item.teacherId,
        name: item.teacherName,
        employeeId: item.employeeId,
        classes: [],
      });
    }
    byTeacher.get(key).classes.push(item);
  }
  return [...byTeacher.values()].map((row) => {
    const inPerson = row.classes.some((item) => item.branchId);
    return {
      ...row,
      inPerson,
      checkIn: inPerson ? describeCheckIns(checkIns.get(idOf(row.teacherId))) : null,
    };
  });
};

// Demo bookings are leads, not students: they show on the instructor's day only.
const groupStudents = (classes) => {
  const byStudent = new Map();
  for (const item of classes.filter((entry) => entry.kind === "class")) {
    for (const learner of item.learners) {
      const key = idOf(learner.studentId);
      if (!byStudent.has(key)) {
        byStudent.set(key, { studentId: learner.studentId, name: learner.name, classes: [] });
      }
      const { learners, ...withoutLearners } = item;
      byStudent.get(key).classes.push(withoutLearners);
    }
  }
  return [...byStudent.values()];
};

// Offline AAs/BDEs with at least one open branch today; `branchIds` limits
// both who is listed and which of their branches show (a scoped viewer).
const staffOnDuty = async ({ dayKey, branchIds }) => {
  const [users, catalog] = await Promise.all([
    User.find({ accountType: "admin", accountStatus: "active", "org.designation": { $in: ["aa", "bde"] } })
      .select("name employeeId accountType accountStatus org")
      .lean(),
    loadScopeCatalog(),
  ]);
  const staff = users.filter(isStaffRole);
  if (!staff.length) return [];

  const area = branchIds ? new Set(branchIds.map(idOf)) : null;
  const branchesFor = new Map(
    staff.map((user) => [
      idOf(user._id),
      branchIdsFor(user, catalog).filter((id) => !area || area.has(id)),
    ])
  );
  const wanted = [...new Set([...branchesFor.values()].flat())];
  const [branches, visits] = await Promise.all([
    Branch.find({ _id: { $in: wanted }, status: "active" })
      .select("branchName branchTimings branchOpenDays")
      .lean(),
    StaffCheckIn.find({ dayKey, userId: { $in: staff.map((user) => user._id) } })
      .select("userId branchId status checkIn.at checkOut.at")
      .populate("branchId", "branchName")
      .lean(),
  ]);
  const openToday = new Map();
  for (const branch of branches) {
    const hours = branchHoursFor(branch, dayKey);
    if (!hours.closedToday) {
      openToday.set(idOf(branch._id), {
        branchId: branch._id,
        branchName: branch.branchName,
        opensAt: hours.opensAt,
        closesAt: hours.closesAt,
      });
    }
  }
  const visitsByUser = new Map();
  for (const visit of visits) {
    const key = idOf(visit.userId);
    if (!visitsByUser.has(key)) visitsByUser.set(key, []);
    visitsByUser.get(key).push(visit);
  }

  return staff
    .map((user) => {
      const open = branchesFor
        .get(idOf(user._id))
        .map((id) => openToday.get(id))
        .filter(Boolean)
        .sort((a, b) => a.branchName.localeCompare(b.branchName));
      return {
        userId: user._id,
        name: formatUserName(user.name, "Staff member"),
        employeeId: user.employeeId || null,
        designation: user.org.designation,
        designationLabel: DESIGNATIONS[user.org.designation]?.label || "",
        branches: open,
        checkIn: describeCheckIns(visitsByUser.get(idOf(user._id))),
      };
    })
    .filter((row) => row.branches.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
};

const byStart = (a, b) => new Date(a.startAt) - new Date(b.startAt) || a.courseName.localeCompare(b.courseName);
const byFirstClass = (a, b) =>
  new Date(a.classes[0].startAt) - new Date(b.classes[0].startAt) || a.name.localeCompare(b.name);

// area: the viewer's scope ({ branchIds, courseIds }) or null for everything.
// sections: which of instructors / students / staff the viewer may see.
const buildTodaySchedule = async ({ area = null, sections, now = new Date() }) => {
  const dayKey = dayKeyFromDate(now);
  const [report, demos, staff] = await Promise.all([
    buildDailyAttendanceReport({ dayKey }),
    demoClasses(dayKey),
    sections.staff ? staffOnDuty({ dayKey, branchIds: area?.branchIds || null }) : [],
  ]);

  const inArea = (item) => isInScope(area, { branchId: item.branchId, courseId: item.courseId });
  const enrolled = await keepActiveLearners(enrolledClasses(report, dayKey).filter(inArea));
  const classes = (await withCourseFacets([...enrolled, ...demos.filter(inArea)])).sort(byStart);

  const teacherIds = [...new Set(classes.filter((item) => item.branchId).map((item) => idOf(item.teacherId)))];
  const visits = teacherIds.length
    ? await InstructorCheckIn.find({ dayKey, teacherId: { $in: teacherIds } })
        .select("teacherId branchId status checkIn.at checkOut.at")
        .populate("branchId", "branchName")
        .lean()
    : [];
  const checkIns = new Map();
  for (const visit of visits) {
    const key = idOf(visit.teacherId);
    if (!checkIns.has(key)) checkIns.set(key, []);
    checkIns.get(key).push(visit);
  }

  const instructors = groupInstructors(classes, checkIns).sort(byFirstClass);
  const students = groupStudents(classes).sort(byFirstClass);

  // Without the students section, class rows keep a head count but no names.
  const withLearners = (rows) =>
    sections.students
      ? rows
      : rows.map((row) => ({
          ...row,
          classes: row.classes.map(({ learners, ...rest }) => ({ ...rest, learnerCount: learners.length })),
        }));

  return {
    day: { key: dayKey, label: dayLabel(dayKey) },
    generatedAt: now.toISOString(),
    partial: report.partial,
    // Every visible class, without names, so the page can count and filter
    // even when the instructors section is hidden.
    classes: classes.map(({ slotId, kind, mode, branchId, branchName, instruments }) => ({
      slotId,
      kind,
      mode,
      branchId,
      branchName,
      instruments,
    })),
    hiddenSections: Object.keys(sections).filter((key) => !sections[key]),
    instructors: sections.instructors ? withLearners(instructors) : [],
    students: sections.students ? students : [],
    staff,
  };
};

module.exports = { buildTodaySchedule };
