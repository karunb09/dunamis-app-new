const SiteContent = require("../model/siteContent.model");

const allowedTypes = new Set(["faq", "testimonial", "successStory"]);
const allowedStatuses = new Set(["draft", "published"]);

const sanitizePayload = (body = {}) => ({
  type: String(body.type || "").trim(),
  title: String(body.title || "").trim(),
  subtitle: String(body.subtitle || "").trim(),
  body: String(body.body || "").trim(),
  category: String(body.category || "").trim(),
  tag: String(body.tag || "").trim(),
  image: String(body.image || "").trim(),
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
});

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

exports.getPublicContent = async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllContent = async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createContent = async (req, res) => {
  try {
    const payload = sanitizePayload(req.body);
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
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateContent = async (req, res) => {
  try {
    const payload = sanitizePayload(req.body);
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
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteContent = async (req, res) => {
  try {
    const item = await SiteContent.findByIdAndDelete(req.params.id);

    if (!item) {
      return res.status(404).json({ success: false, message: "Content not found." });
    }

    res.status(200).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
