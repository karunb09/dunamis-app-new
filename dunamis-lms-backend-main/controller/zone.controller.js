const Zone = require("../model/zone.model");
const City = require("../model/city.model");
const Branch = require("../model/branch.model");
const User = require("../model/user.model");
const asyncHandler = require("../utils/asyncHandler");

// Handlers throw on failure; the central errorHandler formats Mongoose
// validation/cast/duplicate errors (a duplicate name in one city is a 409).

// GET /zone?city=<id> — every zone, or one city's.
exports.getZones = asyncHandler(async (req, res) => {
  const filter = req.query.city ? { city: req.query.city } : {};
  const zones = await Zone.find(filter).populate("city", "cityName").sort({ name: 1 });

  res.status(200).json({ success: true, zones });
});

exports.createZone = asyncHandler(async (req, res) => {
  const name = String(req.body.name || "").trim();
  const { city } = req.body;

  if (!name || !city) {
    return res.status(400).json({ success: false, message: "Zone name and city are required." });
  }
  if (!(await City.exists({ _id: city }))) {
    return res.status(400).json({ success: false, message: "City not found." });
  }

  const zone = await Zone.create({ name, city });

  res.status(201).json({ success: true, message: "Zone created successfully", zone });
});

// Renames only. Moving a zone to another city would strand its branches in
// the wrong city, so a zone stays in the city it was created for.
exports.updateZone = asyncHandler(async (req, res) => {
  const name = String(req.body.name || "").trim();
  if (!name) {
    return res.status(400).json({ success: false, message: "Zone name is required." });
  }

  const zone = await Zone.findByIdAndUpdate(
    req.params.id,
    { name },
    { returnDocument: "after", runValidators: true }
  );
  if (!zone) {
    return res.status(404).json({ success: false, message: "Zone not found" });
  }

  res.status(200).json({ success: true, message: "Zone updated successfully", zone });
});

exports.deleteZone = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [branchCount, staffCount] = await Promise.all([
    Branch.countDocuments({ zone: id }),
    User.countDocuments({ "org.zones": id }),
  ]);
  if (branchCount || staffCount) {
    return res.status(409).json({
      success: false,
      message: branchCount
        ? `${branchCount} branch(es) are still in this zone.`
        : "A BDE is still responsible for this zone.",
      hint: branchCount
        ? "Move those branches to another zone first."
        : "Change that BDE's responsibility from the Reporting structure tab first.",
    });
  }

  const zone = await Zone.findByIdAndDelete(id);
  if (!zone) {
    return res.status(404).json({ success: false, message: "Zone not found" });
  }

  res.status(200).json({ success: true, message: "Zone deleted successfully" });
});
