const DemoBooking = require("../model/demoBooking.model");
const asyncHandler = require("../utils/asyncHandler");
const Slot = require("../model/slot.model");
const Student = require("../model/student.model");
const Category = require("../model/category.model");
const mailSender = require("../utils/mailSender");
const {
  adminDemoBookingEmailTemplate,
  instructorDemoBookingEmailTemplate,
  studentDemoBookingEmailTemplate,
} = require("../mail/demoBookingEmail");
const {
  createDashboardNotice,
  notifyEvent,
} = require("../utils/notificationService");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmail = (value) => value?.trim().toLowerCase() || "";
const normalizeText = (value) => value?.trim() || "";

const buildLeadFromStudent = (student) => ({
  firstName: student?.userId?.name?.firstName || "",
  lastName: student?.userId?.name?.lastName || "",
  phone: String(student?.userId?.mobileNo || "").trim(),
  email: normalizeEmail(student?.userId?.email),
});

const validateLead = (lead = {}) => {
  const firstName = normalizeText(lead.firstName);
  const lastName = normalizeText(lead.lastName);
  const phone = normalizeText(lead.phone);
  const email = normalizeEmail(lead.email);

  if (!firstName || !lastName || !phone || !email) {
    return {
      valid: false,
      message: "Guest demo booking requires firstName, lastName, phone, and email",
    };
  }

  if (!EMAIL_REGEX.test(email)) {
    return { valid: false, message: "Enter a valid guest email address" };
  }

  return {
    valid: true,
    lead: { firstName, lastName, phone, email },
  };
};

const toIdString = (value) => {
  if (!value && value !== 0) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  return String(value._id || value.id || value);
};

const sendDemoBookingEmails = async ({
  booking,
  slot,
  student,
  lead,
}) => {
  const payload = {
    student: student
      ? {
          name: student.userId?.name,
          email: student.userId?.email,
          phone: student.userId?.mobileNo,
        }
      : lead,
    lead,
    course: slot.courseId,
    slot,
    branch: slot.branchId || null,
    instructor: slot.createdBy,
  };

  const deliveries = [];
  const studentEmail = lead?.email || student?.userId?.email || "";

  if (studentEmail) {
    const { subject, html, attachments = [] } =
      studentDemoBookingEmailTemplate(payload);
    deliveries.push({
      type: "student",
      recipient: studentEmail,
      task: mailSender(studentEmail, subject, html, attachments),
    });
  }

  const staffEmail = adminDemoBookingEmailTemplate(payload);
  const instructorEmail = instructorDemoBookingEmailTemplate(payload);
  deliveries.push({
    type: "staff",
    recipient: "matrix",
    task: notifyEvent({
      event: "demoBooked",
      instructorUser: slot.createdBy?.userId,
      subject: staffEmail.subject,
      html: staffEmail.html,
      attachments: staffEmail.attachments || [],
      instructorSubject: instructorEmail.subject,
      instructorHtml: instructorEmail.html,
    }),
  });

  if (student?.userId?._id) {
    deliveries.push({
      type: "dashboard-notice",
      recipient: "dashboard",
      task: createDashboardNotice({
        title: "New demo booking",
        message: `Your demo for ${slot.courseId?.name || "a course"} is booked.`,
        userIds: [student.userId._id],
        creatorId: student.userId._id,
      }),
    });
  }

  if (!deliveries.length) {
    return;
  }

  const results = await Promise.allSettled(deliveries.map((delivery) => delivery.task));

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      return;
    }

    const delivery = deliveries[index];
    console.error("Demo booking email failed", {
      bookingId: booking?._id?.toString?.() || booking?._id || null,
      type: delivery.type,
      recipient: delivery.recipient,
      error: result.reason?.message || result.reason || "Unknown email error",
    });
  });
};

const buildBookingDetails = async (bookingDoc, slot, student) => {
  const booking = bookingDoc.toObject ? bookingDoc.toObject() : bookingDoc;
  const categoryId =
    slot.courseId?.category?._id?.toString() ||
    slot.courseId?.category?.toString() ||
    booking.categoryId?.toString() ||
    null;

  const categoryName =
    slot.courseId?.category?.name ||
    (categoryId
      ? await Category.findById(categoryId).then((cat) => cat?.name || "N/A")
      : "N/A");

  return {
    _id: booking._id,
    student: student
      ? {
          id: student._id,
          name: student.userId?.name,
          email: student.userId?.email,
          mobile: student.userId?.mobileNo,
        }
      : null,
    lead: booking.lead || null,
    course: {
      id: slot.courseId._id,
      name: slot.courseId.name,
      code: slot.courseId.code,
      category: categoryName,
      mode: slot.courseId.mode,
    },
    slot: {
      id: slot._id,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      branchId: slot.branchId?._id || slot.branchId || null,
    },
    instructor: {
      id: slot.createdBy._id,
      user: slot.createdBy.userId,
    },
    deliveryMode: booking.deliveryMode,
    branchId: booking.branchId,
    demoStatus: booking.demoStatus,
    enrollmentStatus: booking.enrollmentStatus,
    followUp: booking.followUp,
    response: booking.response,
  };
};

// Book a demo slot for either an authenticated student or a guest lead.
exports.bookDemoSlot = asyncHandler(async (req, res) => {
    const {
      slotId,
      courseId,
      teacherId,
      deliveryMode,
      branchId,
      lead,
    } = req.body;

    if (!courseId || !slotId) {
      return res.status(400).json({
        success: false,
        message: "courseId and slotId are required",
      });
    }

    const student =
      req.user?.userId
        ? await Student.findOne({ userId: req.user.userId })
            .populate("userId", "name email mobileNo")
            .populate("enrolledCourses.courseId", "code name category")
        : null;

    const slot = await Slot.findById(slotId)
      .populate({
        path: "courseId",
        select: "name code category mode teacher",
        populate: [
          { path: "category", model: "Category", select: "_id name" },
          { path: "teacher", model: "teacher", select: "_id userId" },
        ],
      })
      .populate({
        path: "branchId",
        select: "branchName location city branchTimings",
        populate: { path: "city", select: "cityName" },
      })
      .populate({
        path: "createdBy",
        populate: { path: "userId", select: "name email mobileNo image" },
      });

    if (!slot) {
      return res
        .status(404)
        .json({ success: false, message: "Slot not found" });
    }

    if (slot.slotType !== "demo") {
      return res.status(400).json({
        success: false,
        message: "This slot is not open for demo booking",
      });
    }

    if (!slot.courseId || slot.courseId._id.toString() !== courseId) {
      return res.status(400).json({
        success: false,
        message: "Selected slot does not belong to the chosen course",
      });
    }

    const assignedTeacherIds = Array.isArray(slot.courseId.teacher)
      ? slot.courseId.teacher.map((teacher) => toIdString(teacher))
      : [];

    const resolvedTeacherId = teacherId || slot.createdBy?._id?.toString();
    if (!assignedTeacherIds.includes(resolvedTeacherId)) {
      return res.status(400).json({
        success: false,
        message: "Teacher does not teach this course",
      });
    }

    if (
      !resolvedTeacherId ||
      !slot.createdBy ||
      slot.createdBy._id.toString() !== resolvedTeacherId
    ) {
      return res.status(400).json({
        success: false,
        message: "Selected slot does not belong to the chosen instructor",
      });
    }

    const resolvedDeliveryMode = normalizeText(
      deliveryMode || slot.courseId?.mode || "online"
    ).toLowerCase();
    if (!["online", "offline"].includes(resolvedDeliveryMode)) {
      return res.status(400).json({
        success: false,
        message: "deliveryMode must be either online or offline",
      });
    }

    if (
      slot.courseId?.mode &&
      slot.courseId.mode !== resolvedDeliveryMode
    ) {
      return res.status(400).json({
        success: false,
        message: "Delivery mode does not match the selected course",
      });
    }

    const resolvedBranchId = branchId || slot.branchId?._id?.toString() || null;
    if (resolvedDeliveryMode === "offline") {
      if (!resolvedBranchId) {
        return res.status(400).json({
          success: false,
          message: "branchId is required for offline demo booking",
        });
      }

      if (!slot.branchId || slot.branchId._id.toString() !== resolvedBranchId) {
        return res.status(400).json({
          success: false,
          message: "Selected slot does not belong to the chosen branch",
        });
      }
    }

    if (
      Array.isArray(slot.students) &&
      slot.maxStudents &&
      slot.students.length >= slot.maxStudents
    ) {
      return res.status(400).json({
        success: false,
        message: "Selected demo slot is already full",
      });
    }

    const leadPayload = student
      ? buildLeadFromStudent(student)
      : validateLead(lead || {});

    if (!student && !leadPayload.valid) {
      return res.status(400).json({
        success: false,
        message: leadPayload.message,
      });
    }

    const resolvedLead = student ? leadPayload : leadPayload.lead;

    const duplicateQuery = student?._id
      ? { slotId, studentId: student._id }
      : { slotId, "lead.email": resolvedLead.email };

    const existingBooking = await DemoBooking.findOne(duplicateQuery);
    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message: "A demo booking already exists for this slot",
      });
    }

    const categoryId =
      slot.courseId?.category?._id?.toString() ||
      slot.courseId?.category?.toString() ||
      null;

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: "Category not found for this course",
      });
    }

    const isEnrolled = student
      ? student.enrolledCourses.some(
          (course) =>
            course.courseId?._id?.toString() === slot.courseId._id.toString()
        )
      : false;

    const booking = await DemoBooking.create({
      studentId: student?._id || null,
      slotId,
      courseId,
      teacherId: resolvedTeacherId,
      categoryId,
      branchId: resolvedBranchId,
      deliveryMode: resolvedDeliveryMode,
      lead: resolvedLead,
      demoStatus: "Booked",
      enrollmentStatus: isEnrolled ? "Enrolled" : "Not Enrolled",
      followUp: "Pending",
      response: "",
    });

    if (student) {
      const alreadyLinked = student.demoCourse.some(
        (bookingId) => bookingId?.toString() === booking._id.toString()
      );
      if (!alreadyLinked) {
        student.demoCourse.push(booking._id);
        await student.save();
      }
    }

    const bookingDetails = await buildBookingDetails(booking, slot, student);

    void sendDemoBookingEmails({
      booking,
      slot,
      student,
      lead: resolvedLead,
    }).catch((emailError) => {
      console.error("Unexpected demo email dispatch failure", {
        bookingId: booking?._id?.toString?.() || booking?._id || null,
        error: emailError?.message || emailError,
      });
    });

    return res.status(201).json({
      success: true,
      message: "Demo slot booked successfully",
      booking: bookingDetails,
    });
});

// Get all bookings
exports.getAllBookings = asyncHandler(async (req, res) => {
    const {
      teacherId,
      demoStatus,
      followUp,
      enrollmentStatus,
      courseId,
    } = req.query;

    const query = {};

    if (req.user?.accountType === "teacher") {
      query.teacherId = req.user.roleId;
    } else if (teacherId) {
      query.teacherId = teacherId;
    }

    if (demoStatus) query.demoStatus = demoStatus;
    if (followUp) query.followUp = followUp;
    if (enrollmentStatus) query.enrollmentStatus = enrollmentStatus;
    if (courseId) query.courseId = courseId;

    const bookings = await DemoBooking.find(query)
      .populate({
        path: "studentId",
        select: "followUps demoCourse mode enrolledCourses adminActions",
        populate: [
          {
            path: "userId",
            select: "name mobileNo email accountType accountStatus image roleId",
            populate: [
              {
                path: "name",
                select: "firstName lastName",
              },
              {
                path: "roleId",
                select: "_id name description",
              },
            ],
          },
          {
            path: "enrolledCourses.courseId",
            select: "name code category",
            populate: {
              path: "category",
              select: "name",
            },
          },
        ],
      })
      .populate({
        path: "slotId",
        select: "date startTime endTime branchId slotType sessionType",
        populate: [
          { path: "courseId", select: "name code mode category" },
          { path: "branchId", select: "branchName city" },
          {
            path: "createdBy",
            populate: { path: "userId", select: "name email mobileNo image" },
          },
        ],
      })
      .populate({
        path: "courseId",
        select: "name code mode category",
        populate: {
          path: "category",
          select: "name",
        },
      })
      .populate({
        path: "teacherId",
        populate: { path: "userId", select: "name email mobileNo image" },
      })
      .sort({ createdAt: -1 });

    return res.status(200).json(bookings);
});

// Update booking
exports.updateBooking = asyncHandler(async (req, res) => {
    const { demoStatus, enrollmentStatus, followUp, response } = req.body;

    const booking = await DemoBooking.findById(req.params.id)
      .populate({
        path: "slotId",
        select: "createdBy",
      })
      .select("teacherId slotId");

    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }

    if (req.user?.accountType === "teacher") {
      const teacherRoleId = toIdString(req.user.roleId);
      const assignedTeacherId = toIdString(booking.teacherId);
      const slotTeacherId = toIdString(booking.slotId?.createdBy);

      if (
        teacherRoleId &&
        ![assignedTeacherId, slotTeacherId].includes(teacherRoleId)
      ) {
        return res.status(403).json({
          success: false,
          message: "You can only update demo bookings assigned to you",
        });
      }
    }

    const updateFields = {};
    if (demoStatus) updateFields.demoStatus = demoStatus;
    if (enrollmentStatus) updateFields.enrollmentStatus = enrollmentStatus;
    if (followUp) updateFields.followUp = followUp;
    if (response !== undefined) updateFields.response = response;

    const updatedBooking = await DemoBooking.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { returnDocument: "after" }
    );

    return res.status(200).json({
      success: true,
      message: "Booking updated successfully",
      booking: updatedBooking,
    });
});
