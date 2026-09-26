const mongoose = require("mongoose");

// Snapshot of one recurring-class schedule, as it stands and as requested.
const scheduleSnapshotSchema = new mongoose.Schema(
  {
    days: [{ type: String }],
    startTime: { type: String, default: "" },
    endTime: { type: String, default: "" },
    sessionType: { type: String, default: "" },
    slotType: { type: String, default: "enrolled" },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", default: null },
    maxStudents: { type: Number, default: null },
  },
  { _id: false }
);

// An instructor's request to move or drop a recurring class that has enrolled
// learners. The change is not written to Teacher.weeklyAvailability until an
// admin approves it, so learners never lose their class silently.
const scheduleChangeRequestSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "teacher",
      required: true,
      index: true,
    },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "course", required: true },
    parentAvailabilityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    rosterId: { type: mongoose.Schema.Types.ObjectId, ref: "ClassRoster", default: null },
    changeType: { type: String, enum: ["reschedule", "remove"], required: true },
    current: { type: scheduleSnapshotSchema, required: true },
    // Absent for a removal request.
    requested: { type: scheduleSnapshotSchema, default: null },
    affectedStudentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "student" }],
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    teacherNote: { type: String, default: "" },
    adminNote: { type: String, default: "" },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// One open request per class, so an instructor cannot queue conflicting moves.
scheduleChangeRequestSchema.index(
  { parentAvailabilityId: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);

module.exports = mongoose.model("ScheduleChangeRequest", scheduleChangeRequestSchema);
