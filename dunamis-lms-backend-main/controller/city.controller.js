const City = require("../model/city.model");
const User = require("../model/user.model");
const { sendValidationError } = require("../utils/validationErrorResponse");

// Create City
exports.createCity = async (req, res) => {
  try {
    const {
      cityName,
      cityManager,
      cityAdminEmail,
      cityAdminContact,
      parentCity,
      isDraft,
    } = req.body;

    // Validation
    if (
      !cityName ||
      !cityManager ||
      !cityAdminEmail ||
      !cityAdminContact
    ) {
      return res
        .status(400)
        .json({
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
  } catch (error) {
    sendValidationError(res, error, "Server Error");
  }
};
// Get all Cities
exports.getAllCities = async (req, res) => {
  try {
    const cities = await City.find()
      .populate("cityManager", "name email")
      .populate("parentCity", "cityName")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      cities,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching cities",
      error: error.message,
    });
  }
};
// Get City by ID
exports.getCityById = async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching city",
      error: error.message,
    });
  }
};
// Get City Managers
exports.getCityManagers = async (req, res) => {
  try {
    const managers = await User.find({ accountType: "admin" }).select(
      "_id name email"
    );

    res.status(200).json({
      success: true,
      managers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch city managers",
      error: error.message,
    });
  }
};
// Update City
exports.updateCity = async (req, res) => {
  try {
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
  } catch (error) {
    sendValidationError(res, error, "Failed to update city");
  }
};
// Delete City
exports.deleteCity = async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting city",
      error: error.message,
    });
  }
};
