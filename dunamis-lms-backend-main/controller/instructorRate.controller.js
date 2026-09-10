const InstructorPayConfig = require("../model/instructorPayConfig.model");
const InstructorRate = require("../model/instructorRate.model");
const asyncHandler = require("../utils/asyncHandler");

exports.listRates = asyncHandler(async (req, res) => {
  const rates = await InstructorRate.find()
    .populate("categoryId", "name")
    .sort({ "categoryId.name": 1, level: 1, sessionType: 1 })
    .lean();

  res.status(200).json({ success: true, count: rates.length, rates });
});

exports.createRate = asyncHandler(async (req, res) => {
  const existing = await InstructorRate.findOne({
    categoryId: req.body.categoryId,
    level: req.body.level,
    sessionType: req.body.sessionType,
  });

  if (existing) {
    return res.status(409).json({
      success: false,
      message:
        "A rate already exists for this category, level and session type. Edit that one instead.",
    });
  }

  const rate = await InstructorRate.create({
    ...req.body,
    updatedBy: req.user?.userId || null,
  });

  res.status(201).json({ success: true, rate });
});

exports.updateRate = asyncHandler(async (req, res) => {
  const rate = await InstructorRate.findByIdAndUpdate(
    req.params.id,
    { ...req.body, updatedBy: req.user?.userId || null },
    { returnDocument: "after", runValidators: true }
  );

  if (!rate) {
    return res.status(404).json({ success: false, message: "Rate not found." });
  }

  res.status(200).json({ success: true, rate });
});

exports.deleteRate = asyncHandler(async (req, res) => {
  const rate = await InstructorRate.findByIdAndDelete(req.params.id);

  if (!rate) {
    return res.status(404).json({ success: false, message: "Rate not found." });
  }

  res.status(200).json({ success: true, message: "Rate removed." });
});

exports.getConfig = asyncHandler(async (req, res) => {
  const config = await InstructorPayConfig.load();
  res.status(200).json({ success: true, config });
});

exports.updateConfig = asyncHandler(async (req, res) => {
  const updates = Object.fromEntries(
    Object.entries(req.body).filter(([, value]) => value != null)
  );

  const config = await InstructorPayConfig.findOneAndUpdate(
    { key: "default" },
    { ...updates, updatedBy: req.user?.userId || null },
    { returnDocument: "after", upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  res.status(200).json({ success: true, config });
});
