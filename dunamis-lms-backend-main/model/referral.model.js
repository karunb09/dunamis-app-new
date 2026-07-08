const mongoose = require("mongoose");

const referralSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    referrerType: {
      type: String,
      enum: ["employee", "freelancer"],
      required: true,
    },
    referrerUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
    referrerPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReferralPartner",
      default: null,
    },
    // Snapshot — referrer users can be hard-deleted, the listing must survive that.
    referrerName: {
      type: String,
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "student",
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "course",
      required: true,
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentTransaction",
      required: true,
      unique: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    rewardStatus: {
      type: String,
      enum: ["pending", "rewarded"],
      default: "pending",
      index: true,
    },
    rewardNote: {
      type: String,
      default: "",
    },
    rewardedAt: {
      type: Date,
      default: null,
    },
    rewardedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Referral", referralSchema);
