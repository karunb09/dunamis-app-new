const express = require("express");
const router = express.Router();

const { isAuth, accessToRole } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { idParam } = require("../validators/common");
const {
  questionnaireBodySchema,
  questionnaireUpdateSchema,
  questionnaireListQuerySchema,
} = require("../validators/questionnaire.validator");
const {
  listQuestionnaires,
  getQuestionnaire,
  createQuestionnaire,
  updateQuestionnaire,
  duplicateQuestionnaire,
  deleteQuestionnaire,
} = require("../controller/questionnaire.controller");

// Instructors own their library; admins get read access for support.
const teacherOrAdmin = accessToRole(["teacher", "admin", "superadmin"]);
const teacherOnly = accessToRole(["teacher"]);

router.get(
  "/",
  isAuth,
  teacherOrAdmin,
  validate(questionnaireListQuerySchema, "query"),
  listQuestionnaires
);
router.post(
  "/",
  isAuth,
  teacherOnly,
  validate(questionnaireBodySchema),
  createQuestionnaire
);
router.get(
  "/:id",
  isAuth,
  teacherOrAdmin,
  validate(idParam, "params"),
  getQuestionnaire
);
router.put(
  "/:id",
  isAuth,
  teacherOnly,
  validate(idParam, "params"),
  validate(questionnaireUpdateSchema),
  updateQuestionnaire
);
router.post(
  "/:id/duplicate",
  isAuth,
  teacherOnly,
  validate(idParam, "params"),
  duplicateQuestionnaire
);
router.delete(
  "/:id",
  isAuth,
  teacherOnly,
  validate(idParam, "params"),
  deleteQuestionnaire
);

module.exports = router;
