const fs = require("fs");
const path = require("path");

const DEFAULT_APP_URL =
  process.env.BASE_URL ||
  "https://dunamisindia.co.in";
const DEFAULT_DASHBOARD_URL =
  process.env.DASHBOARD_URL ||
  "https://dashboard.dunamisindia.co.in";
const DEMO_EMAIL_COURSES_URL = "https://dunamisindia.co.in/courses";
const DEMO_EMAIL_LOGO_PATH = path.resolve(__dirname, "../Dunamis.png");
const DEMO_EMAIL_LOGO_CID = "dunamis-logo";

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const toText = (value, fallback = "N/A") => {
  const text = String(value ?? "").trim();
  return text ? text : fallback;
};

const normalizeEmail = (value) => String(value ?? "").trim().toLowerCase();

const normalizeName = (name) => {
  if (!name) return "";
  if (typeof name === "string") return name.trim();

  const firstName = name.firstName || name.first_name || "";
  const lastName = name.lastName || name.last_name || "";
  return `${firstName} ${lastName}`.trim();
};

const formatDate = (value) => {
  if (!value) return "Date TBD";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Date TBD";

  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
};

const formatTime = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "Time TBD";

  if (/\b(AM|PM)\b/i.test(raw)) {
    return raw.toUpperCase();
  }

  const clean = raw.replace(/\D/g, "");
  if (clean.length < 3) return raw;

  const hours = Number(clean.slice(0, clean.length - 2));
  const minutes = Number(clean.slice(-2));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return raw;

  const hour12 = ((hours + 11) % 12) + 1;
  const ampm = hours < 12 ? "AM" : "PM";
  return `${hour12}:${String(minutes).padStart(2, "0")} ${ampm}`;
};

const normalizeBranch = (branch) => {
  if (!branch) return null;

  if (typeof branch === "string") {
    return {
      id: branch,
      name: branch,
      city: "",
    };
  }

  return {
    id: String(branch._id || branch.id || branch.branchId || "").trim(),
    name: toText(branch.branchName || branch.name || branch.location || "Branch"),
    city: toText(branch.city || ""),
  };
};

const normalizeInstructor = (instructor) => {
  if (!instructor) return null;

  const teacherUser = instructor.user || instructor.userId || {};
  const teacherDetail = instructor.teacherDetail || {};
  const name =
    normalizeName(teacherDetail.name) ||
    normalizeName(teacherUser.name) ||
    normalizeName(instructor.name) ||
    "Instructor";

  return {
    id: String(instructor._id || instructor.id || teacherUser._id || "").trim(),
    name,
    email: normalizeEmail(
      teacherUser.email || instructor.email || teacherDetail.email
    ),
    phone: toText(teacherUser.mobileNo || instructor.phone || teacherDetail.mobileNo, ""),
    profileVideo: toText(
      teacherDetail.profileVideo || instructor.profileVideo || "",
      ""
    ),
  };
};

const normalizeCourse = (course) => {
  if (!course) return {};

  return {
    id: String(course._id || course.id || "").trim(),
    name: toText(course.name || course.title || "Course"),
    code: toText(course.code || ""),
    mode: toText(course.mode || "online"),
    category: toText(course.category?.name || course.category || ""),
  };
};

const normalizeSlot = (slot) => {
  if (!slot) return {};

  const branch = normalizeBranch(slot.branchId || slot.branch || null);
  return {
    id: String(slot._id || slot.id || slot.slotId || "").trim(),
    date: formatDate(slot.date),
    startTime: formatTime(slot.startTime),
    endTime: formatTime(slot.endTime),
    sessionType: toText(slot.sessionType || "standard"),
    slotType: toText(slot.slotType || "demo"),
    branch,
  };
};

const buildDemoBookingContext = (input = {}) => {
  const student = input.student || input.lead || {};
  const course = normalizeCourse(input.course);
  const instructor = normalizeInstructor(input.instructor);
  const slot = normalizeSlot(input.slot);
  const branch = normalizeBranch(input.branch || input.branchId || slot.branch);

  const studentName = normalizeName(student.name || {
    firstName: student.firstName,
    lastName: student.lastName,
  });

  return {
    appUrl: input.appUrl || DEFAULT_APP_URL,
    dashboardUrl: input.dashboardUrl || DEFAULT_DASHBOARD_URL,
    student: {
      name: studentName || "Student",
      email: normalizeEmail(student.email),
      phone: toText(student.phone || student.mobile || student.mobileNo, ""),
    },
    course,
    instructor,
    slot,
    branch,
  };
};

const buildDemoBookingCard = ({ title, intro, details, ctaText, ctaHref }) => `
  <div style="max-width:640px;margin:0 auto;padding:24px;background:#f5f7fb;font-family:Arial,sans-serif;">
    <div style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,0.08);">
      <div style="padding:24px 28px;background:linear-gradient(135deg,#111827,#1f2937);color:#fff;">
        <img src="cid:${DEMO_EMAIL_LOGO_CID}" alt="Dunamis logo" style="height:40px;width:auto;display:block;margin:0 0 12px;" />
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#fdba74;">Dunamis LMS</p>
        <h1 style="margin:0;font-size:24px;line-height:1.2;">${escapeHtml(title)}</h1>
      </div>
      <div style="padding:28px;">
        <p style="margin:0 0 18px;color:#334155;font-size:15px;line-height:1.7;">${escapeHtml(intro)}</p>
        <div style="border:1px solid #e2e8f0;border-radius:14px;padding:18px 20px;background:#f8fafc;">
          ${details}
        </div>
        <div style="margin-top:24px;">
          <a href="${escapeHtml(ctaHref)}" style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:700;">${escapeHtml(ctaText)}</a>
        </div>
        <p style="margin:24px 0 0;color:#64748b;font-size:12px;line-height:1.6;">If anything looks incorrect, please contact the Dunamis team before the scheduled demo.</p>
      </div>
    </div>
  </div>
`;

const studentDemoBookingEmailTemplate = (input = {}) => {
  const ctx = buildDemoBookingContext(input);
  const modeLabel = ctx.slot.branch ? "Offline" : "Online";
  const details = `
    <p style="margin:0 0 12px;color:#0f172a;font-weight:700;font-size:16px;">Demo booking confirmed</p>
    <p style="margin:0 0 8px;color:#334155;"><strong>Course:</strong> ${escapeHtml(ctx.course.name)}</p>
    <p style="margin:0 0 8px;color:#334155;"><strong>Instructor:</strong> ${escapeHtml(ctx.instructor?.name || "Instructor")}</p>
    <p style="margin:0 0 8px;color:#334155;"><strong>Date:</strong> ${escapeHtml(ctx.slot.date)}</p>
    <p style="margin:0 0 8px;color:#334155;"><strong>Time:</strong> ${escapeHtml(`${ctx.slot.startTime} - ${ctx.slot.endTime}`)}</p>
    <p style="margin:0 0 8px;color:#334155;"><strong>Mode:</strong> ${escapeHtml(modeLabel)}</p>
    ${ctx.branch?.name ? `<p style="margin:0 0 8px;color:#334155;"><strong>Branch:</strong> ${escapeHtml(ctx.branch.name)}${ctx.branch.city ? `, ${escapeHtml(ctx.branch.city)}` : ""}</p>` : ""}
    <p style="margin:0;color:#334155;"><strong>Student:</strong> ${escapeHtml(ctx.student.name)}</p>
  `;

  return {
    subject: `Demo booking confirmed for ${ctx.course.name}`,
    html: buildDemoBookingCard({
      title: "Your demo booking is confirmed",
      intro:
        "Your demo request has been recorded. Here are the details the student should keep for the session.",
      details,
      ctaText: "View Courses",
      ctaHref: DEMO_EMAIL_COURSES_URL,
    }),
    attachments: buildDemoEmailAttachments(),
    context: ctx,
  };
};

const instructorDemoBookingEmailTemplate = (input = {}) => {
  const ctx = buildDemoBookingContext(input);
  const details = `
    <p style="margin:0 0 12px;color:#0f172a;font-weight:700;font-size:16px;">New demo session assigned</p>
    <p style="margin:0 0 8px;color:#334155;"><strong>Course:</strong> ${escapeHtml(ctx.course.name)}</p>
    <p style="margin:0 0 8px;color:#334155;"><strong>Student:</strong> ${escapeHtml(ctx.student.name)}</p>
    <p style="margin:0 0 8px;color:#334155;"><strong>Student Email:</strong> ${escapeHtml(ctx.student.email || "N/A")}</p>
    <p style="margin:0 0 8px;color:#334155;"><strong>Student Phone:</strong> ${escapeHtml(ctx.student.phone || "N/A")}</p>
    <p style="margin:0 0 8px;color:#334155;"><strong>Date:</strong> ${escapeHtml(ctx.slot.date)}</p>
    <p style="margin:0 0 8px;color:#334155;"><strong>Time:</strong> ${escapeHtml(`${ctx.slot.startTime} - ${ctx.slot.endTime}`)}</p>
    <p style="margin:0 0 8px;color:#334155;"><strong>Mode:</strong> ${escapeHtml(ctx.slot.branch ? "Offline" : "Online")}</p>
    ${ctx.branch?.name ? `<p style="margin:0;color:#334155;"><strong>Branch:</strong> ${escapeHtml(ctx.branch.name)}${ctx.branch.city ? `, ${escapeHtml(ctx.branch.city)}` : ""}</p>` : ""}
  `;

  return {
    subject: `New demo booking: ${ctx.course.name}`,
    html: buildDemoBookingCard({
      title: "You have a new demo booking",
      intro:
        "A student has booked a demo with you. Please review the details below and prepare for the session.",
      details,
      ctaText: "Open Dashboard",
      ctaHref: `${ctx.dashboardUrl}/teacher`,
    }),
    attachments: buildDemoEmailAttachments(),
    context: ctx,
  };
};

const adminDemoBookingEmailTemplate = (input = {}) => {
  const ctx = buildDemoBookingContext(input);
  const details = `
    <p style="margin:0 0 12px;color:#0f172a;font-weight:700;font-size:16px;">New demo request</p>
    <p style="margin:0 0 8px;color:#334155;"><strong>Course:</strong> ${escapeHtml(ctx.course.name)}</p>
    <p style="margin:0 0 8px;color:#334155;"><strong>Instructor:</strong> ${escapeHtml(ctx.instructor?.name || "Instructor")}</p>
    <p style="margin:0 0 8px;color:#334155;"><strong>Student:</strong> ${escapeHtml(ctx.student.name)}</p>
    <p style="margin:0 0 8px;color:#334155;"><strong>Student Email:</strong> ${escapeHtml(ctx.student.email || "N/A")}</p>
    <p style="margin:0 0 8px;color:#334155;"><strong>Student Phone:</strong> ${escapeHtml(ctx.student.phone || "N/A")}</p>
    <p style="margin:0 0 8px;color:#334155;"><strong>Date:</strong> ${escapeHtml(ctx.slot.date)}</p>
    <p style="margin:0 0 8px;color:#334155;"><strong>Time:</strong> ${escapeHtml(`${ctx.slot.startTime} - ${ctx.slot.endTime}`)}</p>
    <p style="margin:0 0 8px;color:#334155;"><strong>Mode:</strong> ${escapeHtml(ctx.slot.branch ? "Offline" : "Online")}</p>
    ${ctx.branch?.name ? `<p style="margin:0;color:#334155;"><strong>Branch:</strong> ${escapeHtml(ctx.branch.name)}${ctx.branch.city ? `, ${escapeHtml(ctx.branch.city)}` : ""}</p>` : ""}
  `;

  return {
    subject: `New demo request: ${ctx.course.name}`,
    html: buildDemoBookingCard({
      title: "New demo request received",
      intro:
        "A student has booked a demo. Please review the booking and follow up if required.",
      details,
      ctaText: "Open Dashboard",
      ctaHref: `${ctx.dashboardUrl}/admin`,
    }),
    attachments: buildDemoEmailAttachments(),
    context: ctx,
  };
};

const buildDemoEmailAttachments = () => {
  if (!fs.existsSync(DEMO_EMAIL_LOGO_PATH)) {
    return [];
  }

  return [
    {
      filename: "Dunamis.png",
      path: DEMO_EMAIL_LOGO_PATH,
      cid: DEMO_EMAIL_LOGO_CID,
    },
  ];
};

module.exports = {
  adminDemoBookingEmailTemplate,
  buildDemoBookingContext,
  instructorDemoBookingEmailTemplate,
  studentDemoBookingEmailTemplate,
};
