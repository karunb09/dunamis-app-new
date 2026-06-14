const fs = require("fs");
const asyncHandler = require("../utils/asyncHandler");
const path = require("path");

const AdminNotice = require("../model/adminNotice.model");
const SiteContent = require("../model/siteContent.model");
const User = require("../model/user.model");

const allowedTypes = new Set(["faq", "testimonial", "successStory"]);
const allowedStatuses = new Set(["draft", "published"]);
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const maxImageSize = 2 * 1024 * 1024;
const uploadDir = path.join(__dirname, "../uploads/site-content");

const sanitizePayload = (body = {}) => {
  const type = String(body.type || "").trim();
  const youtubeUrl = String(body.youtubeUrl || body.subtitle || "").trim();

  return {
    type,
    title: String(body.title || "").trim(),
    subtitle:
      type === "successStory"
        ? youtubeUrl
        : String(body.subtitle || "").trim(),
    body: String(body.body || "").trim(),
    category: String(body.category || "").trim(),
    tag: String(body.tag || "").trim(),
    image: String(body.image || "").trim(),
    youtubeUrl,
    rating:
      body.rating === "" || body.rating === undefined || body.rating === null
        ? 5
        : Number(body.rating),
    displayDate: String(body.displayDate || "").trim(),
    status: String(body.status || "published").trim(),
    sortOrder:
      body.sortOrder === "" || body.sortOrder === undefined || body.sortOrder === null
        ? 0
        : Number(body.sortOrder),
  };
};

const getUploadedFile = (files, fieldName) => {
  const file = files?.[fieldName];
  return Array.isArray(file) ? file[0] : file;
};

const isYoutubeUrl = (value) =>
  /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(
    String(value || "").trim()
  );

const saveImageUpload = async (files = {}) => {
  const imageFile = getUploadedFile(files, "image");
  if (!imageFile) return "";

  if (imageFile.size > maxImageSize) {
    const error = new Error("Image must be 2MB or smaller.");
    error.statusCode = 400;
    throw error;
  }

  if (!allowedImageTypes.has(imageFile.mimetype)) {
    const error = new Error("Image must be a JPG, PNG, WebP, or GIF file.");
    error.statusCode = 400;
    throw error;
  }

  await fs.promises.mkdir(uploadDir, { recursive: true });

  const extension = path.extname(imageFile.name || "").toLowerCase() || ".jpg";
  const safeName = path
    .basename(imageFile.name || "image", extension)
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  const filename = `${Date.now()}-${safeName || "site-content"}${extension}`;
  const destination = path.join(uploadDir, filename);

  await imageFile.mv(destination);
  return `/uploads/site-content/${filename}`;
};

const validatePayload = (payload, partial = false) => {
  const errors = [];

  if (!partial || payload.type) {
    if (!allowedTypes.has(payload.type)) {
      errors.push("Type must be faq, testimonial, or successStory.");
    }
  }

  if (!partial || payload.title !== undefined) {
    if (!payload.title) {
      errors.push("Title is required.");
    }
  }

  if (!partial || payload.status) {
    if (!allowedStatuses.has(payload.status)) {
      errors.push("Status must be draft or published.");
    }
  }

  if (payload.rating !== undefined && Number.isNaN(payload.rating)) {
    errors.push("Rating must be a number.");
  }

  if (payload.sortOrder !== undefined && Number.isNaN(payload.sortOrder)) {
    errors.push("Sort order must be a number.");
  }

  if (payload.type === "successStory" && !isYoutubeUrl(payload.youtubeUrl)) {
    errors.push("A valid YouTube URL is required for success stories.");
  }

  return errors;
};

const buildFilter = (query = {}, publicOnly = false) => {
  const filter = {};
  const type = String(query.type || "").trim();

  if (type) {
    filter.type = type;
  }

  if (publicOnly) {
    filter.status = "published";
  } else if (query.status) {
    filter.status = String(query.status).trim();
  }

  return filter;
};

exports.getPublicContent = asyncHandler(async (req, res) => {
    const filter = buildFilter(req.query, true);

    if (filter.type && !allowedTypes.has(filter.type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid content type.",
      });
    }

    const items = await SiteContent.find(filter)
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, data: items });
});

exports.getAllContent = asyncHandler(async (req, res) => {
    const filter = buildFilter(req.query, false);

    if (filter.type && !allowedTypes.has(filter.type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid content type.",
      });
    }

    const items = await SiteContent.find(filter)
      .populate({ path: "createdBy", select: "name email" })
      .sort({ type: 1, sortOrder: 1, createdAt: -1 });

    res.status(200).json({ success: true, data: items });
});

exports.createContent = asyncHandler(async (req, res) => {
    const payload = sanitizePayload(req.body);
    const uploadedImage = await saveImageUpload(req.files);
    if (uploadedImage) {
      payload.image = uploadedImage;
    }

    const errors = validatePayload(payload);

    if (errors.length) {
      return res.status(400).json({ success: false, message: errors.join(" ") });
    }

    const item = await SiteContent.create({
      ...payload,
      createdBy: req.user?.userId || null,
      updatedBy: req.user?.userId || null,
    });

    res.status(201).json({ success: true, data: item });
});

exports.updateContent = asyncHandler(async (req, res) => {
    const payload = sanitizePayload(req.body);
    const uploadedImage = await saveImageUpload(req.files);
    if (uploadedImage) {
      payload.image = uploadedImage;
    }

    const errors = validatePayload(payload, true);

    if (errors.length) {
      return res.status(400).json({ success: false, message: errors.join(" ") });
    }

    const item = await SiteContent.findByIdAndUpdate(
      req.params.id,
      { ...payload, updatedBy: req.user?.userId || null },
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({ success: false, message: "Content not found." });
    }

    res.status(200).json({ success: true, data: item });
});

exports.createStudentFeedbackReview = asyncHandler(async (req, res) => {
    const userId = req.user?.userId;
    const [user, ratingCourse, ratingInstructor] = await Promise.all([
      User.findById(userId).select("name email image").lean(),
      Promise.resolve(Number(req.body.ratingCourse)),
      Promise.resolve(Number(req.body.ratingInstructor)),
    ]);

    if (!user) {
      return res.status(404).json({ success: false, message: "Student not found." });
    }

    if (!ratingCourse || !ratingInstructor) {
      return res.status(400).json({
        success: false,
        message: "Course and instructor ratings are required.",
      });
    }

    const firstName = user.name?.firstName || "";
    const lastName = user.name?.lastName || "";
    const displayName = `${firstName} ${lastName}`.trim() || user.email || "Student";
    const courseName = String(req.body.courseName || "Student feedback").trim();
    const comment = String(req.body.comment || "").trim();
    const averageRating = Math.round(((ratingCourse + ratingInstructor) / 2) * 10) / 10;

    const review = await SiteContent.create({
      type: "testimonial",
      title: displayName,
      subtitle: courseName,
      body:
        comment ||
        `Monthly feedback submitted with course rating ${ratingCourse}/5 and instructor rating ${ratingInstructor}/5.`,
      image: user.image || "",
      rating: averageRating,
      status: "draft",
      sortOrder: 0,
      source: "studentFeedback",
      createdBy: userId,
      updatedBy: userId,
    });

    await AdminNotice.create({
      title: "New student review draft",
      message: `${displayName} submitted monthly feedback. Review it in Website Content.`,
      creator: userId,
      targetUsers: "All Admins",
      notificationType: "Notification bars",
      contentType: "Social",
      modeOfUpdate: "Dashboard notification",
      status: "Sent",
    });

    res.status(201).json({ success: true, data: review });
});

exports.deleteContent = asyncHandler(async (req, res) => {
    const item = await SiteContent.findByIdAndDelete(req.params.id);

    if (!item) {
      return res.status(404).json({ success: false, message: "Content not found." });
    }

    res.status(200).json({ success: true, data: item });
});
