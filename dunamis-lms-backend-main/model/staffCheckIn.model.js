const mongoose = require("mongoose");

const { adminNoteSchema, fixSchema } = require("./checkInSchemas");

const { ObjectId } = mongoose.Schema.Types;

// One AA/BDE visit to one branch. Late login and early logout are judged per
// day (first check-in against opening, last check-out against closing), so the
// branch's hours for that day are snapshotted here: a later edit to the branch
// can never change a past day's result.
const staffCheckInSchema = new mongoose.Schema(
  {
    userId: { type: ObjectId, ref: "user", required: true },
    branchId: { type: ObjectId, ref: "Branch", required: true },
    // IST calendar day of the check-in, YYYY-MM-DD.
    dayKey: { type: String, required: true },
    // "unclosed": superseded by a check-in elsewhere before this one was closed.
    status: { type: String, enum: ["open", "closed", "unclosed"], default: "open" },
    checkIn: { type: fixSchema, required: true },
    checkOut: { type: fixSchema, default: null },
    // Null when the branch's timing string can't be read.
    branchOpensAt: { type: Date, default: null },
    branchClosesAt: { type: Date, default: null },
    branchClosedToday: { type: Boolean, default: false },
    expectedCheckOutAt: { type: Date, required: true },
    flags: {
      lateCheckOut: { type: Boolean, default: false },
      locationUnverified: { type: Boolean, default: false },
    },
    checkoutReminderSentAt: { type: Date, default: null },
    adminNotes: [adminNoteSchema],
  },
  { timestamps: true }
);

staffCheckInSchema.index({ userId: 1, dayKey: 1 });
staffCheckInSchema.index({ dayKey: 1, branchId: 1 });
staffCheckInSchema.index(
  { userId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "open" },
    name: "one_open_visit_per_staff",
  }
);

module.exports = mongoose.model("StaffCheckIn", staffCheckInSchema);
