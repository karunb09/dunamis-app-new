const Content = require("../model/content.model");
const SubCategory = require("../model/subCategory.model");

// Create Content
exports.createContent = async (req, res) => {
  try {
    const {
      courseName,
      courseCode,
      courseDescription,
      category,
      subCategory,
      modules,
    } = req.body;

    // If Already exist
    const existingSubCategory = await SubCategory.findById(subCategory); 
    if (!existingSubCategory) {
      return res.status(400).json({
        success: false,
        message: "SubCategory does not exist in the database.",
      });
    }

    const newContent = new Content({
      courseName,
      courseCode,
      courseDescription,
      category,
      subCategory,
      modules,
    });

    await newContent.save();

    res.status(201).json({
      success: true,
      message: "Content created successfully",
      content: newContent,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating content",
      error: error.message,
    });
  }
};

// Get All Content
exports.getAllContent = async (req, res) => {
  try {
    // const contents = await Content.find().sort({ createdAt: -1 });

    // bhai jo thik lage vo use kr lena aap apne end se
    const contents = await Content.find()
      .populate("category")
      .populate("subCategory")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, contents });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching contents",
      error: error.message,
    });
  }
};

// Get Content by ID
exports.getContentById = async (req, res) => {
  try {
    const { id } = req.params;
    const content = await Content.findById(id)
      .populate("category")
      .populate("subCategory");

    if (!content) {
      return res.status(404).json({
        success: false,
        message: "Content not found",
      });
    }

    res.status(200).json({ success: true, content });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching content",
      error: error.message,
    });
  }
};

// Update Content
exports.updateContent = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const content = await Content.findById(id);
    if (!content) {
      return res
        .status(404)
        .json({ success: false, message: "Content not found" });
    }

    // Update basic fields
    content.courseName = updates.courseName || content.courseName;
    content.courseCode = updates.courseCode || content.courseCode;
    content.courseDescription =
      updates.courseDescription || content.courseDescription;
    content.category = updates.category || content.category;
    content.subCategory = updates.subCategory || content.subCategory;
    content.status = updates.status || content.status;

    // Replace curriculum when the edit form sends the full modules array
    if (updates.modules && Array.isArray(updates.modules)) {
      content.modules = updates.modules;
    }

    // Add lessons to a specific module
    if (updates.addLessonToModule) {
      const { moduleIndex, lessons } = updates.addLessonToModule;
      if (
        typeof moduleIndex === "number" &&
        content.modules[moduleIndex] &&
        Array.isArray(lessons)
      ) {
        content.modules[moduleIndex].lessons.push(...lessons);
      } else {
        return res.status(400).json({
          success: false,
          message: "Invalid module index or lessons data.",
        });
      }
    }

    // Add topics to a specific lesson inside a module
    if (updates.addTopicToLesson) {
      const { moduleIndex, lessonIndex, topics } = updates.addTopicToLesson;
      if (
        typeof moduleIndex === "number" &&
        typeof lessonIndex === "number" &&
        content.modules[moduleIndex] &&
        content.modules[moduleIndex].lessons[lessonIndex] &&
        Array.isArray(topics)
      ) {
        content.modules[moduleIndex].lessons[lessonIndex].topics.push(
          ...topics
        );
      } else {
        return res.status(400).json({
          success: false,
          message: "Invalid module/lesson index or topics data.",
        });
      }
    }

    await content.save();

    res.status(200).json({
      success: true,
      message: "Content updated successfully",
      content,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update content",
      error: error.message,
    });
  }
};

// Update Module
exports.updateModule = async (req, res) => {
  try {
    const { id, moduleId } = req.params;
    const { title, duration } = req.body;

    const content = await Content.findById(id);
    if (!content) {
      return res
        .status(404)
        .json({ success: false, message: "Content not found" });
    }

    const module = content.modules.id(moduleId);
    if (!module) {
      return res
        .status(404)
        .json({ success: false, message: "Module not found" });
    }

    // Update module fields
    module.title = title || module.title;
    module.duration = duration || module.duration;

    await content.save();
    res.status(200).json({
      success: true,
      message: "Module updated successfully",
      content,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update module",
      error: error.message,
    });
  }
};

// Update Lesson
exports.updateLesson = async (req, res) => {
  try {
    const { id, moduleId, lessonId } = req.params;
    const { title, topics } = req.body;

    const content = await Content.findById(id);
    if (!content) {
      return res
        .status(404)
        .json({ success: false, message: "Content not found" });
    }

    const module = content.modules.id(moduleId);
    if (!module) {
      return res
        .status(404)
        .json({ success: false, message: "Module not found" });
    }

    const lesson = module.lessons.id(lessonId);
    if (!lesson) {
      return res
        .status(404)
        .json({ success: false, message: "Lesson not found" });
    }

    // Update lesson fields
    lesson.title = title || lesson.title;
    if (Array.isArray(topics)) {
      lesson.topics = topics;
    }

    await content.save();
    res.status(200).json({
      success: true,
      message: "Lesson updated successfully",
      content,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update lesson",
      error: error.message,
    });
  }
};

// Update Topic
exports.updateTopic = async (req, res) => {
  try {
    const { id, moduleId, lessonId, topicId } = req.params;
    const { title, description } = req.body;

    const content = await Content.findById(id);
    if (!content) {
      return res
        .status(404)
        .json({ success: false, message: "Content not found" });
    }

    const module = content.modules.id(moduleId);
    if (!module) {
      return res
        .status(404)
        .json({ success: false, message: "Module not found" });
    }

    const lesson = module.lessons.id(lessonId);
    if (!lesson) {
      return res
        .status(404)
        .json({ success: false, message: "Lesson not found" });
    }

    const topic = lesson.topics.id(topicId);
    if (!topic) {
      return res
        .status(404)
        .json({ success: false, message: "Topic not found" });
    }

    // Update topic fields
    topic.title = title || topic.title;
    topic.description = description || topic.description;

    await content.save();
    res.status(200).json({
      success: true,
      message: "Topic updated successfully",
      content,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update topic",
      error: error.message,
    });
  }
};

// Delete Content
exports.deleteContent = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedContent = await Content.findByIdAndDelete(id);

    if (!deletedContent) {
      return res
        .status(404)
        .json({ success: false, message: "Content not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Content deleted successfully" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting content",
      error: error.message,
    });
  }
};

// ====Additional methods==== //

// Add Module to Content
exports.addModuleToContent = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, duration, lessons } = req.body;

    const content = await Content.findById(id);
    if (!content) {
      return res
        .status(404)
        .json({ success: false, message: "Content not found" });
    }

    const newModule = { title, duration, lessons: lessons || [] };
    content.modules.push(newModule);

    await content.save();
    res.status(200).json({
      success: true,
      message: "Module added successfully",
      content,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to add module",
      error: error.message,
    });
  }
};

// Add Lesson to Module
exports.addLessonToModule = async (req, res) => {
  try {
    const { id, moduleId } = req.params;
    const { title, topics } = req.body;

    const content = await Content.findById(id);
    if (!content) {
      return res
        .status(404)
        .json({ success: false, message: "Content not found" });
    }

    const module = content.modules.id(moduleId);
    if (!module) {
      return res
        .status(404)
        .json({ success: false, message: "Module not found" });
    }

    const newLesson = { title, topics: topics || [] };
    module.lessons.push(newLesson);

    await content.save();
    res.status(200).json({
      success: true,
      message: "Lesson added successfully",
      content,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to add lesson",
      error: error.message,
    });
  }
};

// Add Topic to Lesson
exports.addTopicToLesson = async (req, res) => {
  try {
    const { id, moduleId, lessonId } = req.params;
    const { title, description } = req.body;

    const content = await Content.findById(id);
    if (!content) {
      return res
        .status(404)
        .json({ success: false, message: "Content not found" });
    }

    const module = content.modules.id(moduleId);
    if (!module) {
      return res
        .status(404)
        .json({ success: false, message: "Module not found" });
    }

    const lesson = module.lessons.id(lessonId);
    if (!lesson) {
      return res
        .status(404)
        .json({ success: false, message: "Lesson not found" });
    }

    const newTopic = { title, description };
    lesson.topics.push(newTopic);

    await content.save();
    res.status(200).json({
      success: true,
      message: "Topic added successfully",
      content,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to add topic",
      error: error.message,
    });
  }
};
