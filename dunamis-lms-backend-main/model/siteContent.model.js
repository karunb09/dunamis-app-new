const mongoose = require("mongoose");

const contentTypes = ["faq", "testimonial", "successStory"];
const statuses = ["draft", "published"];

const siteContentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: contentTypes,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    subtitle: {
      type: String,
      trim: true,
      default: "",
    },
    body: {
      type: String,
      trim: true,
      default: "",
    },
    category: {
      type: String,
      trim: true,
      default: "",
    },
    tag: {
      type: String,
      trim: true,
      default: "",
    },
    image: {
      type: String,
      trim: true,
      default: "",
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 5,
    },
    displayDate: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: statuses,
      default: "published",
      index: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
  },
  { timestamps: true }
);

siteContentSchema.index({ type: 1, status: 1, sortOrder: 1, createdAt: -1 });

module.exports = mongoose.model("SiteContent", siteContentSchema);
