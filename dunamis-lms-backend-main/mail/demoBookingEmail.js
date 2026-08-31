const { escapeHtml, brandCard, brandAttachments } = require("./emailLayout");

const DEFAULT_APP_URL =
  process.env.BASE_URL ||
  "https://dunamisindia.co.in";
const DEFAULT_DASHBOARD_URL =
  process.env.DASHBOARD_URL ||
  "https://dashboard.dunamisindia.co.in";
const DEMO_EMAIL_COURSES_URL = "https://dunamisindia.co.in/courses";

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
    return { id: branch, name: branch, location: "", city: "", timings: [] };
  }

  // city may be a populated City document with cityName, or a plain string/ObjectId
  const cityName =
    toText(branch.city?.cityName || (typeof branch.city === "string" ? branch.city : ""), "");

  return {
    id: String(branch._id || branch.id || branch.branchId || "").trim(),
    name: toText(branch.branchName || branch.name || "Branch"),
    location: toText(branch.location || ""),
    city: cityName,
    timings: Array.isArray(branch.branchTimings) ? branch.branchTimings : [],
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

const buildDemoBookingCard = (input) =>
  brandCard({
    ...input,
    footnote:
      "If anything looks incorrect, please contact the Dunamis team before the scheduled demo.",
  });

const studentDemoBookingEmailTemplate = (input = {}) => {
  const ctx = buildDemoBookingContext(input);
  const isOffline = Boolean(ctx.branch?.name);
  const modeLabel = isOffline ? "Offline (In-person)" : "Online";

  const branchLines = isOffline
    ? `
    <p style="margin:0 0 8px;color:#334155;"><strong>Branch:</strong> ${escapeHtml(ctx.branch.name)}${ctx.branch.city ? `, ${escapeHtml(ctx.branch.city)}` : ""}</p>
    ${ctx.branch.location ? `<p style="margin:0 0 8px;color:#334155;"><strong>Address:</strong> ${escapeHtml(ctx.branch.location)}</p>` : ""}
    ${ctx.branch.timings.length === 2 ? `<p style="margin:0 0 8px;color:#334155;"><strong>Branch hours:</strong> ${escapeHtml(ctx.branch.timings[0])} – ${escapeHtml(ctx.branch.timings[1])}</p>` : ""}
    `
    : "";

  const details = `
    <p style="margin:0 0 12px;color:#0f172a;font-weight:700;font-size:16px;">Demo booking confirmed</p>
    <p style="margin:0 0 8px;color:#334155;"><strong>Course:</strong> ${escapeHtml(ctx.course.name)}</p>
    <p style="margin:0 0 8px;color:#334155;"><strong>Instructor:</strong> ${escapeHtml(ctx.instructor?.name || "Instructor")}</p>
    <p style="margin:0 0 8px;color:#334155;"><strong>Date:</strong> ${escapeHtml(ctx.slot.date)}</p>
    <p style="margin:0 0 8px;color:#334155;"><strong>Time:</strong> ${escapeHtml(`${ctx.slot.startTime} – ${ctx.slot.endTime}`)} (20 min)</p>
    <p style="margin:0 0 8px;color:#334155;"><strong>Mode:</strong> ${escapeHtml(modeLabel)}</p>
    ${branchLines}
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

const demoLinkEmailTemplate = (input = {}) => {
  const ctx = buildDemoBookingContext(input);
  const isUpdate = Boolean(input.isUpdate);
  const meetingLink = String(input.meetingLink || "").trim();

  const details = `
    <p style="margin:0 0 12px;color:#0f172a;font-weight:700;font-size:16px;">${isUpdate ? "Updated join link" : "Your join link is ready"}</p>
    <p style="margin:0 0 8px;color:#334155;"><strong>Course:</strong> ${escapeHtml(ctx.course.name)}</p>
    <p style="margin:0 0 8px;color:#334155;"><strong>Instructor:</strong> ${escapeHtml(ctx.instructor?.name || "Instructor")}</p>
    <p style="margin:0 0 8px;color:#334155;"><strong>Date:</strong> ${escapeHtml(ctx.slot.date)}</p>
    <p style="margin:0 0 8px;color:#334155;"><strong>Time:</strong> ${escapeHtml(`${ctx.slot.startTime} \u2013 ${ctx.slot.endTime}`)} (20 min)</p>
    <p style="margin:0;color:#334155;word-break:break-all;"><strong>Link:</strong> ${escapeHtml(meetingLink)}</p>
  `;

  return {
    subject: isUpdate
      ? `Updated join link for your ${ctx.course.name} demo`
      : `Join link for your ${ctx.course.name} demo`,
    html: buildDemoBookingCard({
      title: isUpdate ? "Your demo link has changed" : "Join link for your demo class",
      intro: isUpdate
        ? "Your instructor updated the link for your demo class. Please use the new link below at the scheduled time."
        : "Your instructor has shared the link for your demo class. Use the button below at the scheduled time to join.",
      details,
      ctaText: "Join Demo Class",
      ctaHref: meetingLink,
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

const buildDemoEmailAttachments = brandAttachments;

// `previous` is the pre-move slot/instructor, so the reader can see what
// changed rather than just what it is now.
const demoRescheduledEmailTemplate = (input = {}) => {
  const ctx = buildDemoBookingContext(input);
  const previous = input.previous || {};
  const instructorChanged =
    previous.instructorName && previous.instructorName !== ctx.instructor?.name;

  const details = `
    <p style="margin:0 0 12px;color:#0f172a;font-weight:700;font-size:16px;">New demo details</p>
    <p style="margin:0 0 8px;color:#334155;"><strong>Course:</strong> ${escapeHtml(ctx.course.name)}</p>
    <p style="margin:0 0 8px;color:#334155;"><strong>Instructor:</strong> ${escapeHtml(ctx.instructor?.name || "Instructor")}${instructorChanged ? ` <span style="color:#64748b;">(was ${escapeHtml(previous.instructorName)})</span>` : ""}</p>
    <p style="margin:0 0 8px;color:#334155;"><strong>Date:</strong> ${escapeHtml(ctx.slot.date)}${previous.date && previous.date !== ctx.slot.date ? ` <span style="color:#64748b;">(was ${escapeHtml(previous.date)})</span>` : ""}</p>
    <p style="margin:0 0 8px;color:#334155;"><strong>Time:</strong> ${escapeHtml(`${ctx.slot.startTime} – ${ctx.slot.endTime}`)} (20 min)${previous.startTime && previous.startTime !== ctx.slot.startTime ? ` <span style="color:#64748b;">(was ${escapeHtml(previous.startTime)})</span>` : ""}</p>
    ${input.reason ? `<p style="margin:0;color:#334155;"><strong>Reason:</strong> ${escapeHtml(input.reason)}</p>` : ""}
  `;

  return {
    subject: `Your ${ctx.course.name} demo has moved`,
    html: buildDemoBookingCard({
      title: "Your demo has been rescheduled",
      intro: instructorChanged
        ? "Your demo has moved to a new time with a different instructor. The details below are the ones that now apply."
        : "Your demo has moved to a new time. The details below are the ones that now apply.",
      details,
      ctaText: "View Courses",
      ctaHref: DEMO_EMAIL_COURSES_URL,
    }),
    attachments: buildDemoEmailAttachments(),
    context: ctx,
  };
};

const demoCancelledEmailTemplate = (input = {}) => {
  const ctx = buildDemoBookingContext(input);

  const details = `
    <p style="margin:0 0 12px;color:#0f172a;font-weight:700;font-size:16px;">Cancelled demo</p>
    <p style="margin:0 0 8px;color:#334155;"><strong>Course:</strong> ${escapeHtml(ctx.course.name)}</p>
    <p style="margin:0 0 8px;color:#334155;"><strong>Instructor:</strong> ${escapeHtml(ctx.instructor?.name || "Instructor")}</p>
    <p style="margin:0 0 8px;color:#334155;"><strong>Date:</strong> ${escapeHtml(ctx.slot.date)}</p>
    <p style="margin:0 0 8px;color:#334155;"><strong>Time:</strong> ${escapeHtml(`${ctx.slot.startTime} – ${ctx.slot.endTime}`)}</p>
    ${input.reason ? `<p style="margin:0;color:#334155;"><strong>Reason:</strong> ${escapeHtml(input.reason)}</p>` : ""}
  `;

  return {
    subject: `Your ${ctx.course.name} demo has been cancelled`,
    html: buildDemoBookingCard({
      title: "Your demo has been cancelled",
      intro:
        "This demo slot has been released. You can book another time whenever you are ready — the course page lists every open slot.",
      details,
      ctaText: "Book Another Demo",
      ctaHref: DEMO_EMAIL_COURSES_URL,
    }),
    attachments: buildDemoEmailAttachments(),
    context: ctx,
  };
};

module.exports = {
  adminDemoBookingEmailTemplate,
  buildDemoBookingContext,
  demoLinkEmailTemplate,
  demoRescheduledEmailTemplate,
  demoCancelledEmailTemplate,
  instructorDemoBookingEmailTemplate,
  studentDemoBookingEmailTemplate,
};
