const express = require("express");
const router = express.Router();

const { isAuth, accessToRole } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { idParam } = require("../validators/common");
const {
  resolveConversationSchema,
  sendMessageSchema,
  listMessagesQuerySchema,
} = require("../validators/message.validator");
const {
  listConversations,
  listContacts,
  getUnreadCount,
  resolveConversation,
  listMessages,
  sendMessage,
  markRead,
} = require("../controller/message.controller");

// Admins get read access for moderation; only the two participants can post.
const participantsAndAdmins = accessToRole([
  "student",
  "teacher",
  "admin",
  "superadmin",
]);

router.get("/conversations", isAuth, participantsAndAdmins, listConversations);
router.get("/unread-count", isAuth, participantsAndAdmins, getUnreadCount);
router.get("/contacts", isAuth, participantsAndAdmins, listContacts);
router.post(
  "/conversations",
  isAuth,
  participantsAndAdmins,
  validate(resolveConversationSchema),
  resolveConversation
);
router.get(
  "/conversations/:id/messages",
  isAuth,
  participantsAndAdmins,
  validate(idParam, "params"),
  validate(listMessagesQuerySchema, "query"),
  listMessages
);
router.post(
  "/conversations/:id/messages",
  isAuth,
  participantsAndAdmins,
  validate(idParam, "params"),
  validate(sendMessageSchema),
  sendMessage
);
router.post(
  "/conversations/:id/read",
  isAuth,
  participantsAndAdmins,
  validate(idParam, "params"),
  markRead
);

module.exports = router;
