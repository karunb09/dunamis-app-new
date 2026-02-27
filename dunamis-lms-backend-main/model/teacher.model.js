const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.ObjectId,
      ref: "user",
      required: true,
    },
    teacherDetail: {
      type: mongoose.Schema.ObjectId,
      ref: "TeacherApplication",
      required: true,
    },
    course: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "course",
      },
    ],
    students: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "student",
        default: [],
      },
    ],
    bankDetails: {
      accountHolderName: {
        type: String,
        trim: true,
      },
      accountNumber: {
        type: String,
        trim: true,
      },
      ifscCode: {
        type: String,
        trim: true,
      },
      bankName: {
        type: String,
        trim: true,
      },
      branchAddress: {
        type: String,
        trim: true,
      },
    },
    isBankDetailsSubmitted: {
      type: Boolean,
      default: false,
    },
    salaryStatus: {
      type: String,
      enum: ["paid", "due"],
      default: "due",
    },
    studentCount: {
      type: Number,
      default: 0,
    },
    averageRating: {
      type: Number,
      min: 1,
      max: 5,
      default: 0,
    },
    weeklyAvailability: [
      {
        days: [
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
            required: true,
          },
        ],
        startTime: { type: String, required: true },
        endTime: { type: String, required: true },
        sessionType: {
          type: String,
          enum: ["standard", "premium"],
          required: true,
        },
        slotType: {
          type: String,
          enum: ["demo", "enrolled"],
          required: true,
        },
        courseId: { type: mongoose.Schema.Types.ObjectId, ref: "course" },
        branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch" },
        maxStudents: {
          type: Number,
          default: function () {
            return this.sessionType === "standard" ? 4 : 1;
          },
        },
        students: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "student",
            default: [],
          },
        ],
      },
    ],
  },
  { timestamps: true }
);

teacherSchema.virtual("remunerations", {
  ref: "Remuneration",
  localField: "_id",
  foreignField: "teacherId",
});

teacherSchema.set("toObject", { virtuals: true });
teacherSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("teacher", teacherSchema);
