const mongoose = require("mongoose");

const citySchema = new mongoose.Schema(
  {
    cityName: { type: String, required: true },
    location: { type: String, default: "" },
    cityManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    cityAdminContact: { type: String, required: true },
    cityAdminEmail: { type: String, required: true },
    parentCity: { type: mongoose.Schema.Types.ObjectId, ref: "City" },
    isDraft: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("City", citySchema);
