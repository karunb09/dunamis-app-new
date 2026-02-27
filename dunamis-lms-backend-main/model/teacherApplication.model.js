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
      required: true,
    },
    profileVideo: {
      type: String,
      required: true,
    },
    profilePicture: {
      type: String,
      required: true,
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
      enum: ["15 days", "1 month", "2 month", "3 month"],
      required: true,
    },
    availability: {
      type: String,
      enum: ["Weekends Only", "Week Days", "Flexible"],
      required: true,
    },
    mode: {
      type: String,
      enum: ["online", "offline"],
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
