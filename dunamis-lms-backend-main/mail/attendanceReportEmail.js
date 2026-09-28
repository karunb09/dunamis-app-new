const path = require("path");

const DEFAULT_DASHBOARD_URL =
  process.env.DASHBOARD_URL || "https://dashboard.dunamisindia.co.in";
const LOGO_PATH = path.resolve(__dirname, "../Dunamis.png");
const LOGO_CID = "dunamis-logo";

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatTime = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (/\b(AM|PM)\b/i.test(raw)) return raw.toUpperCase();
  const clean = raw.replace(/\D/g, "");
  if (clean.length < 3) return raw;
  const hours = Number(clean.slice(0, clean.length - 2));
  const minutes = Number(clean.slice(-2));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return raw;
  const hour12 = ((hours + 11) % 12) + 1;
  const ampm = hours < 12 ? "AM" : "PM";
  return `${hour12}:${String(minutes).padStart(2, "0")} ${ampm}`;
};

const baseStyles = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  color: #1a1a1a;
  background: #f4f4f5;
  margin: 0;
  padding: 0;
`;

const cardStyle = `
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #e4e4e7;
  padding: 20px;
  margin-bottom: 16px;
`;

const statTile = (label, value, color, bg, border) => `
  <div style="background:${bg};border:1px solid ${border};border-radius:8px;padding:14px 20px;flex:1;min-width:120px;">
    <div style="font-size:24px;font-weight:700;color:${color};">${value}</div>
    <div style="font-size:12px;color:${color};margin-top:2px;opacity:0.85;">${escapeHtml(label)}</div>
  </div>`;

const simpleTable = (headers, rows) => `
  <table style="width:100%;border-collapse:collapse;font-size:13px;">
    <thead>
      <tr style="background:#f9fafb;color:#6b7280;">
        ${headers.map((h) => `<th style="padding:8px 12px;text-align:left;font-weight:500;">${escapeHtml(h)}</th>`).join("")}
      </tr>
    </thead>
    <tbody>
      ${rows
        .map(
          (cells) => `
        <tr style="border-bottom:1px solid #f0f0f0;">
          ${cells.map((c) => `<td style="padding:8px 12px;">${c}</td>`).join("")}
        </tr>`
        )
        .join("")}
    </tbody>
  </table>`;

const card = (title, body) => `
  <div style="${cardStyle}">
    <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:#111827;">${escapeHtml(title)}</p>
    ${body}
  </div>`;

const classTimeRange = (row) =>
  [formatTime(row.startTime), formatTime(row.endTime)].filter(Boolean).join(" – ");

/**
 * buildAttendanceDigestEmail
 * Used by services/attendanceDigest.js for the daily admin summary email.
 *
 * Leads with the classes nobody marked. The previous version was built from
 * submitted records only, so an unmarked class could not appear in it at all.
 *
 * @param {object} opts
 * @param {object} opts.report - the object returned by buildDailyAttendanceReport()
 */
function buildAttendanceDigestEmail({ report }) {
  const { day, totals } = report;
  const unmarked = report.classes.filter((row) => row.coverageStatus === "Missing");
  const partial = report.classes.filter((row) => row.coverageStatus === "Partial");
  const absentees = report.classes.flatMap((row) =>
    row.students
      .filter((student) => student.attendanceStatus === "Absent")
      .map((student) => [
        escapeHtml(student.name),
        escapeHtml(row.courseName),
        escapeHtml(row.teacherName),
        escapeHtml(classTimeRange(row)),
      ])
  );

  const subject = totals.unmarked
    ? `Daily Attendance — ${day.label} — ${totals.unmarked} ${
        totals.unmarked === 1 ? "class" : "classes"
      } unmarked`
    : `Daily Attendance — ${day.label} — all ${totals.classesScheduled} ${
        totals.classesScheduled === 1 ? "class" : "classes"
      } marked`;

  const tiles = [
    statTile("Scheduled", totals.classesScheduled, "#334155", "#f8fafc", "#e2e8f0"),
    statTile("Fully marked", totals.fullyMarked, "#16a34a", "#f0fdf4", "#bbf7d0"),
    statTile("Partial", totals.partiallyMarked, "#b45309", "#fffbeb", "#fde68a"),
    statTile("Not marked", totals.unmarked, "#dc2626", "#fef2f2", "#fecaca"),
  ].join("");

  const classRow = (row) => [
    escapeHtml(row.teacherName),
    escapeHtml(row.courseName) +
      (row.branchName ? ` <span style="color:#9ca3af;">· ${escapeHtml(row.branchName)}</span>` : ""),
    escapeHtml(classTimeRange(row)),
    row.coverageStatus === "Partial"
      ? `${row.markedStudents}/${row.expectedStudents}`
      : String(row.expectedStudents),
  ];

  const unmarkedCard = unmarked.length
    ? card(
        `Classes not marked (${unmarked.length})`,
        simpleTable(["Instructor", "Course", "Time", "Students"], unmarked.map(classRow))
      )
    : `<div style="${cardStyle}">
         <p style="margin:0;font-size:15px;font-weight:600;color:#16a34a;">Every class was marked.</p>
       </div>`;

  const partialCard = partial.length
    ? card(
        `Partially marked (${partial.length})`,
        simpleTable(["Instructor", "Course", "Time", "Marked"], partial.map(classRow))
      )
    : "";

  const attendanceCard = card(
    "Attendance",
    simpleTable(
      ["Present", "Absent", "Marked", "Expected", "Attendance rate"],
      [
        [
          totals.present,
          totals.absent,
          totals.studentsMarked,
          totals.studentsExpected,
          totals.attendanceRate == null ? "—" : `${totals.attendanceRate}%`,
        ],
      ]
    ) +
      (absentees.length
        ? `<p style="margin:16px 0 8px;font-size:13px;font-weight:600;color:#374151;">Absent students (${absentees.length})</p>` +
          simpleTable(["Student", "Course", "Instructor", "Time"], absentees)
        : "")
  );

  const instructorCard = card(
    "By instructor",
    simpleTable(
      ["Instructor", "Scheduled", "Marked", "Not marked", "Present", "Absent"],
      report.byInstructor.map((row) => [
        escapeHtml(row.teacherName),
        row.scheduled,
        row.fullyMarked,
        row.unmarked
          ? `<span style="color:#dc2626;font-weight:600;">${row.unmarked}</span>`
          : "0",
        row.present,
        row.absent,
      ])
    )
  );

  const partialStrip = report.partial
    ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;margin-bottom:16px;color:#92400e;font-size:13px;">
         Some sections could not be computed: ${escapeHtml(report.failedSections.join(", "))}.
       </div>`
    : "";

  return {
    subject,
    html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="${baseStyles}">
  <div style="max-width:680px;margin:32px auto;padding:0 16px;">
    <div style="text-align:center;margin-bottom:24px;">
      <img src="cid:${LOGO_CID}" alt="Dunamis India" style="height:40px;" />
    </div>

    <div style="background:#fff;border-radius:10px;border:1px solid #e4e4e7;padding:28px;margin-bottom:24px;">
      <h1 style="margin:0 0 6px;font-size:20px;font-weight:700;color:#111827;">Daily Attendance Report</h1>
      <p style="margin:0;color:#6b7280;font-size:14px;">${escapeHtml(day.label)}</p>
      <div style="display:flex;gap:16px;margin-top:20px;flex-wrap:wrap;">${tiles}</div>
    </div>

    ${partialStrip}
    ${unmarkedCard}
    ${partialCard}
    ${attendanceCard}
    ${instructorCard}

    <div style="text-align:center;margin-top:24px;">
      <a href="${DEFAULT_DASHBOARD_URL}/admin/reports/attendance?date=${encodeURIComponent(day.key)}"
         style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:10px 24px;border-radius:6px;font-size:14px;font-weight:500;">
        Open the attendance report
      </a>
    </div>

    <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:28px;">
      This is an automated daily digest from Dunamis India LMS.
    </p>
  </div>
</body>
</html>`,
    attachments: [
      {
        filename: "Dunamis.png",
        path: LOGO_PATH,
        cid: LOGO_CID,
      },
    ],
  };
}

module.exports = { buildAttendanceDigestEmail };
