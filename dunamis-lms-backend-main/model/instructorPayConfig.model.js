const mongoose = require("mongoose");

// Singleton — the pay-run settings that are not per category. `key` is fixed so
// an upsert can never create a second row.
const instructorPayConfigSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "default",
      unique: true,
    },
    // Paid once per demo that converts to an enrollment.
    demoConversionAmount: {
      type: Number,
      default: 100,
      min: 0,
    },
    defaultSessionsPerMonth: {
      type: Number,
      default: 8,
      min: 1,
    },
    // Day of the following month the payout is due.
    payDueDayOfMonth: {
      type: Number,
      default: 7,
      min: 1,
      max: 28,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
  },
  { timestamps: true }
);

instructorPayConfigSchema.statics.load = function load() {
  return this.findOneAndUpdate(
    { key: "default" },
    { $setOnInsert: { key: "default" } },
    { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
  );
};

module.exports = mongoose.model("InstructorPayConfig", instructorPayConfigSchema);
