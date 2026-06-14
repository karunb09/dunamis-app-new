const express = require("express");
const router = express.Router();

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

// Create Content
const { isAuth, accessToRole } = require("../middleware/auth");
const adminOnly = [isAuth, accessToRole(["admin", "superadmin"])];
router.post("/create", ...adminOnly, createContent);

// Get All Content
router.get("/get-all-content", getAllContent);

// Get Content by ID
router.get("/:id", getContentById);

// Update Content
router.put("/:id", ...adminOnly, updateContent);

// Update Module
router.put("/:id/modules/:moduleId", ...adminOnly, updateModule);

// Update Lesson
router.put("/:id/modules/:moduleId/lessons/:lessonId", ...adminOnly, updateLesson);

// Update Topic
router.put("/:id/modules/:moduleId/lessons/:lessonId/topics/:topicId", ...adminOnly, updateTopic);

// Delete Content
router.delete("/:id", ...adminOnly, deleteContent);

// ====Additional Methods==== //

// Add module to content
router.post("/:id/add-module", ...adminOnly, addModuleToContent);

// Add Lesson to module
router.post("/:id/:moduleId/add-lesson", ...adminOnly, addLessonToModule);

// Add topic to lesson
router.post("/:id/:moduleId/:lessonId/add-topic", ...adminOnly, addTopicToLesson);

module.exports = router;
