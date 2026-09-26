const mongoose = require("mongoose");

const chatbotConversationSchema = new mongoose.Schema(
  {
    // Random UUID handed to the visitor; it is their only credential for the
    // chat, so the ObjectId never leaves the server.
    publicId: { type: String, required: true, unique: true },
    // Set for logged-in students; a chat is only ever continued by the same viewer.
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    audience: { type: String, enum: ["guest", "student"], default: "guest" },
    startPath: { type: String, default: "" },
    lastActivityAt: { type: Date, default: Date.now },
    endedAt: { type: Date, default: null },
    endReason: {
      type: String,
      enum: ["visitor", "completed", "restarted", null],
      default: null,
    },
    outcome: { type: String, enum: ["demo", "callback", null], default: null },
    turnCount: { type: Number, default: 0 },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

chatbotConversationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
chatbotConversationSchema.index({ createdAt: -1 });

module.exports = mongoose.model("ChatbotConversation", chatbotConversationSchema);
