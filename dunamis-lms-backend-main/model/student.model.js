const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    assignment: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Assignment",
        default: null,
      },
    ],
    age: {
      type: Number,
      default: null,
    },
    followUps: {
      followUp1: {
        type: String,
        enum: ["pending", "complete"],
        default: "pending",
      },
      followUp2: {
        type: String,
        enum: ["pending", "complete"],
        default: "pending",
      },
      followUp3: {
        type: String,
        enum: ["pending", "complete"],
        default: "pending",
      },
    },
    adminActions: {
      isBlocked: { type: Boolean, default: false },
      isReported: { type: Boolean, default: false },
      isDisabled: { type: Boolean, default: false },
      isArchived: { type: Boolean, default: false },
    },
    enrolledCourses: [
      {
        courseId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "course",
          required: true,
        },
        slotId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Teacher.weeklyAvailability",
          // required: true,
        },
        progress: {
          type: Number,
          default: 0,
        },
        status: {
          type: String,
          enum: ["in-progress", "completed"],
          default: "in-progress",
        },
        completedAt: {
          type: Date,
          default: null,
        },
        joinedAt: {
          type: Date,
          default: null,
        },
      },
    ],
    demoCourse: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DemoBooking",
        default: null,
      },
    ],
    mode: {
      type: String,
      enum: ["online", "offline"],
      default: "online",
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
    },
    payments: [
      {
        courseId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "course",
        },
        razorpayOrderId: {
          type: String,
        },
        razorpayPaymentId: {
          type: String,
        },
        razorpaySignature: {
          type: String,
        },
        amount: {
          type: Number,
        },
        PaymentStatus: {
          type: String,
          enum: ["pending", "completed", "failed"],
          default: "pending",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        sessionType: {
          type: String,
          enum: ["standard", "premium"],
        },
        paymentType: {
          type: String,
          enum: ["Installment", "Full"],
        },
        installmentNo: {
          // how many installments already paid
          type: Number,
          default: 0,
        },
        installmentTotal: {
          // total installments expected for this payment plan
          type: Number,
          default: 1,
        },
        installmentAmount: {
          type: Number,
          default: null,
        },
        dueDate: {
          type: Date,
          required: function () {
            return this.paymentType === "Installment";
          },
        },
        paymentMode: {
          type: String,
          enum: [
            "UPI",
            "Debit Card",
            "Credit Card",
            "Net Banking",
            "Other",
            null,
          ],
          default: null,
        },
        transactionId: {
          type: String,
          default: null,
        },
        paidAt: {
          type: Date,
          default: null,
        },
        feeStatus: {
          type: String,
          enum: ["Due", "Paid"],
          default: "Due",
        },
      },
    ],
  },
  { timestamps: true }
);

// Custom JSON Output (order-controlled)
studentSchema.set("toJSON", {
  transform: function (doc, ret) {
    return {
      _id: ret._id,
      userId: ret.userId,
      age: ret.age,
      mode: ret.mode,
      branch: ret.branch,
      demoCourse: ret.demoCourse,
      enrolledCourses: ret.enrolledCourses,
      assignment: ret.assignment,
      followUps: ret.followUps,
      adminActions: ret.adminActions,
      payments: ret.payments,
      createdAt: ret.createdAt,
      updatedAt: ret.updatedAt,
    };
  },
});

module.exports = mongoose.model("student", studentSchema);