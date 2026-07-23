const mongoose = require("mongoose");
const { getMaxStudents } = require("../utils/slotCapacity");

// Durable membership of a student in a recurring class. Keyed by the teacher's
// weeklyAvailability template (`parentAvailabilityId`), which is the stable
// identity of the recurring class. Dated Slot docs are disposable calendar
// instances populated from this roster at generation time.
const rosterMemberSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "student",
      required: true,
    },
    enrolledAt: { type: Date, default: Date.now },
    transactionRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentTransaction",
      default: null,
    },
    status: { type: String, enum: ["active", "removed"], default: "active" },
  },
  { _id: false }
);

const classRosterSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "teacher",
      required: true,
      index: true,
    },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "course", required: true },
    // The weeklyAvailability subdocument _id — the recurring class identity.
    parentAvailabilityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
      index: true,
    },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", default: null },
    deliveryMode: { type: String, default: null },
    sessionType: { type: String, enum: ["standard", "premium"], required: true },
    // Schedule snapshot so schedule display survives availability edits that
    // could otherwise change the template.
    recurringDays: [{ type: String }],
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    maxStudents: {
      type: Number,
      default: function () {
        return getMaxStudents({
          slotType: "enrolled",
          sessionType: this.sessionType,
          branchId: this.branchId,
        });
      },
    },
    students: [rosterMemberSchema],
    status: { type: String, enum: ["active", "archived"], default: "active" },
  },
  { timestamps: true }
);

// Active members only — used for slot propagation and capacity checks.
classRosterSchema.methods.activeStudentIds = function activeStudentIds() {
  return (this.students || [])
    .filter((member) => member.status === "active")
    .map((member) => member.studentId);
};

module.exports = mongoose.model("ClassRoster", classRosterSchema);
