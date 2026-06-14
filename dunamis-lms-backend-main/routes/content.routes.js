const express = require("express");
const router = express.Router();

const { isAuth, accessToRole } = require("../middleware/auth");
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

const adminOnly = [isAuth, accessToRole(["admin", "superadmin"])];

router.post("/create", ...adminOnly, createContent);
router.get("/get-all-content", ...adminOnly, getAllContent);
router.get("/:id", ...adminOnly, getContentById);
router.put("/:id", ...adminOnly, updateContent);
router.put("/:id/modules/:moduleId", ...adminOnly, updateModule);
router.put("/:id/modules/:moduleId/lessons/:lessonId", ...adminOnly, updateLesson);
router.put("/:id/modules/:moduleId/lessons/:lessonId/topics/:topicId", ...adminOnly, updateTopic);
router.delete("/:id", ...adminOnly, deleteContent);
router.post("/:id/add-module", ...adminOnly, addModuleToContent);
router.post("/:id/:moduleId/add-lesson", ...adminOnly, addLessonToModule);
router.post("/:id/:moduleId/:lessonId/add-topic", ...adminOnly, addTopicToLesson);

module.exports = router;
