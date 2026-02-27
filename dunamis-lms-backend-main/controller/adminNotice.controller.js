const AdminNotice = require("../model/adminNotice.model");
const User = require("../model/user.model");
const { localFileUpload } = require("../utils/locallyUploader");
const mailSender = require("../utils/mailSender");
const path = require("path");
const fs = require("fs");

//  Create a new notice
exports.createNotice = async (req, res) => {
  try {
    const {
      title,
      message,
      targetUsers,
      specificUsers,
      notificationType,
      contentType,
      modeOfUpdate,
    } = req.body;

    // Validate required fields
    if (!title || !message || !targetUsers) {
      return res.status(400).json({
        success: false,
        message: "Title, message, and target users are required",
      });
    }

    // Handle attachments (optional)
    let attachments = [];

    if (req.files && req.files.attachments) {
      const files = Array.isArray(req.files.attachments)
        ? req.files.attachments
        : [req.files.attachments];

      const uploadedFiles = await localFileUpload(files, [
        "image/png",
        "image/jpeg",
        "image/jpg",
        "application/pdf",
      ]);

      attachments = uploadedFiles.map((f) => f.path);
    }

    let validUserIds = [];
    if (targetUsers === "Specific Users") {
      if (!specificUsers || specificUsers.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Please select at least one specific user",
        });
      }

      let userIdsArray = [];
      try {
        if (typeof specificUsers === "string") {
          if (specificUsers.trim().startsWith("[")) {
            userIdsArray = JSON.parse(specificUsers);
          } else {
            userIdsArray = specificUsers.split(",").map((id) => id.trim());
          }
        } else if (Array.isArray(specificUsers)) {
          userIdsArray = specificUsers;
        } else {
          throw new Error("Invalid specificUsers format");
        }
      } catch (err) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid format for specificUsers. Must be an array or comma-separated IDs.",
        });
      }

      const usersFound = await User.find({ _id: { $in: userIdsArray } });
      validUserIds = usersFound.map((u) => u._id);

      if (validUserIds.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No valid users found for the provided IDs",
        });
      }
    }

    // Create the notice
    const notice = await AdminNotice.create({
      title,
      message,
      targetUsers,
      notificationType,
      contentType,
      modeOfUpdate,
      attachments,
      specificUsers: validUserIds,
      creator: req.user?.userId, //  fixed here
    });

    //  Response
    res.status(201).json({
      success: true,
      message: "Admin notice created successfully",
      data: notice,
    });
  } catch (error) {
    console.error("Error creating notice:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error while creating notice",
    });
  }
};

//  Get all notices
exports.getAllNotices = async (req, res) => {
  try {
    const notices = await AdminNotice.find()
      .populate("creator", "name email image")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: notices.length,
      notices,
    });
  } catch (error) {
    console.error("Error fetching notices:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

//  Get a single notice by ID
exports.getNoticeById = async (req, res) => {
  try {
    const notice = await AdminNotice.findById(req.params.id).populate(
      "creator",
      "name email"
    );

    if (!notice)
      return res
        .status(404)
        .json({ success: false, message: "Notice not found" });

    res.status(200).json({ success: true, notice });
  } catch (error) {
    console.error("Error fetching notice:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

//  Update a notice
exports.updateNotice = async (req, res) => {
  try {
    const notice = await AdminNotice.findById(req.params.id);

    if (!notice)
      return res
        .status(404)
        .json({ success: false, message: "Notice not found" });

    const {
      title,
      message,
      targetUsers,
      specificUsers,
      notificationType,
      contentType,
      modeOfUpdate,
      replaceAttachments,
    } = req.body;

    // Validate non-empty title/message
    if (title && !title.trim())
      return res
        .status(400)
        .json({ success: false, message: "Title cannot be empty" });
    if (message && !message.trim())
      return res
        .status(400)
        .json({ success: false, message: "Message cannot be empty" });

    const invalidSelections = [
      "Select group",
      "Select type",
      "Select mode",
      "",
      null,
    ];
    if (targetUsers && invalidSelections.includes(targetUsers))
      return res.status(400).json({ message: "Invalid targetUsers value" });
    if (notificationType && invalidSelections.includes(notificationType))
      return res
        .status(400)
        .json({ message: "Invalid notificationType value" });
    if (contentType && invalidSelections.includes(contentType))
      return res.status(400).json({ message: "Invalid contentType value" });
    if (modeOfUpdate && invalidSelections.includes(modeOfUpdate))
      return res.status(400).json({ message: "Invalid modeOfUpdate value" });

    // Handle Specific Users
    let validUserIds = notice.specificUsers || [];
    if (targetUsers === "Specific Users" && specificUsers?.length > 0) {
      let userIdsArray = [];
      if (typeof specificUsers === "string") {
        userIdsArray = specificUsers.trim().startsWith("[")
          ? JSON.parse(specificUsers)
          : specificUsers.split(",").map((id) => id.trim());
      } else if (Array.isArray(specificUsers)) {
        userIdsArray = specificUsers;
      }

      const usersFound = await User.find({ _id: { $in: userIdsArray } });
      if (usersFound.length !== userIdsArray.length) {
        return res.status(400).json({
          message: "Some specific users do not exist in the database",
        });
      }
      validUserIds = userIdsArray;
    }

    if (req.files && req.files.attachments) {
      const files = Array.isArray(req.files.attachments)
        ? req.files.attachments
        : [req.files.attachments];

      const uploadedFiles = await localFileUpload(files, [
        "image/png",
        "image/jpeg",
        "image/jpg",
        "application/pdf",
        "video/mp4",
        "video/mkv",
      ]);

      if (replaceAttachments === "true" || replaceAttachments === true) {
        // Replace old attachments
        notice.attachments = uploadedFiles.map((f) => f.path);
      } else {
        // Append new attachments
        notice.attachments = [
          ...(notice.attachments || []),
          ...uploadedFiles.map((f) => f.path),
        ];
      }
    }

    // Update notice fields
    if (title) notice.title = title.trim();
    if (message) notice.message = message.trim();
    if (targetUsers) notice.targetUsers = targetUsers;
    notice.specificUsers = validUserIds;
    if (notificationType) notice.notificationType = notificationType;
    if (contentType) notice.contentType = contentType;
    if (modeOfUpdate) notice.modeOfUpdate = modeOfUpdate;

    await notice.save();
    await notice.populate({ path: "creator", select: "name email" });

    res.status(200).json({
      success: true,
      message: "Notice updated successfully",
      notice,
    });
  } catch (error) {
    console.error("Error updating notice:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

//  Delete a notice
exports.deleteNotice = async (req, res) => {
  try {
    const notice = await AdminNotice.findByIdAndDelete(req.params.id);

    if (!notice)
      return res
        .status(404)
        .json({ success: false, message: "Notice not found" });

    res
      .status(200)
      .json({ success: true, message: "Notice deleted successfully" });
  } catch (error) {
    console.error("Error deleting notice:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark notice as Sent
exports.sendNotice = async (req, res) => {
  try {
    const notice = await AdminNotice.findById(req.params.id);

    if (!notice)
      return res
        .status(404)
        .json({ success: false, message: "Notice not found" });

    let users = [];
    switch (notice.targetUsers) {
      case "All":
        users = await User.find({});
        break;
      case "All Students":
        users = await User.find({ accountType: "student" });
        break;
      case "All Admins":
        users = await User.find({ accountType: "admin" });
        break;
      case "Specific Users":
        users = await User.find({ _id: { $in: notice.specificUsers } });
        break;
      default:
        users = [];
    }
    // Track failed emails
    const failedEmails = [];

    // Send notifications
    for (const user of users) {
      const emailAttachments = notice.attachments
        ?.map((filePath) => {
          const cleanPath = filePath.startsWith("/")
            ? filePath.slice(1)
            : filePath;
          const absolutePath = path.join(__dirname, "..", cleanPath);

          if (!fs.existsSync(absolutePath)) {
            console.warn(`Attachment missing: ${absolutePath}`);
            return null;
          }

          return { filename: path.basename(filePath), path: absolutePath };
        })
        .filter(Boolean);
      // Email
      if (
        notice.modeOfUpdate === "Email notification" ||
        notice.modeOfUpdate === "Both"
      ) {
        try {
          await mailSender(
            user.email,
            notice.title,
            notice.message,
            emailAttachments
          );
        } catch (error) {
          console.error(
            `Failed to send email to ${user.email}:`,
            failedEmails.push(user.email)
          );
        }
      }

      // Dashboard
      if (
        notice.modeOfUpdate === "Dashboard notification" ||
        notice.modeOfUpdate === "Both"
      ) {
        user.notices = user.notices || [];
        if (!user.notices.includes(notice._id)) {
          user.notices.push(notice._id);
          await user.save();
        }
      }
    }

    // Update notice status
    notice.status = "Sent";
    notice.sentAt = new Date();
    await notice.save();

    res.status(200).json({
      success: true,
      message: `Notice sent to ${users.length} users successfully`,
      notice,
      failedEmails: failedEmails.length > 0 ? failedEmails : undefined,
    });
  } catch (error) {
    console.error("Error sending notice:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
