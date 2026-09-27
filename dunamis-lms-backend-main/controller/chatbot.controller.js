const asyncHandler = require("../utils/asyncHandler");
const { handleChatTurn } = require("../services/chatbot");
const { recordFeedback } = require("../services/chatbot/feedback");
const {
  getChatbotSummary,
  listReviewGroups,
  getConversationTranscript,
  resolveReviewGroup,
  TEACHABLE_INTENTS,
} = require("../services/chatbot/insights");

exports.postMessage = asyncHandler(async (req, res) => {
  const data = await handleChatTurn(req.body);
  res.status(200).json({ success: true, data });
});

exports.postStudentMessage = asyncHandler(async (req, res) => {
  const data = await handleChatTurn({ ...req.body, viewer: { userId: req.user.userId } });
  res.status(200).json({ success: true, data });
});

exports.postFeedback = asyncHandler(async (req, res) => {
  const turn = await recordFeedback(req.body);
  if (!turn) {
    return res.status(404).json({ success: false, message: "That message is no longer available." });
  }
  res.status(200).json({ success: true });
});

exports.getSummary = asyncHandler(async (req, res) => {
  const data = await getChatbotSummary(req.validated.query);
  res.status(200).json({ success: true, data: { ...data, teachableIntents: TEACHABLE_INTENTS } });
});

exports.listGroups = asyncHandler(async (req, res) => {
  const data = await listReviewGroups(req.validated.query);
  res.status(200).json({ success: true, data });
});

exports.getConversation = asyncHandler(async (req, res) => {
  const data = await getConversationTranscript(req.validated.params.id);
  if (!data) {
    return res.status(404).json({ success: false, message: "Conversation not found." });
  }
  res.status(200).json({ success: true, data });
});

exports.resolveGroup = asyncHandler(async (req, res) => {
  const data = await resolveReviewGroup({ ...req.body, adminUserId: req.user.userId });
  res.status(200).json({ success: true, data });
});
