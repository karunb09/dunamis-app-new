const Enquiry = require("../model/enquiry.model");

// 1. Create Enquiry (from website contact form)
exports.createEnquiry = async (req, res) => {
  try {
    const name = req.body?.name?.trim();
    const email = req.body?.email?.trim().toLowerCase();
    const subject = req.body?.subject?.trim();
    const message = req.body?.message?.trim();

    const errors = [];

    if (!name) {
      errors.push({ field: "name", message: "Name is required" });
    }

    if (!email) {
      errors.push({ field: "email", message: "Email is required" });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({ field: "email", message: "Enter a valid email address" });
    }

    if (!subject) {
      errors.push({ field: "subject", message: "Subject is required" });
    } else if (subject.length < 3) {
      errors.push({
        field: "subject",
        message: "Subject must be at least 3 characters",
      });
    }

    if (!message) {
      errors.push({ field: "message", message: "Message is required" });
    } else if (message.length < 10) {
      errors.push({
        field: "message",
        message: "Message must be at least 10 characters",
      });
    }

    if (errors.length) {
      return res.status(400).json({
        success: false,
        message: "Please fix the highlighted fields",
        errors,
      });
    }

    const enquiry = await Enquiry.create({ name, email, subject, message });

    res.status(201).json({
      success: true,
      message: "Enquiry created successfully",
      enquiry,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Get All Enquiries
exports.getAllEnquiries = async (req, res) => {
  try {
    const enquiries = await Enquiry.find()
      .populate({
        path: "assignedTo",
        select: "role userId",
        populate: {
          path: "userId",
          select: "name email",
        },
      })
      .sort({ createdAt: -1 });
    res.json({ success: true, enquiries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Get Single Enquiry by ID
exports.getEnquiryById = async (req, res) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id).populate({
      path: "assignedTo",
      select: "role userId",
      populate: { path: "userId", select: "name email" },
    });

    if (!enquiry)
      return res
        .status(404)
        .json({ success: false, message: "Enquiry not found" });

    res.json({ success: true, enquiry });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Assign Enquiry (Super Admin assigns to Admin)
exports.assignEnquiry = async (req, res) => {
  try {
    const { adminId } = req.body;

    const enquiry = await Enquiry.findByIdAndUpdate(
      req.params.id,
      { assignedTo: adminId, status: "in-progress" },
      { new: true }
    ).populate({
      path: "assignedTo",
      select: "role userId",
      populate: { path: "userId", select: "name email" },
    });

    if (!enquiry)
      return res
        .status(404)
        .json({ success: false, message: "Enquiry not found" });

    res.json({ success: true, enquiry });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. Respond to Enquiry (Admin adds response + update status)
exports.respondEnquiry = async (req, res) => {
  try {
    const message = req.body?.message?.trim();

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Response message is required",
      });
    }

    const enquiry = await Enquiry.findByIdAndUpdate(
      req.params.id,
      {
        response: { message, respondedAt: new Date() },
        status: "resolved",
      },
      { new: true }
    ).populate({
      path: "assignedTo",
      select: "role userId",
      populate: { path: "userId", select: "name email" },
    });

    if (!enquiry)
      return res
        .status(404)
        .json({ success: false, message: "Enquiry not found" });

    res.json({
      success: true,
      message: "Enquiry responded successfully",
      enquiry,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
