const mongoose = require("mongoose");
const ChatbotConversation = require("../../model/chatbotConversation.model");
const ChatbotTurn = require("../../model/chatbotTurn.model");
const SiteContent = require("../../model/siteContent.model");
const { CORPUS } = require("./corpus");
const { invalidateKnowledge } = require("./knowledge");

const DAY_MS = 24 * 60 * 60 * 1000;
const sinceDays = (days) => new Date(Date.now() - days * DAY_MS);
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const KIND_MATCH = {
  unanswered: { matched: false, source: "text", "review.status": "open" },
  thumbsDown: { "feedback.rating": "down", "review.status": "open" },
  resolved: { "review.status": { $in: ["resolved", "ignored"] } },
};

async function getChatbotSummary({ days }) {
  const from = sinceDays(days);
  const [audiences, outcomes, turnStats, topIntents] = await Promise.all([
    ChatbotConversation.aggregate([
      { $match: { createdAt: { $gte: from } } },
      { $group: { _id: "$audience", count: { $sum: 1 } } },
    ]),
    ChatbotConversation.aggregate([
      { $match: { createdAt: { $gte: from }, outcome: { $in: ["demo", "callback"] } } },
      { $group: { _id: "$outcome", count: { $sum: 1 } } },
    ]),
    ChatbotTurn.aggregate([
      { $match: { createdAt: { $gte: from } } },
      {
        $group: {
          _id: null,
          questions: { $sum: { $cond: [{ $eq: ["$source", "text"] }, 1, 0] } },
          answered: {
            $sum: { $cond: [{ $and: [{ $eq: ["$source", "text"] }, "$matched"] }, 1, 0] },
          },
          thumbsUp: { $sum: { $cond: [{ $eq: ["$feedback.rating", "up"] }, 1, 0] } },
          thumbsDown: { $sum: { $cond: [{ $eq: ["$feedback.rating", "down"] }, 1, 0] } },
        },
      },
    ]),
    ChatbotTurn.aggregate([
      { $match: { createdAt: { $gte: from }, intent: { $ne: null } } },
      { $group: { _id: "$intent", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]),
  ]);

  const stats = turnStats[0] || { questions: 0, answered: 0, thumbsUp: 0, thumbsDown: 0 };
  const rated = stats.thumbsUp + stats.thumbsDown;
  const leadCount = (outcome) => outcomes.find((row) => row._id === outcome)?.count || 0;

  return {
    days,
    conversations: audiences.reduce((sum, row) => sum + row.count, 0),
    studentConversations: audiences.find((row) => row._id === "student")?.count || 0,
    questions: stats.questions,
    answered: stats.answered,
    answeredRate: stats.questions ? stats.answered / stats.questions : null,
    thumbsUp: stats.thumbsUp,
    thumbsDown: stats.thumbsDown,
    helpfulRate: rated ? stats.thumbsUp / rated : null,
    leads: { demo: leadCount("demo"), callback: leadCount("callback") },
    topIntents: topIntents.map((row) => ({ intent: row._id, count: row.count })),
  };
}

async function listReviewGroups({ kind, days, q, page, limit }) {
  const match = { ...KIND_MATCH[kind], createdAt: { $gte: sinceDays(days) }, normalizedText: { $ne: "" } };
  if (q) match.normalizedText = { $regex: escapeRegex(q.toLowerCase()) };

  const [result] = await ChatbotTurn.aggregate([
    { $match: match },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: "$normalizedText",
        count: { $sum: 1 },
        lastAskedAt: { $first: "$createdAt" },
        text: { $first: "$text" },
        audience: { $first: "$audience" },
        studentCount: { $sum: { $cond: [{ $eq: ["$audience", "student"] }, 1, 0] } },
        intent: { $first: "$intent" },
        score: { $first: "$score" },
        replyText: { $first: "$reply.text" },
        conversationId: { $first: "$conversationId" },
        status: { $first: "$review.status" },
        teachIntent: { $first: "$review.teachIntent" },
        faqId: { $first: "$review.faqId" },
        note: { $first: "$review.note" },
        resolvedAt: { $first: "$review.resolvedAt" },
        reasons: { $push: "$feedback.reason" },
        comments: { $push: "$feedback.comment" },
      },
    },
    { $sort: { count: -1, lastAskedAt: -1 } },
    {
      $facet: {
        total: [{ $count: "count" }],
        rows: [{ $skip: (page - 1) * limit }, { $limit: limit }],
      },
    },
  ]);

  const rows = (result?.rows || []).map(({ _id, reasons, comments, ...row }) => {
    const reasonCounts = {};
    for (const reason of reasons) if (reason) reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    return {
      ...row,
      normalizedText: _id,
      reasonCounts,
      comments: comments.filter(Boolean).slice(0, 5),
    };
  });

  const total = result?.total[0]?.count || 0;
  return { rows, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

async function getConversationTranscript(id) {
  const conversation = await ChatbotConversation.findById(id)
    .select("startPath audience createdAt lastActivityAt endedAt endReason outcome turnCount")
    .lean();
  if (!conversation) return null;
  const turns = await ChatbotTurn.find({ conversationId: conversation._id })
    .sort({ seq: 1 })
    .select("seq source text intent matched reply.text feedback createdAt")
    .lean();
  return { conversation, turns };
}

const httpError = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });

async function resolveReviewGroup({ normalizedText, kind, status, teachIntent, faqId, note, adminUserId }) {
  let intentToTeach = null;
  if (faqId) {
    const faq = await SiteContent.exists({ _id: faqId, type: "faq" });
    if (!faq) throw httpError("That FAQ no longer exists.", 404);
    intentToTeach = `faq.${faqId}`;
  } else if (teachIntent) {
    if (!CORPUS[teachIntent]) throw httpError("Pick one of the bot's existing answers.");
    intentToTeach = teachIntent;
  }
  if (intentToTeach && status !== "resolved") throw httpError("Teaching an answer resolves the question.");

  const update = {
    $set: {
      "review.status": status,
      "review.teachIntent": intentToTeach,
      "review.faqId": faqId ? new mongoose.Types.ObjectId(faqId) : null,
      "review.note": String(note || "").trim(),
      "review.resolvedBy": adminUserId || null,
      "review.resolvedAt": new Date(),
    },
  };
  if (intentToTeach) update.$unset = { expiresAt: "" };

  const { modifiedCount } = await ChatbotTurn.updateMany({ ...KIND_MATCH[kind], normalizedText }, update);
  if (intentToTeach && modifiedCount) invalidateKnowledge();
  return { updated: modifiedCount, teachIntent: intentToTeach };
}

module.exports = {
  getChatbotSummary,
  listReviewGroups,
  getConversationTranscript,
  resolveReviewGroup,
  TEACHABLE_INTENTS: Object.keys(CORPUS),
};
