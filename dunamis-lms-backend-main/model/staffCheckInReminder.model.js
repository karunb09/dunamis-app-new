const mongoose = require("mongoose");

// One "you haven't checked in" email per person per day. Written before the
// email goes out, so a second tick or a second PM2 process can't send it again.
const staffCheckInReminderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    dayKey: { type: String, required: true },
  },
  { timestamps: true }
);

staffCheckInReminderSchema.index({ userId: 1, dayKey: 1 }, { unique: true });

module.exports = mongoose.model("StaffCheckInReminder", staffCheckInReminderSchema);
