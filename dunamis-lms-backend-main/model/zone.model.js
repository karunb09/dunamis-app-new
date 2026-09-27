const mongoose = require("mongoose");

// A group of branches inside one city. Offline BDEs are responsible for zones
// (User.org.zones); a branch's zone must be in the branch's own city.
const zoneSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "City",
      required: true,
    },
  },
  { timestamps: true }
);

zoneSchema.index({ city: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Zone", zoneSchema);
