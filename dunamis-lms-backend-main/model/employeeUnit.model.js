const mongoose = require("mongoose");

// A business unit whose code prefixes employee IDs (DSM → DSMA001 / DSMB001 /
// DSMI001). The code is fixed once created: issued IDs embed it.
const employeeUnitSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      match: /^[A-Z]{3}$/,
    },
    name: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("EmployeeUnit", employeeUnitSchema);
