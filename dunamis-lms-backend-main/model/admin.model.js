const mongoose = require("mongoose");
const adminSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.ObjectId,
      ref: "user",
      required: true,
    },
    // Free-text job title ("Tele Caller", "Branch Manager"). Where someone
    // sits in the org chart lives on User.org.
    role: {
      type: String,
      required: true,
    },
    permission: [
      {
        type: String,
        required: true,
      },
    ],
    // HR details. Personal data: returned by GET /admin/:id and the admin's
    // own profile only — never in lists, the session, or public routes.
    dateOfJoining: { type: Date },
    dateOfBirth: { type: Date },
    emergencyContact: {
      name: { type: String, trim: true },
      relation: { type: String, trim: true },
      phone: { type: String, trim: true },
    },
    address: { type: String, trim: true },
  },
  { timestamps: true }
);
module.exports = mongoose.model("admin", adminSchema);
