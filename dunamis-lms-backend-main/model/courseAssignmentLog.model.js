const mongoose = require("mongoose");

// Name snapshots keep the history readable after a course or instructor is deleted.
const courseAssignmentLogSchema = new mongoose.Schema(
  {
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
    action: { type: String, enum: ["assigned", "unassigned"], required: true },
    source: {
      type: String,
      enum: ["course_create", "course_edit", "course_delete", "course_request", "teacher_delete"],
      required: true,
    },
    courseName: String,
    teacherName: String,
    actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    actorEmail: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

courseAssignmentLogSchema.index({ courseId: 1, createdAt: -1 });
courseAssignmentLogSchema.index({ teacherId: 1, createdAt: -1 });

module.exports = mongoose.model("CourseAssignmentLog", courseAssignmentLogSchema);
