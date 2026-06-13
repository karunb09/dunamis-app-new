const mongoose = require("mongoose");

const teacherApplicationSchema = new mongoose.Schema(
  {
    name: {
      firstName: {
        type: String,
        required: true,
      },
      lastName: {
        type: String,
        required: true,
      },
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },
    language: {
      read: [
        {
          type: String,
          required: true,
        },
      ],
      speak: [
        {
          type: String,
          required: true,
        },
      ],
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    source: {
      type: String,
      enum: ["application", "admin"],
      default: "application",
    },
    mobileNo: {
      type: Number,
      required: true,
    },
    currentState: {
      type: String,
      required: true,
    },
    currentCity: {
      type: String,
      required: true,
    },
    currentAddress: {
      type: String,
      required: true,
    },
    areaOfExpertise: {
      type: String,
      required: true,
    },
    yearOfExperience: {
      type: Number,
      required: true,
    },
    highestQualification: {
      type: String,
      required: true,
    },
    relevantCertificate: {
      type: String,
    },
    cv: {
      type: String,
      required: function () {
        return this.source !== "admin";
      },
    },
    profileVideo: {
      type: String,
      required: function () {
        return this.source !== "admin";
      },
    },
    profilePicture: {
      type: String,
      required: function () {
        return this.source !== "admin";
      },
    },
    currentCTC: {
      type: String,
      required: true,
    },
    expectedCTC: {
      type: String,
      required: true,
    },
    noticePeriod: {
      type: String,
      trim: true,
      required: true,
    },
    availability: {
      type: String,
      enum: ["Weekends Only", "Week Days", "Flexible"],
      required: true,
    },
    mode: {
      type: String,
      enum: ["online", "offline", "hybrid"],
      required: true,
    },
    status: {
      type: String,
      enum: ["new", "shortlisted", "rejected", "interviewed", "selected"],
      required: true,
      default: "new",
    },
    specilization: {
      type: String,
    },
    notes: [
      {
        content: String,
        addedAt: Date,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("TeacherApplication", teacherApplicationSchema);
