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
  },
  { timestamps: true }
);
module.exports = mongoose.model("admin", adminSchema);
