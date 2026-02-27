const mongoose = require("mongoose");
const zoneSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    adminContact: {
      type: Number,
      required: true,
    },
    adminEmail: {
      type: String,
      required: true,
    },
    city: {
      type: [mongoose.Schema.Types.ObjectId], 
      ref: "City",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Zone", zoneSchema);
