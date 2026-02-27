const mongoose = require("mongoose");
const adminSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.ObjectId,
      ref: "user",
      required: true,
    },
    role: {
      type: String,
      required: true,
    },
    accessLevel: {
      type: String,
      enum: ["level 1", "level 2"],
      required: true,
    },
    department: {
      type: "String",
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
