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

const formatDate = (value) => {
  if (!value) return "Date N/A";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Date N/A";
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

/**
 * buildAttendanceDigestEmail
 * Used by attendanceDigest.cron.js for the daily admin summary email.
 *
 * @param {object} opts
 * @param {Date}   opts.date     - The date this digest covers
 * @param {Array}  opts.sections - Each section: { teacherName, records[] }
 *   record: { courseName, studentName, attendanceStatus, homework, sessionType }
 */
function buildAttendanceDigestEmail({ date, sections }) {
  const totalRecords = sections.reduce((sum, s) => sum + s.records.length, 0);
  const totalPresent = sections.reduce(
    (sum, s) => sum + s.records.filter((r) => r.attendanceStatus === "Present").length,
    0
  );

  const sectionHtml = sections
    .map((section) => {
      const rows = section.records
        .map((r) => {
          const present = r.attendanceStatus === "Present";
          return `
          <tr style="border-bottom:1px solid #f0f0f0;">
            <td style="padding:8px 12px;">${escapeHtml(r.studentName)}</td>
            <td style="padding:8px 12px;">${escapeHtml(r.courseName)}</td>
            <td style="padding:8px 12px;">
              <span style="display:inline-flex;align-items:center;gap:4px;font-weight:500;color:${present ? "#16a34a" : "#dc2626"};">
                <span style="width:7px;height:7px;border-radius:50%;background:currentColor;display:inline-block;"></span>
                ${escapeHtml(r.attendanceStatus)}
              </span>
            </td>
            <td style="padding:8px 12px;color:#6b7280;max-width:220px;">${escapeHtml(r.homework || "—")}</td>
          </tr>`;
        })
        .join("");

      return `
      <div style="${cardStyle}">
        <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:#111827;">
          ${escapeHtml(section.teacherName)}
          <span style="font-weight:400;color:#6b7280;font-size:13px;"> · ${section.records.length} record(s)</span>
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#f9fafb;color:#6b7280;">
              <th style="padding:8px 12px;text-align:left;font-weight:500;">Student</th>
              <th style="padding:8px 12px;text-align:left;font-weight:500;">Course</th>
              <th style="padding:8px 12px;text-align:left;font-weight:500;">Attendance</th>
              <th style="padding:8px 12px;text-align:left;font-weight:500;">Homework</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
    })
    .join("");

  return {
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
      <p style="margin:0;color:#6b7280;font-size:14px;">${formatDate(date)}</p>

      <div style="display:flex;gap:24px;margin-top:20px;flex-wrap:wrap;">
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 20px;flex:1;min-width:120px;">
          <div style="font-size:24px;font-weight:700;color:#16a34a;">${totalPresent}</div>
          <div style="font-size:12px;color:#15803d;margin-top:2px;">Present</div>
        </div>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px 20px;flex:1;min-width:120px;">
          <div style="font-size:24px;font-weight:700;color:#dc2626;">${totalRecords - totalPresent}</div>
          <div style="font-size:12px;color:#b91c1c;margin-top:2px;">Absent</div>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 20px;flex:1;min-width:120px;">
          <div style="font-size:24px;font-weight:700;color:#334155;">${totalRecords}</div>
          <div style="font-size:12px;color:#64748b;margin-top:2px;">Total</div>
        </div>
      </div>
    </div>

    <h2 style="font-size:15px;font-weight:600;color:#374151;margin:0 0 12px;">Breakdown by Instructor</h2>
    ${sectionHtml}

    <div style="text-align:center;margin-top:24px;">
      <a href="${DEFAULT_DASHBOARD_URL}/admin/reports"
         style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:10px 24px;border-radius:6px;font-size:14px;font-weight:500;">
        View Full Reports
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

/**
 * buildMissedAttendanceEmail
 * Used by missedAttendanceReminder.cron.js.
 *
 * @param {object} opts
 * @param {string} opts.teacherName
 * @param {string} opts.courseName
 * @param {Date}   opts.slotDate
 * @param {string} opts.startTime
 * @param {string} opts.endTime
 * @param {number} opts.studentCount
 * @param {boolean} opts.isAdminCopy  - true = email going to admin, false = to teacher
 */
function buildMissedAttendanceEmail({
  teacherName,
  courseName,
  slotDate,
  startTime,
  endTime,
  studentCount,
  isAdminCopy = false,
}) {
  const subject = isAdminCopy
    ? `Attendance Not Submitted — ${escapeHtml(courseName)} (${formatDate(slotDate)})`
    : `Reminder: Submit Attendance for ${escapeHtml(courseName)}`;

  const heading = isAdminCopy
    ? "Attendance Not Submitted"
    : "Class Attendance Reminder";

  const body = isAdminCopy
    ? `<strong>${escapeHtml(teacherName)}</strong> has not submitted attendance for the class below. Please follow up with the instructor.`
    : `You have a class for which attendance has not been submitted yet. Please log in to the dashboard and mark attendance for your students.`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="${baseStyles}">
  <div style="max-width:560px;margin:32px auto;padding:0 16px;">
    <div style="text-align:center;margin-bottom:24px;">
      <img src="cid:${LOGO_CID}" alt="Dunamis India" style="height:40px;" />
    </div>

    <div style="background:#fff;border-radius:10px;border:1px solid #e4e4e7;padding:28px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
        <div style="width:36px;height:36px;border-radius:50%;background:#fef3c7;display:flex;align-items:center;justify-content:center;font-size:18px;">⚠️</div>
        <h1 style="margin:0;font-size:18px;font-weight:700;color:#111827;">${heading}</h1>
      </div>

      <p style="margin:0 0 20px;color:#4b5563;line-height:1.6;">${body}</p>

      <div style="${cardStyle}margin-bottom:0;">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr>
            <td style="padding:6px 0;color:#6b7280;width:120px;">Instructor</td>
            <td style="padding:6px 0;font-weight:500;">${escapeHtml(teacherName)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;">Course</td>
            <td style="padding:6px 0;font-weight:500;">${escapeHtml(courseName)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;">Date</td>
            <td style="padding:6px 0;">${formatDate(slotDate)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;">Time</td>
            <td style="padding:6px 0;">${formatTime(startTime)} – ${formatTime(endTime)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;">Students</td>
            <td style="padding:6px 0;">${studentCount}</td>
          </tr>
        </table>
      </div>

      ${
        !isAdminCopy
          ? `<div style="text-align:center;margin-top:24px;">
          <a href="${DEFAULT_DASHBOARD_URL}/teacher/attendance"
             style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:10px 24px;border-radius:6px;font-size:14px;font-weight:500;">
            Submit Attendance
          </a>
        </div>`
          : ""
      }
    </div>

    <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:24px;">
      Automated reminder from Dunamis India LMS.
    </p>
  </div>
</body>
</html>`;

  return {
    subject,
    html,
    attachments: [
      {
        filename: "Dunamis.png",
        path: LOGO_PATH,
        cid: LOGO_CID,
      },
    ],
  };
}

module.exports = { buildAttendanceDigestEmail, buildMissedAttendanceEmail };
