const mongoose = require("mongoose");

const slotSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "course",
      required: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
    },
    date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "teacher",
      required: true,
    },
    slotType: {
      type: String,
      enum: ["demo", "enrolled"],
      required: true,
    },
    sessionType: {
      type: String,
      enum: ["standard", "premium"],
      required: true,
    },
    recurringDays: [
      {
        type: String,
        enum: [
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
          "sunday",
        ],
      },
    ],
    isRecurring: { type: Boolean, default: false },
    maxStudents: {
      type: Number,
      default: function () {
        if (this.slotType === "demo") return 1;
        return this.sessionType === "standard" ? 4 : 1;
      },
    },
    currentStudentsCount: {
      type: Number,
      default: 0,
    },
    parentAvailabilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "teacher.weeklyAvailability",
    },
    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "student",
        default: [],
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Slot", slotSchema);
