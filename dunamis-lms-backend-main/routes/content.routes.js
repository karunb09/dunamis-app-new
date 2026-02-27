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
router.post("/create", createContent);

// Get All Content
router.get("/get-all-content", getAllContent);

// Get Content by ID
router.get("/:id", getContentById);

// Update Content
router.put("/:id", updateContent);

// Update Module
router.put("/:id/modules/:moduleId", updateModule);

// Update Lesson
router.put("/:id/modules/:moduleId/lessons/:lessonId", updateLesson);

// Update Topic
router.put("/:id/modules/:moduleId/lessons/:lessonId/topics/:topicId", updateTopic);

// Delete Content
router.delete("/:id", deleteContent);

// ====Additional Methods==== //

// Add module to content
router.post("/:id/add-module", addModuleToContent);

// Add Lesson to module
router.post("/:id/:moduleId/add-lesson", addLessonToModule);

// Add topic to lesson
router.post("/:id/:moduleId/:lessonId/add-topic", addTopicToLesson);

module.exports = router;
