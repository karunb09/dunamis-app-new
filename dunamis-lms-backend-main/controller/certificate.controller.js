const Certificate = require("../model/certificate.model");
const Student = require("../model/student.model");
const asyncHandler = require("../utils/asyncHandler");
const { getCertificatePdf } = require("../services/certificatePdf");

const toId = (value) => String(value?._id || value || "");

const isAdmin = (req) => ["admin", "superadmin"].includes(req.user?.accountType);

// A learner sees their own, an instructor the ones they awarded, an admin all.
const scopeFor = async (req) => {
  if (isAdmin(req)) return {};

  if (req.user?.accountType === "teacher") {
    return { teacherId: req.user.roleId };
  }

  const student = await Student.findOne({ userId: req.user.userId }).select("_id");
  return { studentId: student?._id || null };
};

exports.listCertificates = asyncHandler(async (req, res) => {
  const scope = await scopeFor(req);

  if (scope.studentId === null) {
    return res.status(200).json({ success: true, count: 0, certificates: [] });
  }

  const certificates = await Certificate.find(scope)
    .select("-pdfFile")
    .sort({ issuedAt: -1 })
    .lean();

  res
    .status(200)
    .json({ success: true, count: certificates.length, certificates });
});

exports.downloadCertificate = asyncHandler(async (req, res) => {
  const certificate = await Certificate.findById(req.params.id);

  if (!certificate) {
    return res
      .status(404)
      .json({ success: false, message: "Certificate not found." });
  }

  if (!isAdmin(req)) {
    const scope = await scopeFor(req);
    const owns =
      (scope.studentId && toId(scope.studentId) === toId(certificate.studentId)) ||
      (scope.teacherId && toId(scope.teacherId) === toId(certificate.teacherId));

    if (!owns) {
      return res
        .status(404)
        .json({ success: false, message: "Certificate not found." });
    }
  }

  const { buffer, hash, filePath, cached } = await getCertificatePdf(certificate);

  if (!cached) {
    await Certificate.updateOne(
      { _id: certificate._id },
      { $set: { pdfFile: { hash, path: filePath, generatedAt: new Date() } } }
    );
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${certificate.certificateNumber}.pdf"`
  );
  res.setHeader("Content-Length", buffer.length);
  res.status(200).send(buffer);
});
