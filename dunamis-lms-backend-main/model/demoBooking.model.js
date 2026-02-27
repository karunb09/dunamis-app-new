const mongoose = require("mongoose");

const demoBookingSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "student",
      required: true,
    },
    slotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Slot",
      required: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "course",
      required: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "teacher",
      required: true,
    },
    demoStatus: {
      type: String,
      enum: ["Booked", "Rescheduled", "Cancelled", "Attended", "Missed"],
      default: "Booked",
    },
    enrollmentStatus: {
      type: String,
      enum: ["Enrolled", "Not Enrolled"],
      default: "Not Enrolled",
    },
    followUp: {
      type: String,
      enum: ["Pending", "Contacted", "Closed"],
      default: "Pending",
    },
    response: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DemoBooking", demoBookingSchema);
