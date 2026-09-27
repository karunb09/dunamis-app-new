const mongoose = require("mongoose");

// An admin's override of one COMMUNICATION_MATRIX row (utils/communicationMatrix.js).
// Only rows someone changed exist; the code defaults apply to the rest.
const communicationRuleSchema = new mongoose.Schema(
  {
    event: { type: String, required: true, unique: true },
    learner: { type: Boolean, required: true },
    instructor: { type: Boolean, required: true },
    aa: { type: Boolean, required: true },
    bde: { type: Boolean, required: true },
    channel: { type: String, enum: ["email", "notification"], required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CommunicationRule", communicationRuleSchema);
