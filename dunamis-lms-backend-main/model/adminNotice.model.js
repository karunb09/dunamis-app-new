const mongoose = require("mongoose");

const adminNoticeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    targetUsers: {
      type: String,
      enum: ["All", "All Students", "All Admins", "Specific Users"],
      required: [true, "Please select a target group"],
    },
    specificUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        default: null,
      },
    ],
    notificationType: {
      type: String,
      enum: ["Banners", "Modal windows", "Notification bars"],
      required: [true, "Please select a notification type"],
    },
    contentType: {
      type: String,
      enum: [
        "Informational",
        "Promotional",
        "Reminder",
        "Transactional",
        "Social",
        "Recurrent",
      ],
      required: [true, "Please select a content type"],
    },
    modeOfUpdate: {
      type: String,
      enum: ["Email notification", "Dashboard notification", "Both"],
      required: [true, "Please select a delivery mode"],
    },
    attachments: [
      {
        type: String,
      },
    ],
    status: {
      type: String,
      enum: ["Draft", "Sent"],
      default: "Sent",
    },
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
      },
    ],
    deletedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
      },
    ],
    sentAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("adminNotice", adminNoticeSchema);
