const { randomUUID } = require("crypto");
const ChatbotConversation = require("../../model/chatbotConversation.model");
const ChatbotTurn = require("../../model/chatbotTurn.model");
const { TEACHING_LANGUAGES } = require("../../constants/languages");
const { getKnowledge } = require("./knowledge");
const { classify } = require("./nlp");
const { buildReply, endReply, loginPromptReply } = require("./replies");
const { buildStudentReply } = require("./studentReplies");
const { redact, normalize } = require("./text");

const RETENTION_MS = 180 * 24 * 60 * 60 * 1000;
const expiry = () => new Date(Date.now() + RETENTION_MS);

const LOOKUP = {
  courseId: "courseById",
  cityId: "cityById",
  branchId: "branchById",
  instructorId: "instructorById",
  categoryId: "categoryById",
};

// Merges this turn's names with the context the client echoed back. Every id
// is checked against the public snapshot, so a client can't smuggle in a draft.
function resolveScope(entities, context, knowledge) {
  const scope = {};
  const isValid = (key, id) => Boolean(id) && knowledge[LOOKUP[key]].has(String(id));

  for (const key of Object.keys(LOOKUP)) {
    if (isValid(key, entities[key])) scope[key] = String(entities[key]);
  }

  const topic = !scope.courseId && knowledge.topicById.get(String(entities.topicId || ""));
  if (topic) {
    const courseIds = topic.courseIds.filter((id) => knowledge.courseById.has(id));
    if (courseIds.length === 1) scope.courseId = courseIds[0];
    else if (courseIds.length > 1) {
      scope.topicId = topic.id;
      scope.topicCourseIds = courseIds;
    }
  }

  if (TEACHING_LANGUAGES.includes(entities.language)) scope.language = entities.language;

  scope.freshCourse = Boolean(scope.courseId);
  scope.freshCity = Boolean(scope.cityId);

  for (const key of Object.keys(LOOKUP)) {
    if (scope[key] || !isValid(key, context?.[key])) continue;
    if (key === "courseId" && scope.topicCourseIds) continue;
    scope[key] = String(context[key]);
  }

  const instructor = knowledge.instructorById.get(scope.instructorId);
  if (instructor && scope.freshCourse && !entities.instructorId && !instructor.courseIds.includes(scope.courseId)) {
    delete scope.instructorId;
  }
  return scope;
}

// A bare name ("piano", "Priya") is a question about that thing.
function inferIntent(entities) {
  if (entities.instructorId) return "instructor.info";
  if (entities.courseId || entities.topicId) return "course.info";
  if (entities.branchId) return "branch.timings";
  if (entities.cityId) return "branches.inCity";
  if (entities.categoryId) return "courses.byCategory";
  if (entities.language) return "course.languages";
  return null;
}

const PERSONAL_PLACEHOLDER = "[personal answer]";

// viewer is { userId } for a logged-in student and null for a guest.
async function handleChatTurn({ conversationId, text, action, context, pagePath, viewer = null }) {
  const isEnd = action?.intent === "chat.end";

  let conversation = conversationId
    ? await ChatbotConversation.findOne({ publicId: conversationId })
    : null;
  // A guest chat is never continued as a student's, nor one student's by another.
  if (conversation && String(conversation.userId || "") !== String(viewer?.userId || "")) {
    conversation = null;
  }

  if (isEnd && (!conversation || conversation.endedAt)) {
    return { conversationId: null, turnId: null, ended: true, context: {}, reply: endReply(action) };
  }

  if (!conversation || conversation.endedAt) {
    conversation = new ChatbotConversation({
      publicId: randomUUID(),
      startPath: String(pagePath || "").slice(0, 200),
      userId: viewer?.userId || null,
      audience: viewer ? "student" : "guest",
      expiresAt: expiry(),
    });
  }

  const knowledge = await getKnowledge();

  let intent;
  let score = 1;
  let entities;
  let source;
  if (action) {
    source = "button";
    intent = action.intent;
    entities = action;
  } else {
    source = "text";
    const classified = await classify(text, knowledge);
    entities = classified.entities;
    score = classified.score;
    intent = classified.intent || inferIntent(entities);
  }

  const scope = { ...resolveScope(entities, context, knowledge), viewer };
  let built;
  if (!intent?.startsWith("me.")) built = buildReply(intent, scope, knowledge, action);
  else if (viewer) built = await buildStudentReply(intent, scope, viewer);
  else built = loginPromptReply(intent, scope);

  const now = new Date();
  if (isEnd) {
    conversation.endedAt = now;
    conversation.endReason = action.reason || "visitor";
    conversation.outcome = action.outcome || null;
  }
  conversation.turnCount += 1;
  conversation.lastActivityAt = now;
  await conversation.save();

  const shownText = redact(source === "button" ? action.label || intent : text).slice(0, 300);
  const turn = await ChatbotTurn.create({
    conversationId: conversation._id,
    seq: conversation.turnCount,
    source,
    audience: conversation.audience,
    text: shownText,
    normalizedText: normalize(shownText),
    intent: built.matched ? built.intent : null,
    score,
    matched: built.matched,
    reply: {
      // A student's own classes and dues stay out of the review log.
      text: built.personal ? PERSONAL_PLACEHOLDER : built.reply.text.slice(0, 1000),
      faqId: built.faqId || null,
      courseIds: built.reply.courses.map((course) => course.id),
      instructorIds: built.reply.instructors.map((instructor) => instructor.id),
    },
    expiresAt: expiry(),
  });

  return {
    conversationId: conversation.publicId,
    turnId: String(turn._id),
    ended: Boolean(conversation.endedAt),
    context: built.context,
    reply: built.reply,
  };
}

module.exports = { handleChatTurn };
