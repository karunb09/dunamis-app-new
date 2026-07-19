const User = require("../model/user.model");
const asyncHandler = require("../utils/asyncHandler");
const Branch = require("../model/branch.model");
const City = require("../model/city.model");
const Teacher = require("../model/teacher.model");
const { localFileUpload } = require("../utils/locallyUploader");

const getBranchFallbackImage = (branchName = "Branch") =>
  `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(
    String(branchName).trim() || "Branch"
  )}`;

const parseOptionalArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [parsed].filter(Boolean);
  } catch {
    return String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
};

// Create Branch
exports.createBranch = asyncHandler(async (req, res) => {
    let {
      branchName,
      location,
      branchManager,
      branchAdminEmail,
      branchAdminContact,
      city,
      zone,
      status,
      branchTimings,
      branchOpenDays,
      branchCapacity,
      centreFacilities,
      teachers,
    } = req.body;

    // Parse inputs if needed
    if (typeof branchTimings === "string")
      branchTimings = JSON.parse(branchTimings);
    if (typeof branchOpenDays === "string")
      branchOpenDays = JSON.parse(branchOpenDays);
    if (typeof branchCapacity === "string")
      branchCapacity = Number(branchCapacity);
    const teacherIds = parseOptionalArray(teachers);

    // Validate required fields including zone and city
    if (
      !branchName ||
      !location ||
      !branchManager ||
      !branchAdminEmail ||
      !branchAdminContact ||
      !city ||
      !zone ||
      !status ||
      !branchTimings ||
      !branchOpenDays ||
      !Array.isArray(branchOpenDays) ||
      branchOpenDays.length === 0 ||
      branchCapacity === undefined ||
      isNaN(branchCapacity) ||
      !Array.isArray(branchTimings) ||
      branchTimings.length !== 2
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be filled and valid.",
      });
    }

    if (!/^\d+$/.test(String(zone).trim())) {
      return res.status(400).json({
        success: false,
        message: "Zone must contain numbers only.",
      });
    }

    // Validate if status is valid
    const validStatuses = ["draft", "active"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value. Must be either 'draft' or 'active'.",
      });
    }

    // Validate branchManager exists
    const managerExists = await User.findById(branchManager);
    if (!managerExists) {
      return res.status(400).json({
        success: false,
        message: "Invalid branch manager. Manager does not exist.",
      });
    }

    // Validate city exists
    const cityExists = await City.findById(city);
    if (!cityExists) {
      return res.status(400).json({
        success: false,
        message: "Invalid city. City does not exist.",
      });
    }

    if (teacherIds.length > 0) {
      const teacherCount = await Teacher.countDocuments({ _id: { $in: teacherIds } });
      if (teacherCount !== teacherIds.length) {
        return res.status(400).json({
          success: false,
          message: "One or more selected instructors are invalid.",
        });
      }
    }

    // Handle image upload
    let branchImagePath = getBranchFallbackImage(branchName);
    if (req.files && req.files.branchImage) {
      const uploadedFiles = await localFileUpload(req.files.branchImage, [
        "image/png",
        "image/jpeg",
        "image/jpg",
      ]);
      branchImagePath = uploadedFiles[0].path; // Store image path if uploaded
    }

    // Create the new branch
    const newBranch = await Branch.create({
      branchName,
      location,
      branchManager,
      branchAdminEmail,
      branchAdminContact,
      city,
      zone,
      status,
      branchTimings,
      branchOpenDays,
      branchCapacity,
      centreFacilities,
      teachers: teacherIds,
      branchImage: branchImagePath, // Save image path if uploaded
    });

    res.status(201).json({
      success: true,
      message: "Branch created successfully",
      branch: newBranch,
    });
});

// Get all Branches
exports.getAllBranches = asyncHandler(async (req, res) => {
    const branches = await Branch.find()
      .populate("branchManager", "name email")
      .populate("city", "cityName location")
      .populate({
        path: "courses",
        select: "name code description teacher price",
        populate: {
          path: "teacher",
          select: "userId",
          populate: { path: "userId", select: "name email" },
        },
      })
      .populate({
        path: "teachers",
        populate: [
          { path: "userId", select: "name email image" },
          {
            path: "teacherDetail",
            model: "TeacherApplication",
            select: "name profilePicture mode areaOfExpertise yearOfExperience highestQualification",
          },
        ],
      })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      branches,
    });
});

// Get branch by id
exports.getBranchById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const branch = await Branch.findById(id)
      .populate("branchManager", "name email phone")
      .populate("city", "cityName location")
      .populate({
        path: "courses",
        select: "name code description teacher price",
        populate: {
          path: "teacher",
          select: "userId",
          populate: { path: "userId", select: "name email" },
        },
      })
      .populate({
        path: "teachers",
        populate: [
          { path: "userId", select: "name email image" },
          {
            path: "teacherDetail",
            model: "TeacherApplication",
            select: "name profilePicture mode areaOfExpertise yearOfExperience highestQualification",
          },
        ],
      })
      .populate("centreFacilities")
      .select("-__v")
      .lean();

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found",
      });
    }

    res.status(200).json({
      success: true,
      branch,
    });
});

// Get Branch Managers
exports.getBranchManagers = asyncHandler(async (req, res) => {
    const managers = await User.find({ accountType: "admin" }).select(
      "_id name email"
    );

    res.status(200).json({
      success: true,
      managers,
    });
});

// Update Branch
exports.updateBranch = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const existingBranch = await Branch.findById(id);

    if (!existingBranch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found",
      });
    }

    let {
      branchName,
      location,
      branchManager,
      branchAdminEmail,
      branchAdminContact,
      city,
      zone,
      status,
      branchTimings,
      branchOpenDays,
      branchCapacity,
      centreFacilities,
      teachers,
    } = req.body;

    // Parse branchTimings and branchOpenDays if they are strings
    if (typeof branchTimings === "string")
      branchTimings = JSON.parse(branchTimings);
    if (typeof branchOpenDays === "string")
      branchOpenDays = JSON.parse(branchOpenDays);
    if (typeof branchCapacity === "string")
      branchCapacity = Number(branchCapacity);
    const teacherIds = parseOptionalArray(teachers);

    // Validate required fields
    if (
      !branchName ||
      !location ||
      !branchManager ||
      !branchAdminEmail ||
      !branchAdminContact ||
      !city ||
      !zone ||
      !status ||
      !branchTimings ||
      !branchOpenDays ||
      !Array.isArray(branchOpenDays) ||
      branchOpenDays.length === 0 ||
      branchCapacity === undefined ||
      isNaN(branchCapacity) ||
      !Array.isArray(branchTimings) ||
      branchTimings.length !== 2
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be filled and valid.",
      });
    }

    // Ensure status is valid
    const validStatuses = ["draft", "active"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value. Must be either 'draft' or 'active'.",
      });
    }

    if (!/^\d+$/.test(String(zone).trim())) {
      return res.status(400).json({
        success: false,
        message: "Zone must contain numbers only.",
      });
    }

    // Validate if branchManager exists
    const managerExists = await User.findById(branchManager);
    if (!managerExists) {
      return res.status(400).json({
        success: false,
        message: "Invalid branch manager. Manager does not exist.",
      });
    }

    // Validate city existence
    const cityExists = await City.findById(city);
    if (!cityExists) {
      return res.status(400).json({
        success: false,
        message: "Invalid city. City does not exist.",
      });
    }

    if (teacherIds.length > 0) {
      const teacherCount = await Teacher.countDocuments({ _id: { $in: teacherIds } });
      if (teacherCount !== teacherIds.length) {
        return res.status(400).json({
          success: false,
          message: "One or more selected instructors are invalid.",
        });
      }
    }

    // Handle image upload for update
    let branchImagePath = existingBranch.branchImage || null;
    if (req.files && req.files.branchImage) {
      const uploadedFiles = await localFileUpload(req.files.branchImage, [
        "image/png",
        "image/jpeg",
        "image/jpg",
      ]);
      branchImagePath = uploadedFiles[0].path; // Store image path if uploaded
    } else if (!branchImagePath) {
      branchImagePath = getBranchFallbackImage(branchName || existingBranch.branchName);
    }

    const updates = {
      branchName,
      location,
      branchManager,
      branchAdminEmail,
      branchAdminContact,
      city,
      zone,
      status,
      branchTimings,
      branchOpenDays,
      branchCapacity,
      centreFacilities,
      teachers: teacherIds,
    };

    updates.branchImage = branchImagePath;

    const updatedBranch = await Branch.findByIdAndUpdate(id, updates, {
      returnDocument: "after",
      runValidators: true, // run schema validators
    });

    res.status(200).json({
      success: true,
      message: "Branch updated successfully",
      branch: updatedBranch,
    });
});

// Delete Branch
exports.deleteBranch = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const deletedBranch = await Branch.findByIdAndDelete(id);

    if (!deletedBranch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Branch deleted successfully",
    });
});
