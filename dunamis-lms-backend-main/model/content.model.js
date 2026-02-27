const mongoose = require("mongoose");

const topicSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      default: "No description provided."
    },
  },
  { timestamps: true }
);

const lessonSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true
    },
    topics: [topicSchema],
  },
  { timestamps: true }
);

const moduleSchema = new mongoose.Schema(
  {
    duration: {
      type: String,
      default: "Unknown"
    },
    title: {
      type: String,
      required: true
    },
    lessons: [lessonSchema],
  },
  { timestamps: true }
);

const contentSchema = new mongoose.Schema(
  {
    courseName: {
      type: String,
      required: true
    },
    courseCode: {
      type: String,
      required: true
    },
    courseDescription: {
      type: String,
      default: "No description provided."
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    subCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubCategory",
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
    modules: [moduleSchema],
  },
  { timestamps: true }
);

const Content = mongoose.model("Content", contentSchema);
module.exports = Content;
