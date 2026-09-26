const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const PDFDocument = require("pdfkit");

const { monthLabel, monthWindow } = require("../utils/istMonth");

// Deliberately outside uploads/ — that directory is mounted with express.static
// and no auth, so anything in it is readable by URL.
const PAYSLIP_DIR = path.join(__dirname, "..", "storage", "payslips");

// The standard PDF fonts are WinAnsi-encoded and have no rupee glyph.
const money = (value) => {
  const amount = Math.round(Number(value) || 0);
  return `${amount < 0 ? "-" : ""}Rs. ${Math.abs(amount).toLocaleString("en-IN")}`;
};

const istDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      })
    : "—";

const sessionLabel = (sessionType) =>
  sessionType === "premium" ? "Individual" : "Group";

const titleCase = (value) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : "—";

// Covers exactly what the PDF prints, so an edited adjustment invalidates the
// cached file and nothing else does.
const payslipHash = (remuneration, instructor) =>
  crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        month: remuneration.month,
        lines: (remuneration.lines || []).map((line) => [
          line.studentName,
          line.courseName,
          line.level,
          line.sessionType,
          line.sessionsAttended,
          line.sessionsPerMonth,
          line.rate,
          line.amount,
        ]),
        demoConversions: remuneration.demoConversions,
        demoAmount: remuneration.demoAmount,
        adjustments: (remuneration.adjustments || []).map((item) => [
          item.label,
          item.amount,
        ]),
        totalEarnings: remuneration.totalEarnings,
        payDueDate: remuneration.payDueDate,
        approvedAt: remuneration.approvedAt,
        approvedByName: instructor.approvedByName || "",
        name: instructor.name,
        employeeId: instructor.employeeId || "",
      })
    )
    .digest("hex");

const COLUMNS = [
  { key: "studentName", label: "Learner", width: 118 },
  { key: "courseName", label: "Course", width: 118 },
  { key: "level", label: "Level", width: 68 },
  { key: "sessionType", label: "Type", width: 55 },
  { key: "sessions", label: "Sessions", width: 58, align: "right" },
  { key: "rate", label: "Rate", width: 62, align: "right" },
  { key: "amount", label: "Amount", width: 62, align: "right" },
];

const TABLE_WIDTH = COLUMNS.reduce((sum, column) => sum + column.width, 0);

const drawRow = (doc, cells, { bold = false, y }) => {
  doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(8.5);
  let x = doc.page.margins.left;

  COLUMNS.forEach((column) => {
    doc.text(String(cells[column.key] ?? ""), x, y, {
      width: column.width - 6,
      align: column.align || "left",
      lineBreak: false,
      ellipsis: true,
    });
    x += column.width;
  });
};

const renderPayslip = (remuneration, instructor) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const { start, end } = monthWindow(remuneration.month);
    const cycleEnd = new Date(end.getTime() - 1);

    doc.font("Helvetica-Bold").fontSize(18).text("Dunamis Creative Hub");
    doc.font("Helvetica").fontSize(10).fillColor("#666")
      .text("Instructor Payslip");
    doc.fillColor("#000").moveDown(1);

    doc.font("Helvetica-Bold").fontSize(13).text(instructor.name);
    doc.font("Helvetica").fontSize(9.5).fillColor("#444");
    if (instructor.employeeId) doc.text(`Employee ID: ${instructor.employeeId}`);
    doc.text(`Pay period: ${monthLabel(remuneration.month)}`);
    doc.text(`Cycle: ${istDate(start)} to ${istDate(cycleEnd)}`);
    doc.text(`Payment due: ${istDate(remuneration.payDueDate)}`);
    doc.fillColor("#000").moveDown(1);

    doc.font("Helvetica-Bold").fontSize(11).text("Teaching earnings");
    doc.font("Helvetica").fontSize(8).fillColor("#666").text(
      "Each learner is paid pro-rata on the sessions they attended, capped at one full month.",
      { width: TABLE_WIDTH }
    );
    doc.fillColor("#000").moveDown(0.6);

    let y = doc.y;
    drawRow(
      doc,
      Object.fromEntries(COLUMNS.map((column) => [column.key, column.label])),
      { bold: true, y }
    );
    y += 14;
    doc.moveTo(doc.page.margins.left, y - 3)
      .lineTo(doc.page.margins.left + TABLE_WIDTH, y - 3)
      .strokeColor("#ccc")
      .stroke();

    (remuneration.lines || []).forEach((line) => {
      if (y > doc.page.height - doc.page.margins.bottom - 120) {
        doc.addPage();
        y = doc.page.margins.top;
      }

      drawRow(
        doc,
        {
          studentName: line.studentName,
          courseName: line.courseName,
          level: titleCase(line.level),
          sessionType: sessionLabel(line.sessionType),
          sessions: `${line.sessionsAttended} / ${line.sessionsPerMonth}`,
          rate: line.rateMissing ? "—" : money(line.rate),
          amount: money(line.amount),
        },
        { y }
      );
      y += 13;
    });

    if (!(remuneration.lines || []).length) {
      doc.font("Helvetica-Oblique").fontSize(9).fillColor("#666")
        .text("No attendance recorded for this month.", doc.page.margins.left, y);
      doc.fillColor("#000");
      y += 16;
    }

    doc.moveTo(doc.page.margins.left, y + 2)
      .lineTo(doc.page.margins.left + TABLE_WIDTH, y + 2)
      .strokeColor("#ccc")
      .stroke();
    y += 10;

    const linesTotal = (remuneration.lines || []).reduce(
      (sum, line) => sum + (Number(line.amount) || 0),
      0
    );

    const summaryRow = (label, value, { bold = false } = {}) => {
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(9.5);
      doc.text(label, doc.page.margins.left, y, {
        width: TABLE_WIDTH - 90,
        lineBreak: false,
      });
      doc.text(value, doc.page.margins.left + TABLE_WIDTH - 90, y, {
        width: 90,
        align: "right",
        lineBreak: false,
      });
      y += 15;
    };

    summaryRow("Teaching subtotal", money(linesTotal));

    if (remuneration.demoConversions) {
      summaryRow(
        `Demo conversions (${remuneration.demoConversions})`,
        money(remuneration.demoAmount)
      );
    }

    (remuneration.adjustments || []).forEach((item) => {
      summaryRow(item.label, money(item.amount));
    });

    y += 4;
    doc.moveTo(doc.page.margins.left, y - 2)
      .lineTo(doc.page.margins.left + TABLE_WIDTH, y - 2)
      .strokeColor("#999")
      .stroke();
    y += 6;
    summaryRow("Net payable", money(remuneration.totalEarnings), { bold: true });

    doc.font("Helvetica").fontSize(8.5).fillColor("#444")
      .text(
        `Amount in words: ${remuneration.totalEarningsInWords || "—"} rupees only.`,
        doc.page.margins.left,
        y,
        { width: TABLE_WIDTH }
      );

    doc.moveDown(1.5);
    doc.fontSize(7.5).fillColor("#888").text(
      `Generated ${istDate(new Date())}. Approved ${istDate(
        remuneration.approvedAt
      )}${instructor.approvedByName ? ` by ${instructor.approvedByName}` : ""}. ` +
        "Computed from your marked attendance; raise any discrepancy with the admin team.",
      { width: TABLE_WIDTH }
    );

    doc.end();
  });

// One render per remuneration id at a time — a double-click must not spawn two.
const inFlight = new Map();

const buildAndCache = async (remuneration, instructor, hash) => {
  const buffer = await renderPayslip(remuneration, instructor);
  const filePath = path.join(
    PAYSLIP_DIR,
    `${remuneration._id}-${hash.slice(0, 12)}.pdf`
  );

  await fs.mkdir(PAYSLIP_DIR, { recursive: true });
  await fs.writeFile(filePath, buffer);

  const stale = remuneration.payslipFile?.path;
  if (stale && stale !== filePath) {
    await fs.rm(stale, { force: true });
  }

  return { buffer, filePath };
};

// Returns the cached payslip bytes, rendering only when the doc has changed
// since the last render (or the cached file has gone missing).
const getPayslip = async (remuneration, instructor) => {
  const hash = payslipHash(remuneration, instructor);
  const cachedPath = remuneration.payslipFile?.path;

  if (remuneration.payslipFile?.hash === hash && cachedPath) {
    try {
      return { buffer: await fs.readFile(cachedPath), hash, cached: true };
    } catch {
      // File is gone (cleared cache, fresh VPC) — fall through and re-render.
    }
  }

  const key = String(remuneration._id);
  if (!inFlight.has(key)) {
    inFlight.set(
      key,
      buildAndCache(remuneration, instructor, hash).finally(() =>
        inFlight.delete(key)
      )
    );
  }

  const { buffer, filePath } = await inFlight.get(key);
  return { buffer, hash, filePath, cached: false };
};

module.exports = { getPayslip, payslipHash, PAYSLIP_DIR };
