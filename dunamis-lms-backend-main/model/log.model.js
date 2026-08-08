const mongoose = require("mongoose");

const mailLogSchema = new mongoose.Schema(
  {
    to: { type: String, required: true },
    subject: String,
    status: { type: String, enum: ["sent", "failed"], required: true },
    error: String,
  },
  { timestamps: true }
);

mailLogSchema.index({ to: 1, createdAt: -1 });

module.exports = mongoose.model("MailLog", mailLogSchema);
