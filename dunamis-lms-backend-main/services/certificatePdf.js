const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const PDFDocument = require("pdfkit");

const Counter = require("../model/counter.model");

// Deliberately outside uploads/ — that directory is mounted with express.static
// and no auth, so anything in it is readable by URL.
const CERTIFICATE_DIR = path.join(__dirname, "..", "storage", "certificates");

const CERTIFICATE_PREFIX = "DCH-CERT";

// Same atomic $inc+upsert the employee-ID generator uses. Numbers are never
// reused, so a certificate number always identifies one award.
const nextCertificateNumber = async () => {
  const counter = await Counter.findOneAndUpdate(
    { _id: "certificate" },
    { $inc: { seq: 1 } },
    { returnDocument: "after", upsert: true }
  );
  return `${CERTIFICATE_PREFIX}-${String(counter.seq).padStart(6, "0")}`;
};

const istDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      })
    : "";

const titleCase = (value) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : "";

// Covers exactly what the PDF prints, so a corrected name invalidates the
// cached file and nothing else does.
const certificateHash = (certificate) =>
  crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        number: certificate.certificateNumber,
        student: certificate.studentName,
        course: certificate.courseName,
        category: certificate.categoryName,
        instructor: certificate.instructorName,
        level: certificate.level,
        issuedAt: certificate.issuedAt,
      })
    )
    .digest("hex");

const renderCertificate = (certificate) =>
  new Promise((resolve, reject) => {
    // Landscape: a certificate is hung on a wall, not filed.
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 0 });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const { width, height } = doc.page;
    const orange = "#FF6B35";

    doc.rect(0, 0, width, height).fill("#fffaf4");
    doc
      .lineWidth(6)
      .strokeColor(orange)
      .rect(28, 28, width - 56, height - 56)
      .stroke();
    doc
      .lineWidth(1)
      .strokeColor("#e5d5c8")
      .rect(42, 42, width - 84, height - 84)
      .stroke();

    const centered = (text, y, { size, font = "Helvetica", color = "#1e293b" }) => {
      doc.font(font).fontSize(size).fillColor(color);
      doc.text(text, 60, y, { width: width - 120, align: "center" });
    };

    centered("DUNAMIS CREATIVE HUB", 78, {
      size: 16,
      font: "Helvetica-Bold",
      color: orange,
    });
    centered("Certificate of Completion", 108, { size: 30, font: "Helvetica-Bold" });

    centered("This is to certify that", 196, { size: 12, color: "#64748b" });
    centered(certificate.studentName, 220, { size: 32, font: "Helvetica-Bold" });

    doc
      .moveTo(width / 2 - 160, 272)
      .lineTo(width / 2 + 160, 272)
      .lineWidth(1)
      .strokeColor("#e5d5c8")
      .stroke();

    centered(
      `has successfully completed the ${titleCase(certificate.level)} level of`,
      292,
      { size: 12, color: "#64748b" }
    );
    centered(certificate.courseName, 316, { size: 22, font: "Helvetica-Bold" });
    if (certificate.categoryName) {
      centered(certificate.categoryName, 348, { size: 11, color: "#64748b" });
    }

    centered(
      `Awarded on ${istDate(certificate.issuedAt)}`,
      388,
      { size: 11, color: "#64748b" }
    );

    const footerY = height - 118;
    const col = (label, value, x) => {
      doc.font("Helvetica-Bold").fontSize(11).fillColor("#1e293b");
      doc.text(value || "—", x, footerY, { width: 200, align: "center" });
      doc
        .moveTo(x, footerY + 18)
        .lineTo(x + 200, footerY + 18)
        .lineWidth(0.8)
        .strokeColor("#cbd5e1")
        .stroke();
      doc.font("Helvetica").fontSize(9).fillColor("#94a3b8");
      doc.text(label, x, footerY + 24, { width: 200, align: "center" });
    };

    col("Instructor", certificate.instructorName, 96);
    col("Certificate number", certificate.certificateNumber, width - 296);

    doc.end();
  });

// One render per certificate at a time — a double-click must not spawn two.
const inFlight = new Map();

const buildAndCache = async (certificate, hash) => {
  const buffer = await renderCertificate(certificate);
  const filePath = path.join(
    CERTIFICATE_DIR,
    `${certificate._id}-${hash.slice(0, 12)}.pdf`
  );

  await fs.mkdir(CERTIFICATE_DIR, { recursive: true });
  await fs.writeFile(filePath, buffer);

  const stale = certificate.pdfFile?.path;
  if (stale && stale !== filePath) {
    await fs.rm(stale, { force: true });
  }

  return { buffer, filePath };
};

// Returns the cached bytes, rendering only when the certificate has changed
// since the last render or the cached file has gone missing.
const getCertificatePdf = async (certificate) => {
  const hash = certificateHash(certificate);
  const cachedPath = certificate.pdfFile?.path;

  if (certificate.pdfFile?.hash === hash && cachedPath) {
    try {
      return { buffer: await fs.readFile(cachedPath), hash, cached: true };
    } catch {
      // Cleared cache or a fresh VPC — fall through and re-render.
    }
  }

  const key = String(certificate._id);
  if (!inFlight.has(key)) {
    inFlight.set(
      key,
      buildAndCache(certificate, hash).finally(() => inFlight.delete(key))
    );
  }

  const { buffer, filePath } = await inFlight.get(key);
  return { buffer, hash, filePath, cached: false };
};

module.exports = {
  getCertificatePdf,
  certificateHash,
  nextCertificateNumber,
  CERTIFICATE_DIR,
};
