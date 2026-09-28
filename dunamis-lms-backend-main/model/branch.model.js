const mongoose = require("mongoose");
const { DEFAULT_GEOFENCE_RADIUS_M } = require("../utils/geo");

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
    // Must belong to the same city as the branch.
    zone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Zone",
      required: true,
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
    // Pin for instructor check-in. Unset on branches nobody has pinned yet;
    // check-ins there are accepted but flagged as location-unverified.
    geo: {
      lat: { type: Number, min: -90, max: 90 },
      lng: { type: Number, min: -180, max: 180 },
    },
    geofenceRadiusM: {
      type: Number,
      min: 50,
      max: 2000,
      default: DEFAULT_GEOFENCE_RADIUS_M,
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
