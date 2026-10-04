const mongoose = require("mongoose");

const { ObjectId } = mongoose.Schema.Types;

// One location reading. `at` is always server time; the device clock is kept
// only for audit, since the person checking in controls it.
const fixSchema = new mongoose.Schema(
  {
    at: { type: Date, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    accuracyM: { type: Number, required: true },
    // Both null when the branch had no pin to measure against.
    distanceM: { type: Number, default: null },
    withinRadius: { type: Boolean, default: null },
    // Check-out only: accepted outside the radius because the late window was open.
    offSite: { type: Boolean, default: false },
    deviceTime: { type: Date, default: null },
    userAgent: { type: String, default: "" },
  },
  { _id: false }
);

// Append-only. A correction sits beside the record and never replaces it.
const adminNoteSchema = new mongoose.Schema(
  {
    note: { type: String, required: true, trim: true },
    correctedCheckOutAt: { type: Date, default: null },
    by: { type: ObjectId, ref: "user", required: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

module.exports = { adminNoteSchema, fixSchema };
