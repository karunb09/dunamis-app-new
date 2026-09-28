const express = require("express");
const router = express.Router();

const { isAuth, accessToRole, requirePermission } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { idParam } = require("../validators/common");
const {
  createContent,
  getAllContent,
  getContentById,
  updateContent,
  deleteContent,
  addModuleToContent,
  addLessonToModule,
  addTopicToLesson,
  updateModule,
  updateLesson,
  updateTopic,
} = require("../controller/content.controller");

const adminOnly = [isAuth, accessToRole(["admin", "superadmin"]), requirePermission("contentManagement")];
// Course forms read curriculum too.
const readers = [isAuth, accessToRole(["admin", "superadmin"]), requirePermission("contentManagement", "courseManagement")];

router.post("/create", ...adminOnly, createContent);
router.get("/get-all-content", ...readers, getAllContent);
router.get("/:id", ...readers, validate(idParam, "params"), getContentById);
router.put("/:id", ...adminOnly, validate(idParam, "params"), updateContent);
router.put("/:id/modules/:moduleId", ...adminOnly, updateModule);
router.put("/:id/modules/:moduleId/lessons/:lessonId", ...adminOnly, updateLesson);
router.put("/:id/modules/:moduleId/lessons/:lessonId/topics/:topicId", ...adminOnly, updateTopic);
router.delete("/:id", ...adminOnly, validate(idParam, "params"), deleteContent);
router.post("/:id/add-module", ...adminOnly, addModuleToContent);
router.post("/:id/:moduleId/add-lesson", ...adminOnly, addLessonToModule);
router.post("/:id/:moduleId/:lessonId/add-topic", ...adminOnly, addTopicToLesson);

module.exports = router;
