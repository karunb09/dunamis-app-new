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

const formatInr = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatPct = (value) => (value == null ? "—" : `${value}%`);

const deltaChip = (delta, deltaPct) => {
  if (delta === 0 && deltaPct == null) {
    return `<span style="color:#64748b;font-size:12px;font-weight:500;">—</span>`;
  }
  const up = delta >= 0;
  const color = up ? "#16a34a" : "#dc2626";
  const arrow = up ? "▲" : "▼";
  const pctLabel = deltaPct == null ? "" : ` (${formatPct(Math.abs(deltaPct))})`;
  return `<span style="color:${color};font-size:12px;font-weight:600;">${arrow} ${Math.abs(delta).toLocaleString("en-IN")}${pctLabel}</span>`;
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
  <div style="background:${bg};border:1px solid ${border};border-radius:8px;padding:14px 16px;flex:1;min-width:130px;">
    <div style="font-size:20px;font-weight:700;color:${color};">${value}</div>
    <div style="font-size:12px;color:${color};margin-top:2px;opacity:0.85;">${label}</div>
  </div>`;

const kvTable = (rows) => `
  <table style="width:100%;border-collapse:collapse;font-size:13px;">
    <thead>
      <tr style="background:#f9fafb;color:#6b7280;">
        <th style="padding:8px 12px;text-align:left;font-weight:500;">Metric</th>
        <th style="padding:8px 12px;text-align:right;font-weight:500;">This month</th>
        <th style="padding:8px 12px;text-align:right;font-weight:500;">Change</th>
      </tr>
    </thead>
    <tbody>
      ${rows
        .map(
          (r) => `
        <tr style="border-bottom:1px solid #f0f0f0;">
          <td style="padding:8px 12px;color:#374151;">${escapeHtml(r.label)}</td>
          <td style="padding:8px 12px;text-align:right;font-weight:600;color:#111827;">${r.value}</td>
          <td style="padding:8px 12px;text-align:right;">${deltaChip(r.delta, r.deltaPct)}</td>
        </tr>`
        )
        .join("")}
    </tbody>
  </table>`;

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

/**
 * buildMonthlyInsightsEmail
 * Used by monthlyInsights.cron.js for the admin monthly digest.
 *
 * @param {object} opts
 * @param {object} opts.insights - the object returned by buildMonthlyInsights()
 */
function buildMonthlyInsightsEmail({ insights }) {
  const { month, growth, revenue, funnel, delivery, partial, failedSections } = insights;

  const headlineTiles = [
    statTile("Students registered", growth.studentsRegistered.current.toLocaleString("en-IN"), "#166534", "#f0fdf4", "#bbf7d0"),
    statTile("New enrollments", growth.studentsEnrolled.current.toLocaleString("en-IN"), "#1d4ed8", "#eff6ff", "#bfdbfe"),
    statTile("Revenue", formatInr(revenue.gross.current), "#9a3412", "#fff7ed", "#fed7aa"),
    statTile("Demo → enroll", formatPct(funnel.demos.conversionRate), "#6d28d9", "#f5f3ff", "#ddd6fe"),
  ].join("");

  const warningStrip = partial
    ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:13px;color:#92400e;">
        ⚠️ Some sections could not be computed this run: ${escapeHtml(failedSections.join(", "))}. Figures for those sections may read as zero.
       </div>`
    : "";

  const growthRows = [
    { label: "Students registered", value: growth.studentsRegistered.current, delta: growth.studentsRegistered.delta, deltaPct: growth.studentsRegistered.deltaPct },
    { label: "Students enrolled", value: growth.studentsEnrolled.current, delta: growth.studentsEnrolled.delta, deltaPct: growth.studentsEnrolled.deltaPct },
    { label: "Instructors added", value: growth.instructorsAdded.current, delta: growth.instructorsAdded.delta, deltaPct: growth.instructorsAdded.deltaPct },
    { label: "Courses created", value: growth.coursesCreated.current, delta: growth.coursesCreated.delta, deltaPct: growth.coursesCreated.deltaPct },
    { label: "Courses published", value: growth.coursesPublished.current, delta: growth.coursesPublished.delta, deltaPct: growth.coursesPublished.deltaPct },
    { label: "Branches added", value: growth.branchesAdded.current, delta: growth.branchesAdded.delta, deltaPct: growth.branchesAdded.deltaPct },
  ];

  const revenueRows = [
    { label: "Gross revenue", value: formatInr(revenue.gross.current), delta: revenue.gross.delta, deltaPct: revenue.gross.deltaPct },
    { label: "Paying students", value: revenue.payingStudents.current, delta: revenue.payingStudents.delta, deltaPct: revenue.payingStudents.deltaPct },
    { label: "Discount given", value: formatInr(revenue.discount.current), delta: revenue.discount.delta, deltaPct: revenue.discount.deltaPct },
    { label: "Outstanding dues", value: formatInr(revenue.outstanding.amount), delta: 0, deltaPct: null },
    { label: "Refunded", value: formatInr(revenue.refunded.amount), delta: 0, deltaPct: null },
  ];

  const funnelRows = funnel.stages.map((s) => [
    escapeHtml(s.label),
    s.value.toLocaleString("en-IN"),
    s.rateFromPrev == null ? "—" : formatPct(s.rateFromPrev),
  ]);

  const topCourseRows = (revenue.topCourses || []).slice(0, 5).map((c) => [
    escapeHtml(c.name),
    formatInr(c.revenue),
    String(c.students),
  ]);

  const deliveryRows = [
    { label: "Sessions held", value: delivery.sessions.total.current, delta: delivery.sessions.total.delta, deltaPct: delivery.sessions.total.deltaPct },
    { label: "Attendance rate", value: formatPct(delivery.attendance.rate), delta: 0, deltaPct: null },
    { label: "Active students", value: delivery.attendance.activeStudents, delta: 0, deltaPct: null },
    { label: "Active instructors", value: delivery.attendance.activeInstructors, delta: 0, deltaPct: null },
  ];

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="${baseStyles}">
  <div style="max-width:680px;margin:32px auto;padding:0 16px;">
    <div style="text-align:center;margin-bottom:24px;">
      <img src="cid:${LOGO_CID}" alt="Dunamis India" style="height:40px;" />
    </div>

    <div style="background:#fff;border-radius:10px;border:1px solid #e4e4e7;padding:28px;margin-bottom:24px;">
      <h1 style="margin:0 0 6px;font-size:20px;font-weight:700;color:#111827;">Monthly Insights Report</h1>
      <p style="margin:0;color:#6b7280;font-size:14px;">${escapeHtml(month.label)}</p>

      <div style="display:flex;gap:16px;margin-top:20px;flex-wrap:wrap;">
        ${headlineTiles}
      </div>
    </div>

    ${warningStrip}

    <div style="${cardStyle}">
      <h2 style="font-size:15px;font-weight:600;color:#374151;margin:0 0 12px;">Growth</h2>
      ${kvTable(growthRows)}
    </div>

    <div style="${cardStyle}">
      <h2 style="font-size:15px;font-weight:600;color:#374151;margin:0 0 12px;">Revenue</h2>
      ${kvTable(revenueRows)}
      ${topCourseRows.length ? `<p style="margin:16px 0 8px;font-size:13px;font-weight:600;color:#374151;">Top courses by revenue</p>${simpleTable(["Course", "Revenue", "Students"], topCourseRows)}` : ""}
    </div>

    <div style="${cardStyle}">
      <h2 style="font-size:15px;font-weight:600;color:#374151;margin:0 0 12px;">Funnel</h2>
      ${simpleTable(["Stage", "Count", "Step conversion"], funnelRows)}
    </div>

    <div style="${cardStyle}margin-bottom:0;">
      <h2 style="font-size:15px;font-weight:600;color:#374151;margin:0 0 12px;">Delivery</h2>
      ${kvTable(deliveryRows)}
    </div>

    <div style="text-align:center;margin-top:24px;">
      <a href="${DEFAULT_DASHBOARD_URL}/admin/reports?month=${month.key}"
         style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:10px 24px;border-radius:6px;font-size:14px;font-weight:500;">
        View Full Report
      </a>
    </div>

    <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:28px;">
      Automated monthly digest from Dunamis India LMS. Generated ${escapeHtml(new Date(insights.generatedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }))} IST.
    </p>
  </div>
</body>
</html>`;

  const subject = `Monthly Insights — ${month.label}`;

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

module.exports = { buildMonthlyInsightsEmail };
