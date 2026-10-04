const mongoose = require("mongoose");

const { adminNoteSchema, fixSchema } = require("./checkInSchemas");

const { ObjectId } = mongoose.Schema.Types;

const coveredClassSchema = new mongoose.Schema(
  {
    slotId: { type: ObjectId, ref: "Slot", required: true },
    courseName: { type: String, default: "" },
    slotType: { type: String, default: "" },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
  },
  { _id: false }
);

// One visit to one branch: check-in on arrival, check-out on leaving. Flags are
// computed at the moment of each tap and stored, so a later schedule change can
// never rewrite a record that pay will be worked out from.
const instructorCheckInSchema = new mongoose.Schema(
  {
    teacherId: { type: ObjectId, ref: "teacher", required: true },
    branchId: { type: ObjectId, ref: "Branch", required: true },
    // IST calendar day of the check-in, YYYY-MM-DD.
    dayKey: { type: String, required: true },
    // "unclosed": superseded by a check-in elsewhere before this one was closed.
    status: { type: String, enum: ["open", "closed", "unclosed"], default: "open" },
    checkIn: { type: fixSchema, required: true },
    checkOut: { type: fixSchema, default: null },
    classes: [coveredClassSchema],
    firstClassStartAt: { type: Date, default: null },
    lastClassEndAt: { type: Date, default: null },
    // Drives the forgot-to-check-out reminder: the last class end at check-in
    // time, or a stand-in when no class was scheduled.
    expectedCheckOutAt: { type: Date, required: true },
    flags: {
      lateCheckIn: { type: Boolean, default: false },
      lateByMinutes: { type: Number, default: 0 },
      earlyCheckOut: { type: Boolean, default: false },
      earlyByMinutes: { type: Number, default: 0 },
      lateCheckOut: { type: Boolean, default: false },
      noScheduledClass: { type: Boolean, default: false },
      locationUnverified: { type: Boolean, default: false },
    },
    checkoutReminderSentAt: { type: Date, default: null },
    adminNotes: [adminNoteSchema],
  },
  { timestamps: true }
);

instructorCheckInSchema.index({ teacherId: 1, dayKey: 1 });
instructorCheckInSchema.index({ dayKey: 1, branchId: 1 });
// At most one open visit per instructor, enforced by Mongo so a double tap or
// two devices can't both open one.
instructorCheckInSchema.index(
  { teacherId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "open" },
    name: "one_open_visit_per_teacher",
  }
);

module.exports = mongoose.model("InstructorCheckIn", instructorCheckInSchema);
