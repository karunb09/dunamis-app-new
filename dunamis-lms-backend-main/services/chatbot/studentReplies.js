const Student = require("../../model/student.model");
const Certificate = require("../../model/certificate.model");
const Course = require("../../model/course.model");
const Teacher = require("../../model/teacher.model");
const { buildStudentDashboard } = require("../studentDashboard");
const { buildFeesSummary } = require("../studentFees");
const { getStudentSchedules } = require("../../utils/classRoster");
const { formatUserName } = require("../../utils/formatName");
const { currentDayKey, dayKeyFromDate } = require("../../utils/istMonth");
const { respond, chip, formatTime, rupees, listText } = require("./replies");

const DAY_SHORT = { monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun" };

const dateLabel = (value) =>
  new Date(value).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });

const link = (label, href) => ({ type: "link", label, href });

const DASHBOARD_INTENTS = new Set(["me.nextClass", "me.attendance", "me.homework", "me.assignments", "me.assessment"]);

const dashboardReplies = {
  "me.nextClass": ({ nextClass }) => {
    if (!nextClass) {
      return {
        text: "You don't have an upcoming class scheduled. If that looks wrong, message your instructor or our team.",
        actions: [link("My courses", "/student/my-courses")],
      };
    }
    const isToday = dayKeyFromDate(new Date(nextClass.date)) === currentDayKey();
    return {
      text: `Your next class: ${nextClass.courseName} with ${nextClass.instructorName}, ${
        isToday ? "today" : dateLabel(nextClass.date)
      }, ${formatTime(nextClass.startTime)} – ${formatTime(nextClass.endTime)}.`,
      actions: [
        ...(isToday && nextClass.meetingLink ? [link("Join class", nextClass.meetingLink)] : []),
        link("Open my dashboard", "/student"),
      ],
    };
  },

  "me.attendance": ({ performance }) => {
    const { attendance } = performance;
    if (!attendance.total) {
      return { text: "No attendance has been marked for you yet." };
    }
    return {
      text: [
        `Your attendance: ${attendance.rate}% (${attendance.present} of ${attendance.total} classes).`,
        ...attendance.byCourse.map((row) => `• ${row.courseName}: ${row.rate}% (${row.present}/${row.total})`),
      ].join("\n"),
      actions: [link("Attendance & homework", "/student/attendance-homework")],
    };
  },

  "me.homework": ({ latestHomework }) =>
    latestHomework
      ? {
          text: `Latest homework — ${latestHomework.courseName}, ${dateLabel(latestHomework.date)}:\n${latestHomework.homework}`,
          actions: [link("All homework", "/student/attendance-homework")],
        }
      : { text: "No homework has been set for you yet." },

  "me.assignments": ({ openAssignment }) =>
    openAssignment
      ? {
          text: `Open assignment: “${openAssignment.title}”${
            openAssignment.courseName ? ` for ${openAssignment.courseName}` : ""
          }${openAssignment.dueDate ? `, due ${dateLabel(openAssignment.dueDate)}` : ""}.`,
          actions: [link("Submit assignment", "/student/assignments")],
        }
      : { text: "No open assignments — you're all caught up.", actions: [link("My assignments", "/student/assignments")] },

  "me.assessment": ({ openAssessment, performance }) => {
    if (openAssessment) {
      const which = openAssessment.courseName ? `${openAssessment.courseName} assessment` : "assessment";
      return {
        text: `Your ${which} is waiting for your answers${
          openAssessment.dueDate ? ` — due ${dateLabel(openAssessment.dueDate)}` : ""
        }.`,
        actions: [link("Open assessment", "/student/assessments")],
      };
    }
    const latest = performance.assessments[performance.assessments.length - 1];
    if (latest) {
      return {
        text: `Your last assessment (${latest.courseName}, ${dateLabel(latest.assessedOn)}) scored ${latest.totalScore}.`,
        actions: [link("My assessments", "/student/assessments")],
      };
    }
    return { text: "No assessments yet — your first one comes about six months after you join a course." };
  },
};

async function feesReply(student) {
  const summary = await buildFeesSummary(student);
  if (!summary.dues.length) {
    return { text: "You're all paid up — nothing is due right now.", actions: [link("Payment history", "/student/fees")] };
  }
  const next = summary.dues[0];
  const instalment = next.installmentTotal
    ? ` (instalment ${next.installmentNo} of ${next.installmentTotal})`
    : "";
  const lines = [
    `You have ${rupees(summary.totals.outstanding)} due across ${summary.dues.length} payment${
      summary.dues.length === 1 ? "" : "s"
    }.`,
    `Next: ${rupees(next.amount)} for ${next.courseName}${instalment}, due ${dateLabel(next.dueDate)}.`,
  ];
  if (summary.totals.overdueCount) {
    lines.push(`${rupees(summary.totals.overdueAmount)} is overdue.`);
  }
  if (summary.accessRestricted) lines.push(summary.message);
  return { text: lines.join("\n"), actions: [link("Pay now", "/student/fees")] };
}

async function certificatesReply(studentId) {
  const certificates = await Certificate.find({ studentId })
    .select("courseName level issuedAt")
    .sort({ issuedAt: -1 })
    .lean();
  if (!certificates.length) {
    return { text: "No certificates yet — you earn one each time you pass a level." };
  }
  return {
    text: [
      `You have ${certificates.length} certificate${certificates.length === 1 ? "" : "s"}:`,
      ...certificates.slice(0, 3).map((cert) => `• ${cert.courseName} — ${cert.level}, ${dateLabel(cert.issuedAt)}`),
    ].join("\n"),
    actions: [link("Download certificates", "/student/profile")],
  };
}

function coursesReply(student) {
  const enrollments = (student.enrolledCourses || []).filter((enrollment) => enrollment.active !== false);
  if (!enrollments.length) {
    return {
      text: "You're not enrolled in a course yet.",
      quickReplies: [chip("Explore courses", "courses.list"), chip("Book a free demo", "demo.book")],
    };
  }
  const statusText = (enrollment) => {
    if (enrollment.status === "paused") {
      return enrollment.pausedUntil ? `paused until ${dateLabel(enrollment.pausedUntil)}` : "paused";
    }
    return enrollment.status === "completed" ? "completed" : "in progress";
  };
  return {
    text: [
      "You're enrolled in:",
      ...enrollments.map((enrollment) => `• ${enrollment.courseId?.name || "Course"} — ${statusText(enrollment)}`),
    ].join("\n"),
    actions: [link("My courses", "/student/my-courses")],
  };
}

async function instructorReply(studentId) {
  const schedules = await getStudentSchedules(studentId);
  if (!schedules.length) {
    return { text: "You'll see your instructor here once you're placed in a class." };
  }
  const [teachers, courses] = await Promise.all([
    Teacher.find({ _id: { $in: schedules.map((row) => row.teacherId) } })
      .select("userId")
      .populate("userId", "name")
      .lean(),
    Course.find({ _id: { $in: schedules.map((row) => row.courseId) } }).select("name").lean(),
  ]);
  const teacherName = new Map(teachers.map((teacher) => [String(teacher._id), formatUserName(teacher.userId?.name, "Your instructor")]));
  const courseName = new Map(courses.map((course) => [String(course._id), course.name]));

  return {
    text: [
      schedules.length === 1 ? "Your instructor:" : "Your instructors:",
      ...schedules.map((row) => {
        const days = listText(row.recurringDays.map((day) => DAY_SHORT[String(day).toLowerCase()] || day));
        const when = [days, row.startTime ? formatTime(row.startTime) : ""].filter(Boolean).join(", ");
        return `• ${courseName.get(String(row.courseId)) || "Course"}: ${
          teacherName.get(String(row.teacherId)) || "Your instructor"
        }${when ? ` (${when})` : ""}`;
      }),
    ].join("\n"),
    actions: [link("Message your instructor", "/student/messages")],
  };
}

// Answers a personal question from the logged-in student's own records only.
async function buildStudentReply(intent, scope, viewer) {
  let fields;
  if (DASHBOARD_INTENTS.has(intent)) {
    const student = await Student.findOne({ userId: viewer.userId }).select("_id").lean();
    fields = student ? dashboardReplies[intent](await buildStudentDashboard(student._id)) : null;
  } else if (intent === "me.fees") {
    const student = await Student.findOne({ userId: viewer.userId })
      .populate("payments.courseId", "name code")
      .populate("enrolledCourses.courseId", "name code mode");
    fields = student ? await feesReply(student) : null;
  } else if (intent === "me.courses") {
    const student = await Student.findOne({ userId: viewer.userId })
      .select("enrolledCourses")
      .populate("enrolledCourses.courseId", "name")
      .lean();
    fields = student ? coursesReply(student) : null;
  } else {
    const student = await Student.findOne({ userId: viewer.userId }).select("_id").lean();
    if (student) {
      fields = intent === "me.certificates" ? await certificatesReply(student._id) : await instructorReply(student._id);
    }
  }

  if (!fields) {
    return respond(intent, scope, {
      text: "I couldn't find your student record. Please contact our team and we'll sort it out.",
      actions: [link("Contact us", "/contact-us")],
    });
  }
  return { ...respond(intent, scope, fields), personal: true };
}

module.exports = { buildStudentReply };
