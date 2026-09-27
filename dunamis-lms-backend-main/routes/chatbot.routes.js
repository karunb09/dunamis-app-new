const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const {
  postMessage,
  postStudentMessage,
  postFeedback,
  getSummary,
  listGroups,
  getConversation,
  resolveGroup,
} = require("../controller/chatbot.controller");
const { isAuth, accessToRole, requirePermission } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { idParam } = require("../validators/common");
const {
  chatMessageSchema,
  chatFeedbackSchema,
  chatSummaryQuerySchema,
  chatGroupsQuerySchema,
  chatResolveSchema,
} = require("../validators/chatbot.validator");

// Feature flag: the assistant is off unless CHATBOT_ENABLED=true. The website
// asks /status before showing the widget, so this one switch hides it too.
// Insights stay readable while it is off.
const chatbotEnabled = () => process.env.CHATBOT_ENABLED === "true";
const whenEnabled = (req, res, next) =>
  chatbotEnabled()
    ? next()
    : res.status(404).json({ success: false, message: "The chat assistant is switched off." });

router.get("/status", (req, res) => res.status(200).json({ success: true, enabled: chatbotEnabled() }));

// Public - website chat widget
router.post("/message", whenEnabled, validate(chatMessageSchema), postMessage);
router.post("/feedback", whenEnabled, validate(chatFeedbackSchema), postFeedback);

// Logged-in students arrive through the website BFF, so every request shares the
// Next server's IP; this limit is keyed by account instead.
const studentChatLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 40 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `chat:${req.user.userId}`,
  message: { success: false, message: "You're sending messages too quickly. Please wait a minute." },
});

router.post(
  "/student/message",
  whenEnabled,
  isAuth,
  accessToRole(["student"]),
  studentChatLimiter,
  validate(chatMessageSchema),
  postStudentMessage
);

const adminOnly = [isAuth, accessToRole(["admin", "superadmin"]), requirePermission("contentManagement")];

router.get("/admin/summary", ...adminOnly, validate(chatSummaryQuerySchema, "query"), getSummary);
router.get("/admin/groups", ...adminOnly, validate(chatGroupsQuerySchema, "query"), listGroups);
router.get("/admin/conversations/:id", ...adminOnly, validate(idParam, "params"), getConversation);
router.patch("/admin/groups/resolve", ...adminOnly, validate(chatResolveSchema), resolveGroup);

module.exports = router;
