const mongoose = require("mongoose");

const chatbotTurnSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatbotConversation",
      required: true,
    },
    seq: { type: Number, required: true },
    source: { type: String, enum: ["button", "text"], required: true },
    audience: { type: String, enum: ["guest", "student"], default: "guest" },
    text: { type: String, default: "" },
    normalizedText: { type: String, default: "" },
    intent: { type: String, default: null },
    score: { type: Number, default: 0 },
    matched: { type: Boolean, default: false },
    reply: {
      text: { type: String, default: "" },
      faqId: { type: mongoose.Schema.Types.ObjectId, default: null },
      courseIds: [{ type: mongoose.Schema.Types.ObjectId }],
      instructorIds: [{ type: mongoose.Schema.Types.ObjectId }],
    },
    feedback: {
      rating: { type: String, enum: ["up", "down", null], default: null },
      reason: {
        type: String,
        enum: ["wrong", "notUnderstood", "missingInfo", "other", null],
        default: null,
      },
      comment: { type: String, default: "" },
      at: { type: Date, default: null },
    },
    review: {
      status: {
        type: String,
        enum: ["open", "resolved", "ignored"],
        default: "open",
      },
      // A corpus intent name or "faq.<id>"; the phrase becomes training data.
      teachIntent: { type: String, default: null },
      faqId: { type: mongoose.Schema.Types.ObjectId, default: null },
      note: { type: String, default: "" },
      resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
      resolvedAt: { type: Date, default: null },
    },
    // Unset once a phrase is taught, so training data never expires.
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

chatbotTurnSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
chatbotTurnSchema.index({ conversationId: 1, seq: 1 });
chatbotTurnSchema.index({ "review.status": 1, matched: 1, createdAt: -1 });
chatbotTurnSchema.index(
  { "review.teachIntent": 1 },
  { partialFilterExpression: { "review.teachIntent": { $type: "string" } } }
);

module.exports = mongoose.model("ChatbotTurn", chatbotTurnSchema);
