const mongoose = require("mongoose");

const cronRunSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    schedule: String,
    intervalHours: { type: Number, default: 24 },
    lastRunAt: Date,
    lastStatus: { type: String, enum: ["success", "error"] },
    lastError: String,
    lastDurationMs: Number,
  },
  { timestamps: true }
);

module.exports = mongoose.model("CronRun", cronRunSchema);
