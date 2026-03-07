const mongoose = require("mongoose");

const branchSchema = new mongoose.Schema(
  {
    branchName: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
    },
    branchManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    branchAdminEmail: {
      type: String,
      required: true,
    },
    branchAdminContact: {
      type: String,
      required: true,
    },
    zone: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "City",
      required: true,
    },
    branchTimings: {
      type: [String],
      required: true,
      validate: {
        validator: function (v) {
          return v.length === 2;
        },
        message:
          "Branch timings should contain both opening and closing times.",
      },
    },
    branchOpenDays: {
      type: [String],
      required: true,
    },
    branchCapacity: {
      type: Number,
      required: true,
    },
    centreFacilities: {
      type: String,
      trim: true,
    },
    branchImage: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["draft", "active"],
      default: "draft",
    },
    courses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "course",
      },
    ],
    teachers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "teacher",
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Branch", branchSchema);
