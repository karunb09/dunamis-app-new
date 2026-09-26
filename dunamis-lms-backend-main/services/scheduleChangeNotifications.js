const Course = require("../model/course.model");
const Student = require("../model/student.model");
const Teacher = require("../model/teacher.model");
const {
  getAdminUsers,
  createDashboardNotice,
  sendEmails,
} = require("../utils/notificationService");
const { brandCard, brandAttachments } = require("../mail/emailLayout");
const { getDayPairLabel } = require("../utils/availabilityRules");

const DASHBOARD_URL = process.env.OPS_DASHBOARD_URL || "https://dashboard.dunamisindia.co.in";

const describeSchedule = (snapshot) => {
  if (!snapshot) return "class removed";
  const dayLabel = getDayPairLabel(snapshot.days) || (snapshot.days || []).join(" & ");
  return `${dayLabel} ${snapshot.startTime}-${snapshot.endTime}`;
};

const teacherName = (teacher) => {
  const name = teacher?.userId?.name;
  if (!name) return "Instructor";
  return [name.firstName, name.lastName].filter(Boolean).join(" ") || "Instructor";
};

const loadContext = async ({ teacher, courseId }) => {
  const populated = teacher?.userId?.email
    ? teacher
    : await Teacher.findById(teacher._id).populate("userId", "name email").lean();
  const course = await Course.findById(courseId).select("name").lean();
  return { teacher: populated, courseName: course?.name || "the course" };
};

// Best-effort: a notification failure must never undo a saved decision.
const settle = async (tasks) => {
  const results = await Promise.allSettled(tasks);
  for (const result of results) {
    if (result.status === "rejected") {
      console.error("schedule-change notification failed:", result.reason?.message || result.reason);
    }
  }
};

const notifyScheduleChangeRequested = async ({ teacher, requests }) => {
  const admins = await getAdminUsers();
  if (!admins.length || !requests.length) return;

  const { teacher: populated, courseName } = await loadContext({
    teacher,
    courseId: requests[0].courseId,
  });

  const lines = requests.map((request) =>
    request.changeType === "remove"
      ? `remove ${describeSchedule(request.current)} (${request.affectedStudentIds.length} learner(s))`
      : `${describeSchedule(request.current)} to ${describeSchedule(request.requested)} (${request.affectedStudentIds.length} learner(s))`
  );

  const title = "Schedule change awaiting approval";
  const message = `${teacherName(populated)} requested: ${lines.join("; ")}. Review it under Instructor Management.`;

  await settle([
    createDashboardNotice({
      title,
      message,
      userIds: admins.map((admin) => admin._id),
      contentType: "Transactional",
    }),
    sendEmails({
      recipients: admins.map((admin) => admin.email).filter(Boolean),
      subject: "Dunamis India — schedule change awaiting approval",
      html: brandCard({
        title,
        intro: `${teacherName(populated)} has requested a schedule change for ${courseName}. The class keeps its current timing until you approve it.`,
        details: lines.map((line) => `<p style="margin:0 0 8px;">${line}</p>`).join(""),
        ctaText: "Review request",
        ctaHref: `${DASHBOARD_URL}/admin/instructor-management`,
        footnote: "Enrolled learners are unaffected until the change is approved.",
      }),
      attachments: brandAttachments(),
    }),
  ]);
};

const notifyScheduleChangeReviewed = async ({ teacher, request, status, adminNote }) => {
  const { teacher: populated, courseName } = await loadContext({
    teacher,
    courseId: request.courseId,
  });

  const approved = status === "approved";
  const newSchedule = describeSchedule(request.requested);
  const oldSchedule = describeSchedule(request.current);

  const instructorTitle = approved
    ? "Schedule change approved"
    : "Schedule change rejected";
  const instructorMessage = approved
    ? request.changeType === "remove"
      ? `${courseName} ${oldSchedule} has been removed.`
      : `${courseName} moves from ${oldSchedule} to ${newSchedule}.`
    : `Your request to change ${courseName} ${oldSchedule} was not approved.${adminNote ? ` Note: ${adminNote}` : ""}`;

  const tasks = [];

  if (populated?.userId?._id) {
    tasks.push(
      createDashboardNotice({
        title: instructorTitle,
        message: instructorMessage,
        userIds: [populated.userId._id],
        contentType: "Transactional",
      })
    );
  }

  if (populated?.userId?.email) {
    tasks.push(
      sendEmails({
        recipients: [populated.userId.email],
        subject: `Dunamis India — ${instructorTitle.toLowerCase()}`,
        html: brandCard({
          title: instructorTitle,
          intro: instructorMessage,
          details: adminNote
            ? `<p style="margin:0;"><strong>Admin note:</strong> ${adminNote}</p>`
            : "",
          ctaText: "Open my schedule",
          ctaHref: `${DASHBOARD_URL}/teacher/my-schedule`,
          footnote: "Dunamis India instructor schedule update.",
        }),
        attachments: brandAttachments(),
      })
    );
  }

  if (approved && request.affectedStudentIds.length) {
    const students = await Student.find({ _id: { $in: request.affectedStudentIds } })
      .populate("userId", "name email")
      .lean();
    const learnerEmails = students.map((s) => s.userId?.email).filter(Boolean);
    const learnerUserIds = students.map((s) => s.userId?._id).filter(Boolean);

    const learnerTitle =
      request.changeType === "remove" ? "Your class has changed" : "Your class timing has changed";
    const learnerMessage =
      request.changeType === "remove"
        ? `${courseName} at ${oldSchedule} has been discontinued. Our team will contact you about the next step.`
        : `${courseName} now runs ${newSchedule} (was ${oldSchedule}).`;

    if (learnerUserIds.length) {
      tasks.push(
        createDashboardNotice({
          title: learnerTitle,
          message: learnerMessage,
          userIds: learnerUserIds,
          contentType: "Transactional",
        })
      );
    }

    if (learnerEmails.length) {
      tasks.push(
        sendEmails({
          recipients: learnerEmails,
          subject: `Dunamis India — ${learnerTitle.toLowerCase()}`,
          html: brandCard({
            title: learnerTitle,
            intro: learnerMessage,
            details: `<p style="margin:0;">Instructor: ${teacherName(populated)}</p>`,
            ctaText: "View my schedule",
            ctaHref: "https://dunamisindia.co.in/student/schedule",
            footnote: "Please reach out if this timing does not work for you.",
          }),
          attachments: brandAttachments(),
        })
      );
    }
  }

  await settle(tasks);
};

module.exports = { notifyScheduleChangeRequested, notifyScheduleChangeReviewed };
