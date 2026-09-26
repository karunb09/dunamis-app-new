const Remuneration = require("../model/remuneration.model");
const Teacher = require("../model/teacher.model");
const asyncHandler = require("../utils/asyncHandler");
const { formatUserName } = require("../utils/formatName");
const { buildInstructorPayout, summarise } = require("../services/instructorPayout");
const { getPayslip } = require("../services/payslipPdf");

const toId = (value) => String(value?._id || value || "");

const teacherPopulate = {
  path: "teacherId",
  select: "userId",
  populate: { path: "userId", select: "name employeeId email" },
};

const isAdmin = (req) => ["admin", "superadmin"].includes(req.user?.accountType);

// A draft belongs to the admin review queue only — the instructor must not see
// a number that has not been signed off.
const visibleToCaller = (record, req) =>
  isAdmin(req) || Boolean(record.approvedAt);

const instructorMeta = (record) => ({
  name: formatUserName(record.teacherId?.userId?.name, "Instructor"),
  employeeId: record.teacherId?.userId?.employeeId || "",
  approvedByName: record.approvedBy?.name
    ? formatUserName(record.approvedBy.name, "")
    : "",
});

// Writes one month's payout, preserving whatever adjustments an admin has
// already added — regeneration recomputes attendance, never discards manual
// lines. Returns the saved doc.
const upsertPayout = async ({ teacherId, month }) => {
  const payout = await buildInstructorPayout({ teacherId, month });
  const existing = await Remuneration.findOne({ teacherId, month });
  const adjustments = existing?.adjustments || [];

  const totals = summarise({
    lines: payout.lines,
    demoAmount: payout.demoAmount,
    adjustments,
  });

  return Remuneration.findOneAndUpdate(
    { teacherId, month },
    {
      $set: {
        lines: payout.lines,
        demoConversions: payout.demoConversions,
        demoAmount: payout.demoAmount,
        groupStudents: payout.groupStudents,
        individualStudents: payout.individualStudents,
        demoStudents: payout.demoStudents,
        payDueDate: payout.payDueDate,
        totalEarnings: totals.totalEarnings,
        totalEarningsInWords: totals.totalEarningsInWords,
        generatedAt: new Date(),
        // Regenerating reopens the month for review; an approved figure must
        // not silently change under the instructor.
        approvedAt: null,
        approvedBy: null,
      },
      $setOnInsert: { adjustments: [] },
    },
    { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
  );
};

exports.getRemunerationByTeacher = asyncHandler(async (req, res) => {
  const { teacherId } = req.params;

  const teacherExists = await Teacher.exists({ _id: teacherId });
  if (!teacherExists) {
    return res.status(404).json({ success: false, message: "Teacher not found." });
  }

  if (
    req.user?.accountType === "teacher" &&
    toId(req.user.roleId) !== String(teacherId)
  ) {
    return res.status(403).json({
      success: false,
      message: "You can only view your own payouts.",
    });
  }

  const query = { teacherId };
  if (!isAdmin(req)) query.approvedAt = { $ne: null };

  const records = await Remuneration.find(query).sort({ month: -1 }).lean();

  res.status(200).json({ success: true, count: records.length, data: records });
});

exports.getRemunerationById = asyncHandler(async (req, res) => {
  const record = await Remuneration.findById(req.params.id).populate(teacherPopulate);

  if (!record) {
    return res
      .status(404)
      .json({ success: false, message: "Remuneration record not found." });
  }

  if (!visibleToCaller(record, req)) {
    return res.status(403).json({
      success: false,
      message: "This payout has not been approved yet.",
    });
  }

  if (
    req.user?.accountType === "teacher" &&
    toId(req.user.roleId) !== toId(record.teacherId)
  ) {
    return res
      .status(403)
      .json({ success: false, message: "You can only view your own payouts." });
  }

  res.status(200).json({ success: true, data: record });
});

// Dry run for the admin review screen — nothing is written.
exports.previewRemuneration = asyncHandler(async (req, res) => {
  const { teacherId, month } = req.validated.query;

  const teacherExists = await Teacher.exists({ _id: teacherId });
  if (!teacherExists) {
    return res.status(404).json({ success: false, message: "Teacher not found." });
  }

  const payout = await buildInstructorPayout({ teacherId, month });
  res.status(200).json({ success: true, payout });
});

exports.generateRemuneration = asyncHandler(async (req, res) => {
  const { month, teacherId } = req.body;

  const teacherIds = teacherId
    ? [teacherId]
    : (await Teacher.find().select("_id").lean()).map((teacher) => teacher._id);

  if (!teacherIds.length) {
    return res
      .status(200)
      .json({ success: true, message: "No instructors to generate for.", count: 0 });
  }

  const generated = [];
  for (const id of teacherIds) {
    generated.push(await upsertPayout({ teacherId: id, month }));
  }

  const withEarnings = generated.filter((record) => record.totalEarnings > 0);
  const needingRates = generated.filter((record) =>
    (record.lines || []).some((line) => line.rateMissing)
  );

  res.status(201).json({
    success: true,
    message: `Generated ${generated.length} payout${
      generated.length === 1 ? "" : "s"
    } for ${month}.`,
    count: generated.length,
    payableCount: withEarnings.length,
    rateMissingCount: needingRates.length,
  });
});

exports.listRemunerationsForMonth = asyncHandler(async (req, res) => {
  const { month, status } = req.validated.query;

  const query = { month };
  if (status === "draft") query.approvedAt = null;
  if (status === "approved") {
    query.approvedAt = { $ne: null };
    query.payStatus = "Due";
  }
  if (status === "paid") query.payStatus = "Paid";

  const records = await Remuneration.find(query)
    .populate(teacherPopulate)
    .sort({ totalEarnings: -1 })
    .lean();

  const totals = records.reduce(
    (acc, record) => {
      acc.amount += record.totalEarnings || 0;
      if (record.approvedAt) acc.approved += 1;
      if (record.payStatus === "Paid") acc.paid += 1;
      if ((record.lines || []).some((line) => line.rateMissing)) acc.rateMissing += 1;
      return acc;
    },
    { amount: 0, approved: 0, paid: 0, rateMissing: 0 }
  );

  res.status(200).json({
    success: true,
    month,
    count: records.length,
    totals,
    records,
  });
});

exports.updateAdjustments = asyncHandler(async (req, res) => {
  const record = await Remuneration.findById(req.params.id);

  if (!record) {
    return res
      .status(404)
      .json({ success: false, message: "Remuneration record not found." });
  }

  if (record.payStatus === "Paid") {
    return res.status(409).json({
      success: false,
      message: "This payout is already marked paid and can no longer be edited.",
    });
  }

  record.adjustments = req.body.adjustments.map((item) => ({
    label: item.label,
    amount: item.amount,
    byUserId: req.user?.userId || null,
    at: new Date(),
  }));

  const totals = summarise({
    lines: record.lines,
    demoAmount: record.demoAmount,
    adjustments: record.adjustments,
  });
  record.totalEarnings = totals.totalEarnings;
  record.totalEarningsInWords = totals.totalEarningsInWords;

  await record.save();

  res.status(200).json({ success: true, data: record });
});

exports.approveRemuneration = asyncHandler(async (req, res) => {
  const record = await Remuneration.findById(req.params.id);

  if (!record) {
    return res
      .status(404)
      .json({ success: false, message: "Remuneration record not found." });
  }

  if ((record.lines || []).some((line) => line.rateMissing)) {
    return res.status(409).json({
      success: false,
      message:
        "This payout has lines with no rate card entry. Add the missing rates and regenerate before approving.",
    });
  }

  record.approvedAt = new Date();
  record.approvedBy = req.user?.userId || null;
  await record.save();

  res.status(200).json({ success: true, data: record });
});

exports.updatePayStatus = asyncHandler(async (req, res) => {
  const record = await Remuneration.findById(req.params.id);

  if (!record) {
    return res
      .status(404)
      .json({ success: false, message: "Remuneration record not found." });
  }

  if (req.body.payStatus === "Paid" && !record.approvedAt) {
    return res.status(409).json({
      success: false,
      message: "Approve this payout before marking it paid.",
    });
  }

  record.payStatus = req.body.payStatus;
  if (req.body.transactionId) record.transactionId = req.body.transactionId;
  await record.save();

  res.status(200).json({ success: true, data: record });
});

exports.downloadPayslip = asyncHandler(async (req, res) => {
  const record = await Remuneration.findById(req.params.id)
    .populate(teacherPopulate)
    .populate("approvedBy", "name");

  if (!record) {
    return res
      .status(404)
      .json({ success: false, message: "Remuneration record not found." });
  }

  if (
    req.user?.accountType === "teacher" &&
    toId(req.user.roleId) !== toId(record.teacherId)
  ) {
    return res
      .status(403)
      .json({ success: false, message: "You can only download your own payslip." });
  }

  if (!visibleToCaller(record, req)) {
    return res.status(403).json({
      success: false,
      message: "This payout has not been approved yet.",
    });
  }

  const meta = instructorMeta(record);
  const { buffer, hash, filePath, cached } = await getPayslip(record, meta);

  if (!cached) {
    await Remuneration.updateOne(
      { _id: record._id },
      { $set: { payslipFile: { hash, path: filePath, generatedAt: new Date() } } }
    );
  }

  const fileName = `Dunamis-Payslip-${meta.employeeId || toId(record.teacherId)}-${
    record.month
  }.pdf`;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.setHeader("Content-Length", buffer.length);
  res.status(200).send(buffer);
});

exports.upsertPayout = upsertPayout;
