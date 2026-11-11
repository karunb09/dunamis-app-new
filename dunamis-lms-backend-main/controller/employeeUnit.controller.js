const EmployeeUnit = require("../model/employeeUnit.model");
const User = require("../model/user.model");
const asyncHandler = require("../utils/asyncHandler");
const { isDefaultUnit, listUnits } = require("../utils/employeeId");

const staffCountsByUnit = async () => {
  const rows = await User.aggregate([
    { $match: { employeeId: { $regex: /^[A-Z]{3}[AIB]\d/ } } },
    { $group: { _id: { $substrCP: ["$employeeId", 0, 3] }, count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [row._id, row.count]));
};

const withUsage = (unit, counts) => ({
  ...unit,
  isDefault: isDefaultUnit(unit.code),
  staffCount: counts.get(unit.code) || 0,
});

const notFound = (res) => res.status(404).json({ success: false, message: "Unit not found" });

exports.getUnits = asyncHandler(async (req, res) => {
  const [units, counts] = await Promise.all([listUnits(), staffCountsByUnit()]);
  res.status(200).json({ success: true, units: units.map((unit) => withUsage(unit, counts)) });
});

exports.createUnit = asyncHandler(async (req, res) => {
  const code = String(req.body.code || "").trim().toUpperCase();
  const name = String(req.body.name || "").trim();

  if (!/^[A-Z]{3}$/.test(code)) {
    return res.status(400).json({ success: false, message: "The unit code must be exactly 3 letters, e.g. DLH." });
  }
  if (!name) {
    return res.status(400).json({ success: false, message: "The unit name is required." });
  }
  if (await EmployeeUnit.exists({ code })) {
    return res.status(409).json({ success: false, message: `Unit ${code} already exists.` });
  }

  const unit = await EmployeeUnit.create({ code, name, createdBy: req.user.userId });

  res.status(201).json({
    success: true,
    message: `Unit ${code} added`,
    unit: withUsage(unit.toObject(), new Map()),
  });
});

// Name and active flag only. The code is baked into every ID already issued.
exports.updateUnit = asyncHandler(async (req, res) => {
  const update = {};
  if (req.body.name !== undefined) {
    update.name = String(req.body.name).trim();
    if (!update.name) {
      return res.status(400).json({ success: false, message: "The unit name is required." });
    }
  }
  if (req.body.isActive !== undefined) update.isActive = Boolean(req.body.isActive);

  const unit = await EmployeeUnit.findByIdAndUpdate(req.params.id, update, {
    returnDocument: "after",
    runValidators: true,
  }).lean();
  if (!unit) return notFound(res);

  res.status(200).json({ success: true, message: "Unit updated", unit: withUsage(unit, await staffCountsByUnit()) });
});

// Only for a unit added by mistake: anyone holding one of its IDs would be
// left with an ID no admin could correct.
exports.deleteUnit = asyncHandler(async (req, res) => {
  const unit = await EmployeeUnit.findById(req.params.id);
  if (!unit) return notFound(res);

  if (isDefaultUnit(unit.code)) {
    return res.status(409).json({
      success: false,
      message: `${unit.code} is a built-in unit and can't be deleted.`,
      hint: "Deactivate it instead to hide it from the pickers.",
    });
  }
  const staffCount = (await staffCountsByUnit()).get(unit.code) || 0;
  if (staffCount) {
    return res.status(409).json({
      success: false,
      message: `${staffCount} staff member${staffCount === 1 ? " holds" : "s hold"} a ${unit.code} employee ID.`,
      hint: "Deactivate the unit instead; their IDs stay as they are.",
    });
  }

  await unit.deleteOne();
  res.status(200).json({ success: true, message: `Unit ${unit.code} deleted` });
});
