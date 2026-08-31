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
        enum: ["pending", "contacted", "completed"],
        default: "pending",
      },
      followUp2: {
        type: String,
        enum: ["pending", "contacted", "completed"],
        default: "pending",
      },
      followUp3: {
        type: String,
        enum: ["pending", "contacted", "completed"],
        default: "pending",
      },
      response: {
        type: String,
        default: "",
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
          ref: "Slot",
          // required: true,
        },
        progress: {
          type: Number,
          default: 0,
        },
        // "paused" freezes billing and drops the student off future classes
        // while holding their seat; "discontinued" is terminal and releases it.
        status: {
          type: String,
          enum: ["in-progress", "completed", "paused", "discontinued"],
          default: "in-progress",
        },
        completedAt: {
          type: Date,
          default: null,
        },
        pausedAt: {
          type: Date,
          default: null,
        },
        // Optional: what the admin expects the student to come back. Advisory
        // only — resuming is always a deliberate admin action.
        pausedUntil: {
          type: Date,
          default: null,
        },
        pauseReason: {
          type: String,
          default: "",
        },
        resumedAt: {
          type: Date,
          default: null,
        },
        discontinuedAt: {
          type: Date,
          default: null,
        },
        discontinuedReason: {
          type: String,
          default: "",
        },
        lifecycleActorId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "user",
          default: null,
        },
        joinedAt: {
          type: Date,
          default: null,
        },
        // false once an admin reassigns this enrollment to a new
        // course/instructor — the row stays for history, but is no longer
        // the student's current class. New reassignments push a fresh entry
        // rather than mutating this one in place.
        active: {
          type: Boolean,
          default: true,
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
      enum: ["online", "offline", "hybrid"],
      default: "online",
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
    },
    reassignmentHistory: [
      {
        fromCourseId: { type: mongoose.Schema.Types.ObjectId, ref: "course" },
        toCourseId: { type: mongoose.Schema.Types.ObjectId, ref: "course" },
        fromTeacherId: { type: mongoose.Schema.Types.ObjectId, ref: "teacher" },
        toTeacherId: { type: mongoose.Schema.Types.ObjectId, ref: "teacher" },
        fromSlotId: { type: mongoose.Schema.Types.ObjectId, ref: "Slot" },
        toSlotId: { type: mongoose.Schema.Types.ObjectId, ref: "Slot" },
        reassignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
        reassignedAt: { type: Date, default: Date.now },
      },
    ],
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
        paymentGateway: {
          type: String,
          enum: ["cashfree", "razorpay", "manual", null],
          default: null,
        },
        transactionRef: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "PaymentTransaction",
          default: null,
        },
        cashfreeOrderId: {
          type: String,
        },
        cashfreeCfOrderId: {
          type: String,
        },
        cashfreePaymentSessionId: {
          type: String,
        },
        cashfreePaymentId: {
          type: String,
        },
        cashfreeOrderStatus: {
          type: String,
        },
        cashfreePaymentStatus: {
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
        teacherId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "teacher",
          default: null,
        },
        slotId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Slot",
          default: null,
        },
        parentAvailabilityId: {
          type: mongoose.Schema.Types.ObjectId,
          default: null,
        },
        branchId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Branch",
          default: null,
        },
        deliveryMode: {
          type: String,
          enum: ["online", "offline", null],
          default: null,
        },
        planType: {
          type: String,
          enum: ["monthly", "full", null],
          default: null,
        },
        // Name of the custom offer bought, snapshotted for the receipt list.
        // Display only — never read by billing logic.
        planLabel: {
          type: String,
          default: null,
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
        // The tenure the learner chose (3/6/12). Diverges from installmentTotal
        // once a running course rolls past its tenure, so the renewal order has
        // to price off this rather than the installment count.
        planMonths: {
          type: Number,
          default: null,
        },
        // Snapshotted from the course. Running courses roll month-to-month past
        // the tenure instead of ending at installmentTotal.
        courseType: {
          type: String,
          enum: ["fixed", "running"],
          default: "fixed",
        },
        termMonths: {
          type: Number,
          default: null,
        },
        dueDate: {
          type: Date,
          // Only a *pending* installment must know when the next payment falls
          // due. The final installment of a fixed course is written with
          // dueDate null by design (getNextInstallmentDueDate returns null once
          // the ladder ends), so requiring it for every installment made those
          // rows fail full-document validation. Nothing noticed while payments
          // were written with updateOne/$push, which skips validators — but any
          // save() on the student then failed on a row it never touched.
          required: function () {
            return (
              this.paymentType === "Installment" &&
              this.monthlyPaymentStatus === "pending"
            );
          },
        },
        // Every due-date change an admin makes, and why. The due date itself is
        // otherwise written only by the fulfillment path.
        dueDateAdjustments: [
          {
            _id: false,
            at: { type: Date, default: Date.now },
            byUserId: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
            fromDate: { type: Date, default: null },
            toDate: { type: Date, default: null },
            days: { type: Number, default: 0 },
            reason: { type: String, default: "" },
          },
        ],
        // Set when an enrollment is discontinued with money still outstanding,
        // so the row leaves the dues queue without pretending it was paid.
        writtenOffAt: {
          type: Date,
          default: null,
        },
        writtenOffReason: {
          type: String,
          default: "",
        },
        reminderSentAt: {
          type: Date,
          default: null,
        },
        overdueNoticeSentAt: {
          type: Date,
          default: null,
        },
        paymentMode: {
          type: String,
          enum: [
            "UPI",
            "Debit Card",
            "Credit Card",
            "Net Banking",
            "Cash",
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
        monthlyPaymentStatus: {
          type: String,
          enum: ["pending", "completed", null],
          default: null,
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
      reassignmentHistory: ret.reassignmentHistory,
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
