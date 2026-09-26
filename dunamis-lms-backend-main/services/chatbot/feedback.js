const ChatbotConversation = require("../../model/chatbotConversation.model");
const ChatbotTurn = require("../../model/chatbotTurn.model");
const { redact } = require("./text");

// The conversation's random publicId is the only thing that authorises a rating.
async function recordFeedback({ conversationId, turnId, rating, reason, comment }) {
  const conversation = await ChatbotConversation.findOne({ publicId: conversationId }).select("_id").lean();
  if (!conversation) return null;

  const isDown = rating === "down";
  return ChatbotTurn.findOneAndUpdate(
    { _id: turnId, conversationId: conversation._id },
    {
      $set: {
        feedback: {
          rating,
          reason: isDown ? reason || null : null,
          comment: isDown ? redact(comment).slice(0, 300) : "",
          at: new Date(),
        },
      },
    },
    { returnDocument: "after" }
  ).lean();
}

module.exports = { recordFeedback };
