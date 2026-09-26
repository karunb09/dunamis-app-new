const mongoose = require("mongoose");

// One thread per learner/instructor pair per course. Messages live in their own
// collection: a year of an active pair's chat would otherwise grow one document
// without bound.
const conversationSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "student",
      required: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "teacher",
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "course",
      required: true,
    },
    lastMessageAt: { type: Date, default: null },
    lastMessagePreview: { type: String, default: "" },
    lastSenderRole: { type: String, enum: ["student", "teacher", null], default: null },
    unread: {
      student: { type: Number, default: 0 },
      teacher: { type: Number, default: 0 },
    },
    status: { type: String, enum: ["open", "archived"], default: "open" },
  },
  { timestamps: true }
);

conversationSchema.index(
  { studentId: 1, teacherId: 1, courseId: 1 },
  { unique: true }
);
conversationSchema.index({ teacherId: 1, lastMessageAt: -1 });
conversationSchema.index({ studentId: 1, lastMessageAt: -1 });

module.exports = mongoose.model("Conversation", conversationSchema);
