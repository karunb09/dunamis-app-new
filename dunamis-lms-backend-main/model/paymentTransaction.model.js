const mongoose = require("mongoose");

const webhookEventSchema = new mongoose.Schema(
  {
    idempotencyKey: { type: String, default: null },
    type: { type: String, default: null },
    eventTime: { type: Date, default: null },
    paymentStatus: { type: String, default: null },
    receivedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const paymentTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "student",
      required: true,
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "course",
      required: true,
      index: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "teacher",
      required: true,
    },
    slotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Slot",
      required: true,
      index: true,
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
    sessionType: {
      type: String,
      enum: ["standard", "premium"],
      required: true,
    },
    planType: {
      type: String,
      enum: ["monthly", "full"],
      required: true,
    },
    paymentType: {
      type: String,
      enum: ["Installment", "Full"],
      required: true,
    },
    // Chosen fixed-duration plan in months (3 / 6 / 12). Null for legacy
    // transactions that predate tenure plans.
    planMonths: { type: Number, default: null },
    installmentNo: { type: Number, default: 1 },
    installmentTotal: { type: Number, default: 1 },
    installmentAmount: { type: Number, default: null },
    dueDate: { type: Date, default: null },
    amount: { type: Number, required: true, min: 1 },
    currency: { type: String, enum: ["INR"], default: "INR" },
    gateway: { type: String, enum: ["cashfree", "manual"], default: "cashfree" },
    merchantOrderId: { type: String, required: true, unique: true, index: true },
    cashfreeCfOrderId: { type: String, default: null },
    paymentSessionId: { type: String, default: null },
    cashfreePaymentId: { type: String, default: null, index: true },
    cashfreeOrderStatus: { type: String, default: null },
    cashfreePaymentStatus: { type: String, default: null },
    paymentMode: { type: String, default: null },
    bankReference: { type: String, default: null },
    status: {
      type: String,
      enum: [
        "created",
        "pending",
        "paid",
        "paid_pending_fulfillment",
        "fulfilled",
        "failed",
        "dropped",
        "expired",
        "refunded",
      ],
      default: "created",
      index: true,
    },
    feeStatus: { type: String, enum: ["Due", "Paid"], default: "Due" },
    idempotencyKey: { type: String, default: null },
    requestFingerprint: { type: String, default: null },
    webhookEventKeys: [{ type: String }],
    webhookEvents: [webhookEventSchema],
    gatewayResponse: { type: mongoose.Schema.Types.Mixed, default: null },
    lastError: { type: String, default: null },
    verifiedAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    fulfilledAt: { type: Date, default: null },
    notificationsSentAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

paymentTransactionSchema.index({
  studentId: 1,
  courseId: 1,
  slotId: 1,
  sessionType: 1,
  paymentType: 1,
  installmentNo: 1,
  status: 1,
});

module.exports = mongoose.model("PaymentTransaction", paymentTransactionSchema);
