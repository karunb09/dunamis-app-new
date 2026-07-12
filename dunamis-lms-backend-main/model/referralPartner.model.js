const mongoose = require("mongoose");

const referralPartnerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      default: "",
    },
    email: {
      type: String,
      default: "",
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    area: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    // Optional student discount applied to the first payment only.
    // null type / 0 value = attribution-only code (no discount).
    discountType: {
      type: String,
      enum: ["percent", "flat", null],
      default: null,
    },
    discountValue: {
      type: Number,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ReferralPartner", referralPartnerSchema);
