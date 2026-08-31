const mongoose = require("mongoose");

// Append-only trail of who moved or cancelled a demo, and from where.
const demoHistorySchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    action: {
      type: String,
      enum: ["rescheduled", "cancelled", "reassigned"],
      required: true,
    },
    actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    actorRole: { type: String, default: null },
    fromSlotId: { type: mongoose.Schema.Types.ObjectId, ref: "Slot", default: null },
    toSlotId: { type: mongoose.Schema.Types.ObjectId, ref: "Slot", default: null },
    fromTeacherId: { type: mongoose.Schema.Types.ObjectId, ref: "teacher", default: null },
    toTeacherId: { type: mongoose.Schema.Types.ObjectId, ref: "teacher", default: null },
    reason: { type: String, default: "" },
  },
  { _id: false }
);

const demoBookingSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "student",
      default: null,
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
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
    },
    deliveryMode: {
      type: String,
      enum: ["online", "offline"],
      default: "online",
    },
    lead: {
      firstName: {
        type: String,
        trim: true,
        default: "",
      },
      lastName: {
        type: String,
        trim: true,
        default: "",
      },
      phone: {
        type: String,
        trim: true,
        default: "",
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
        default: "",
      },
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
    // Stamped when demoStatus first becomes "Attended" / enrollmentStatus
    // first becomes "Enrolled" — used for monthly insights conversion rates.
    attendedAt: {
      type: Date,
      default: null,
    },
    convertedAt: {
      type: Date,
      default: null,
    },
    meetingLink: {
      type: String,
      trim: true,
      default: "",
    },
    meetingLinkUpdatedAt: {
      type: Date,
      default: null,
    },
    meetingLinkSetBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
    joinReminderSentAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
    cancelReason: {
      type: String,
      trim: true,
      default: "",
    },
    history: [demoHistorySchema],
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

// Backs the per-slot capacity count that keeps two people off one demo slot.
demoBookingSchema.index({ slotId: 1, demoStatus: 1 });

module.exports = mongoose.model("DemoBooking", demoBookingSchema);
