const City = require("../model/city.model");
const User = require("../model/user.model");
const asyncHandler = require("../utils/asyncHandler");

// Handlers throw on failure; the central errorHandler (middleware/errorHandler.js)
// formats Mongoose validation/cast/duplicate + generic errors. Express 5 also
// auto-forwards async rejections, so no per-handler try/catch is needed.

// Create City
exports.createCity = asyncHandler(async (req, res) => {
  const {
    cityName,
    cityManager,
    cityAdminEmail,
    cityAdminContact,
    parentCity,
    isDraft,
  } = req.body;

  if (!cityName || !cityManager || !cityAdminEmail || !cityAdminContact) {
    return res.status(400).json({
      success: false,
      message: "All required fields must be filled.",
    });
  }

  const newCity = new City({
    cityName,
    cityManager,
    cityAdminEmail,
    cityAdminContact,
    parentCity,
    isDraft: isDraft || false,
  });

  await newCity.save();

  res.status(201).json({
    success: true,
    message: "City created successfully",
    city: newCity,
  });
});

// Get all Cities
exports.getAllCities = asyncHandler(async (req, res) => {
  const cities = await City.find()
    .populate("cityManager", "name email")
    .populate("parentCity", "cityName")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    cities,
  });
});

// Get City by ID
exports.getCityById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const city = await City.findById(id)
    .populate("cityManager", "name email")
    .populate("parentCity", "cityName");

  if (!city) {
    return res.status(404).json({
      success: false,
      message: "City not found",
    });
  }

  res.status(200).json({
    success: true,
    city,
  });
});

// Get City Managers
exports.getCityManagers = asyncHandler(async (req, res) => {
  const managers = await User.find({ accountType: "admin" }).select(
    "_id name email"
  );

  res.status(200).json({
    success: true,
    managers,
  });
});

// Update City
exports.updateCity = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const updatedCity = await City.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  });

  if (!updatedCity) {
    return res.status(404).json({
      success: false,
      message: "City not found",
    });
  }

  res.status(200).json({
    success: true,
    message: "City updated successfully",
    city: updatedCity,
  });
});

// Delete City
exports.deleteCity = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const deletedCity = await City.findByIdAndDelete(id);

  if (!deletedCity) {
    return res.status(404).json({
      success: false,
      message: "City not found",
    });
  }

  res.status(200).json({
    success: true,
    message: "City deleted successfully",
  });
});
