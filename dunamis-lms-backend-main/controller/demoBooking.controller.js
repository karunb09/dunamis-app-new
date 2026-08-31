const DemoBooking = require("../model/demoBooking.model");
const asyncHandler = require("../utils/asyncHandler");
const Slot = require("../model/slot.model");
const Student = require("../model/student.model");
const Category = require("../model/category.model");
// Registers the schemas the branch/city populates below resolve against. Without
// these the controller only works once something else has required them.
require("../model/branch.model");
require("../model/city.model");
const Teacher = require("../model/teacher.model");
const { slotStartInstant } = require("../utils/slotTime");
const mailSender = require("../utils/mailSender");
const {
  adminDemoBookingEmailTemplate,
  demoLinkEmailTemplate,
  demoRescheduledEmailTemplate,
  demoCancelledEmailTemplate,
  instructorDemoBookingEmailTemplate,
  studentDemoBookingEmailTemplate,
} = require("../mail/demoBookingEmail");
const {
  createDashboardNotice,
  getAdminUsers,
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
const ACTIVE_DEMO_STATUSES = ["Booked", "Rescheduled"];

// Demo bookings never write to Slot.students, so capacity has to be counted
// from the bookings themselves. Without this two people can hold the same
// 20-minute slot, and a reschedule would happily move onto an occupied one.
const countActiveDemoBookings = (slotId, excludeBookingId = null) =>
  DemoBooking.countDocuments({
    slotId,
    demoStatus: { $in: ACTIVE_DEMO_STATUSES },
    ...(excludeBookingId ? { _id: { $ne: excludeBookingId } } : {}),
  });

// Every rule a demo slot must satisfy for a given course/instructor/mode.
// Shared by booking and rescheduling so the two can never drift apart.
const validateDemoSlotSelection = async ({
  slotId,
  courseId,
  teacherId,
  deliveryMode,
  branchId,
  excludeBookingId = null,
}) => {
  const fail = (status, message) => ({ ok: false, status, message });

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
      return fail(404, "Slot not found");
    }

    if (slot.slotType !== "demo") {
      return fail(400, "This slot is not open for demo booking");
    }

    if (!slot.courseId || slot.courseId._id.toString() !== courseId) {
      return fail(400, "Selected slot does not belong to the chosen course");
    }

    const assignedTeacherIds = Array.isArray(slot.courseId.teacher)
      ? slot.courseId.teacher.map((teacher) => toIdString(teacher))
      : [];

    const resolvedTeacherId = teacherId || slot.createdBy?._id?.toString();
    if (!assignedTeacherIds.includes(resolvedTeacherId)) {
      return fail(400, "Teacher does not teach this course");
    }

    if (
      !resolvedTeacherId ||
      !slot.createdBy ||
      slot.createdBy._id.toString() !== resolvedTeacherId
    ) {
      return fail(400, "Selected slot does not belong to the chosen instructor");
    }

    const resolvedDeliveryMode = normalizeText(
      deliveryMode || slot.courseId?.mode || "online"
    ).toLowerCase();
    if (!["online", "offline"].includes(resolvedDeliveryMode)) {
      return fail(400, "deliveryMode must be either online or offline");
    }

    if (
      slot.courseId?.mode &&
      slot.courseId.mode !== resolvedDeliveryMode
    ) {
      return fail(400, "Delivery mode does not match the selected course");
    }

    const resolvedBranchId = branchId || slot.branchId?._id?.toString() || null;
    if (resolvedDeliveryMode === "offline") {
      if (!resolvedBranchId) {
        return fail(400, "branchId is required for offline demo booking");
      }

      if (!slot.branchId || slot.branchId._id.toString() !== resolvedBranchId) {
        return fail(400, "Selected slot does not belong to the chosen branch");
      }
    }

    const activeBookings = await countActiveDemoBookings(slot._id, excludeBookingId);
    if (slot.maxStudents && activeBookings >= slot.maxStudents) {
      return fail(400, "Selected demo slot is already booked");
    }

  return {
    ok: true,
    slot,
    resolvedTeacherId,
    resolvedDeliveryMode,
    resolvedBranchId,
  };
};

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

    const check = await validateDemoSlotSelection({
      slotId,
      courseId,
      teacherId,
      deliveryMode,
      branchId,
    });
    if (!check.ok) {
      return res.status(check.status).json({ success: false, message: check.message });
    }
    const { slot, resolvedTeacherId, resolvedDeliveryMode, resolvedBranchId } = check;

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
            course.active !== false &&
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
      convertedAt: isEnrolled ? new Date() : null,
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

// Notify the learner (registered or guest lead) plus staff once an instructor
// or admin shares the join link. Never allowed to fail the update request.
const sendDemoLinkNotifications = async ({ bookingId, meetingLink, isUpdate }) => {
  const booking = await DemoBooking.findById(bookingId)
    .populate({
      path: "studentId",
      select: "userId",
      populate: { path: "userId", select: "name email" },
    })
    .populate({
      path: "slotId",
      select: "date startTime endTime branchId",
      populate: [
        { path: "branchId", select: "branchName location branchTimings city", populate: { path: "city", select: "cityName" } },
        { path: "createdBy", select: "userId teacherDetail", populate: { path: "userId", select: "name email" } },
      ],
    })
    .populate({ path: "courseId", select: "name code mode" });

  if (!booking) return;

  const studentUser = booking.studentId?.userId || null;
  const recipientEmail = booking.lead?.email || studentUser?.email || "";
  const courseName = booking.courseId?.name || "your course";

  const { subject, html, attachments = [] } = demoLinkEmailTemplate({
    student: studentUser
      ? { name: studentUser.name, email: studentUser.email }
      : booking.lead,
    course: booking.courseId,
    slot: booking.slotId,
    branch: booking.slotId?.branchId || null,
    instructor: booking.slotId?.createdBy,
    meetingLink,
    isUpdate,
  });

  const deliveries = [];

  if (recipientEmail) {
    deliveries.push({
      type: "student-email",
      recipient: recipientEmail,
      task: mailSender(recipientEmail, subject, html, attachments),
    });
  }

  if (studentUser?._id) {
    deliveries.push({
      type: "student-notice",
      recipient: "dashboard",
      task: createDashboardNotice({
        title: isUpdate ? "Demo class link updated" : "Demo class link shared",
        message: `Join link for your ${courseName} demo: ${meetingLink}`,
        userIds: [studentUser._id],
        creatorId: studentUser._id,
      }),
    });
  }

  const admins = await getAdminUsers();
  if (admins.length) {
    deliveries.push({
      type: "admin-notice",
      recipient: "dashboard",
      task: createDashboardNotice({
        title: isUpdate ? "Demo class link updated" : "Demo class link shared",
        message: `${courseName} demo link ${isUpdate ? "updated" : "shared"} with the learner.`,
        userIds: admins.map((admin) => admin._id),
      }),
    });
  }

  if (!deliveries.length) return;

  const results = await Promise.allSettled(deliveries.map((delivery) => delivery.task));
  results.forEach((result, index) => {
    if (result.status === "fulfilled") return;
    console.error("Demo link notification failed", {
      bookingId: String(bookingId),
      type: deliveries[index].type,
      recipient: deliveries[index].recipient,
      error: result.reason?.message || result.reason || "Unknown error",
    });
  });
};

// Bookings owned by the logged-in student. Guest demos booked before signup are
// matched by lead email so they still surface in the student portal.
exports.getMyBookings = asyncHandler(async (req, res) => {
    const ownerFilters = [];
    if (req.user?.roleId) ownerFilters.push({ studentId: req.user.roleId });
    if (req.user?.email) {
      ownerFilters.push({ "lead.email": normalizeEmail(req.user.email) });
    }

    if (!ownerFilters.length) {
      return res.status(200).json({ success: true, bookings: [] });
    }

    const bookings = await DemoBooking.find({ $or: ownerFilters })
      .select(
        "demoStatus enrollmentStatus deliveryMode meetingLink meetingLinkUpdatedAt createdAt slotId courseId teacherId branchId"
      )
      .populate({
        path: "slotId",
        select: "date startTime endTime branchId",
        populate: {
          path: "branchId",
          select: "branchName location branchTimings city",
          populate: { path: "city", select: "cityName" },
        },
      })
      .populate({ path: "courseId", select: "name code mode" })
      .populate({
        path: "teacherId",
        select: "userId",
        populate: { path: "userId", select: "name" },
      })
      .populate({
        path: "branchId",
        select: "branchName location branchTimings city",
        populate: { path: "city", select: "cityName" },
      })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ success: true, bookings });
});

// Update booking
exports.updateBooking = asyncHandler(async (req, res) => {
    const { demoStatus, enrollmentStatus, followUp, response, meetingLink } =
      req.body;

    const booking = await DemoBooking.findById(req.params.id)
      .populate({
        path: "slotId",
        select: "createdBy",
      })
      .select("teacherId slotId demoStatus enrollmentStatus meetingLink");

    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }

    const isTeacher = req.user?.accountType === "teacher";
    if (isTeacher) {
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

    // Teachers may set the demo status and the join link; the rest is admin-managed
    const updateFields = {};
    if (demoStatus) {
      updateFields.demoStatus = demoStatus;
      if (demoStatus === "Attended" && booking.demoStatus !== "Attended") {
        updateFields.attendedAt = new Date();
      }
    }

    let sharedLink = "";
    if (typeof meetingLink === "string") {
      const nextLink = meetingLink.trim();
      updateFields.meetingLink = nextLink;

      if (nextLink !== (booking.meetingLink || "")) {
        updateFields.meetingLinkUpdatedAt = nextLink ? new Date() : null;
        updateFields.meetingLinkSetBy = nextLink ? req.user?.userId || null : null;
        sharedLink = nextLink;
      }
    }

    if (!isTeacher) {
      if (enrollmentStatus) {
        updateFields.enrollmentStatus = enrollmentStatus;
        if (
          enrollmentStatus === "Enrolled" &&
          booking.enrollmentStatus !== "Enrolled"
        ) {
          updateFields.convertedAt = new Date();
        }
      }
      if (followUp) updateFields.followUp = followUp;
      if (response !== undefined) updateFields.response = response;
    }

    if (!Object.keys(updateFields).length) {
      return res.status(400).json({
        success: false,
        message: "No updatable fields provided",
      });
    }

    const updatedBooking = await DemoBooking.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { returnDocument: "after", runValidators: true }
    );

    if (sharedLink) {
      try {
        await sendDemoLinkNotifications({
          bookingId: updatedBooking._id,
          meetingLink: sharedLink,
          isUpdate: Boolean(booking.meetingLink),
        });
      } catch (error) {
        console.error("Demo link notification failed", {
          bookingId: String(updatedBooking._id),
          error: error?.message || error,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Booking updated successfully",
      booking: updatedBooking,
    });
});

const IT_SUPPORT_HINT = process.env.IT_SUPPORT_EMAIL
  ? `Contact IT support at ${process.env.IT_SUPPORT_EMAIL} if this issue persists.`
  : "Contact IT support if this issue persists.";

const RESCHEDULE_CUTOFF_HOURS = 24;

// Students self-serve only outside the cutoff; staff move demos at any time
// (same-day instructor illness is exactly when the tool is needed most).
const assertActorWindow = (req, slot) => {
  if (req.user.accountType !== "student") return null;

  const hoursUntil = (slotStartInstant(slot) - Date.now()) / 3600000;
  if (hoursUntil >= RESCHEDULE_CUTOFF_HOURS) return null;

  return {
    status: 400,
    message:
      hoursUntil < 0
        ? "This demo has already started."
        : `Demos can only be changed more than ${RESCHEDULE_CUTOFF_HOURS} hours in advance. Please contact us to move this one.`,
    hint: IT_SUPPORT_HINT,
  };
};

// Owner check per role. Students own a booking by studentId OR by the lead
// email they booked with — a guest who signed up later still owns their demo.
const assertBookingActor = async (req, booking) => {
  const { accountType, roleId, email } = req.user;

  if (accountType === "admin" || accountType === "superadmin") return null;

  if (accountType === "teacher") {
    const ownsBooking =
      toIdString(booking.teacherId) === String(roleId) ||
      toIdString(booking.slotId?.createdBy || booking.slotId) === String(roleId);
    return ownsBooking
      ? null
      : { status: 403, message: "You can only change demo bookings assigned to you" };
  }

  const ownsBooking =
    toIdString(booking.studentId) === String(roleId) ||
    (booking.lead?.email && booking.lead.email === normalizeEmail(email));
  return ownsBooking
    ? null
    : { status: 403, message: "You can only change your own demo booking" };
};

const loadBookingForChange = (id) =>
  DemoBooking.findById(id).populate({
    path: "slotId",
    select: "date startTime endTime createdBy",
  });


// Learner + both instructors (outgoing and incoming) + admins. Mirrors
// sendDemoLinkNotifications: never allowed to fail the request that triggered it.
const sendDemoChangeNotifications = async ({
  bookingId,
  kind,
  reason,
  previousSlot = null,
  previousTeacherId = null,
}) => {
  const booking = await DemoBooking.findById(bookingId)
    .populate({
      path: "studentId",
      select: "userId",
      populate: { path: "userId", select: "name email" },
    })
    .populate({
      path: "slotId",
      select: "date startTime endTime branchId",
      populate: [
        {
          path: "branchId",
          select: "branchName location branchTimings city",
          populate: { path: "city", select: "cityName" },
        },
        {
          path: "createdBy",
          select: "userId",
          populate: { path: "userId", select: "name email" },
        },
      ],
    })
    .populate({ path: "courseId", select: "name code mode" });

  if (!booking) return;

  const studentUser = booking.studentId?.userId || null;
  const recipientEmail = booking.lead?.email || studentUser?.email || "";
  const courseName = booking.courseId?.name || "your course";
  const isCancel = kind === "cancelled";

  let previousInstructorName = null;
  let previousInstructorEmail = null;
  if (previousTeacherId) {
    const previousTeacher = await Teacher.findById(previousTeacherId)
      .select("userId")
      .populate("userId", "name email");
    if (previousTeacher?.userId) {
      previousInstructorName = `${previousTeacher.userId.name?.firstName || ""} ${previousTeacher.userId.name?.lastName || ""}`.trim();
      previousInstructorEmail = previousTeacher.userId.email || null;
    }
  }

  const template = isCancel ? demoCancelledEmailTemplate : demoRescheduledEmailTemplate;
  const { subject, html, attachments = [] } = template({
    student: studentUser ? { name: studentUser.name, email: studentUser.email } : booking.lead,
    course: booking.courseId,
    slot: booking.slotId,
    branch: booking.slotId?.branchId || null,
    instructor: booking.slotId?.createdBy,
    reason,
    previous: {
      instructorName: previousInstructorName,
      date: previousSlot?.date ? new Date(previousSlot.date).toLocaleDateString("en-IN") : null,
      startTime: previousSlot?.startTime || null,
    },
  });

  const noticeTitle = isCancel ? "Demo cancelled" : "Demo rescheduled";
  const deliveries = [];

  if (recipientEmail) {
    deliveries.push({
      type: "student-email",
      task: mailSender(recipientEmail, subject, html, attachments),
    });
  }

  if (studentUser?._id) {
    deliveries.push({
      type: "student-notice",
      task: createDashboardNotice({
        title: noticeTitle,
        message: isCancel
          ? `Your ${courseName} demo has been cancelled.`
          : `Your ${courseName} demo has moved to ${booking.slotId?.startTime} on ${new Date(booking.slotId?.date).toLocaleDateString("en-IN")}.`,
        userIds: [studentUser._id],
        creatorId: studentUser._id,
      }),
    });
  }

  // The incoming instructor, and the outgoing one when the demo moved away.
  const instructorUsers = [booking.slotId?.createdBy?.userId].filter(Boolean);
  if (instructorUsers.length) {
    deliveries.push({
      type: "instructor-notice",
      task: createDashboardNotice({
        title: noticeTitle,
        message: isCancel
          ? `A ${courseName} demo assigned to you was cancelled.`
          : `A ${courseName} demo was moved into your ${booking.slotId?.startTime} slot.`,
        userIds: instructorUsers.map((user) => user._id),
      }),
    });
  }

  if (previousInstructorEmail && !isCancel) {
    deliveries.push({
      type: "previous-instructor-email",
      task: mailSender(
        previousInstructorEmail,
        `A ${courseName} demo has moved off your schedule`,
        html,
        attachments
      ),
    });
  }

  const admins = await getAdminUsers();
  if (admins.length) {
    deliveries.push({
      type: "admin-notice",
      task: createDashboardNotice({
        title: noticeTitle,
        message: `${courseName} demo ${isCancel ? "cancelled" : "rescheduled"}${reason ? ` — ${reason}` : ""}.`,
        userIds: admins.map((admin) => admin._id),
      }),
    });
  }

  const results = await Promise.allSettled(deliveries.map((delivery) => delivery.task));
  results.forEach((result, index) => {
    if (result.status === "fulfilled") return;
    console.error("Demo change notification failed", {
      bookingId: String(bookingId),
      type: deliveries[index].type,
      error: result.reason?.message || result.reason,
    });
  });
};

exports.rescheduleDemoBooking = asyncHandler(async (req, res) => {
    const { slotId, teacherId, reason } = req.body;

    const booking = await loadBookingForChange(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Demo booking not found" });
    }

    if (booking.demoStatus === "Cancelled") {
      return res
        .status(400)
        .json({ success: false, message: "This demo was cancelled and cannot be moved" });
    }

    const actorError = await assertBookingActor(req, booking);
    if (actorError) return res.status(actorError.status).json({ success: false, ...actorError });

    // The cutoff applies to the slot being left, not the one being taken.
    const windowError = assertActorWindow(req, booking.slotId);
    if (windowError) return res.status(windowError.status).json({ success: false, ...windowError });

    const check = await validateDemoSlotSelection({
      slotId,
      courseId: toIdString(booking.courseId),
      teacherId,
      deliveryMode: booking.deliveryMode,
      branchId: booking.branchId ? toIdString(booking.branchId) : undefined,
      excludeBookingId: booking._id,
    });
    if (!check.ok) {
      return res.status(check.status).json({ success: false, message: check.message });
    }

    const previousSlot = booking.slotId;
    const previousTeacherId = toIdString(booking.teacherId);
    const instructorChanged = previousTeacherId !== check.resolvedTeacherId;

    booking.slotId = check.slot._id;
    booking.teacherId = check.resolvedTeacherId;
    booking.branchId = check.resolvedBranchId;
    booking.demoStatus = "Rescheduled";
    // A new instructor means a new room; a stale link is worse than none.
    if (instructorChanged) {
      booking.meetingLink = "";
      booking.meetingLinkUpdatedAt = null;
      booking.meetingLinkSetBy = null;
    }
    booking.joinReminderSentAt = null;
    booking.history.push({
      action: instructorChanged ? "reassigned" : "rescheduled",
      actorUserId: req.user.userId,
      actorRole: req.user.accountType,
      fromSlotId: previousSlot?._id || null,
      toSlotId: check.slot._id,
      fromTeacherId: previousTeacherId || null,
      toTeacherId: check.resolvedTeacherId,
      reason: reason || "",
    });
    await booking.save();

    sendDemoChangeNotifications({
      bookingId: booking._id,
      kind: "rescheduled",
      reason,
      previousSlot,
      previousTeacherId,
    }).catch((error) =>
      console.error("Demo reschedule notification failed", error.message)
    );

    res.status(200).json({
      success: true,
      message: instructorChanged
        ? "Demo moved to a new instructor and time"
        : "Demo rescheduled",
      booking,
    });
});

exports.cancelDemoBooking = asyncHandler(async (req, res) => {
    const { reason } = req.body;

    const booking = await loadBookingForChange(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Demo booking not found" });
    }

    if (booking.demoStatus === "Cancelled") {
      return res
        .status(400)
        .json({ success: false, message: "This demo is already cancelled" });
    }

    const actorError = await assertBookingActor(req, booking);
    if (actorError) return res.status(actorError.status).json({ success: false, ...actorError });

    const windowError = assertActorWindow(req, booking.slotId);
    if (windowError) return res.status(windowError.status).json({ success: false, ...windowError });

    booking.demoStatus = "Cancelled";
    booking.cancelledAt = new Date();
    booking.cancelledBy = req.user.userId;
    booking.cancelReason = reason || "";
    booking.history.push({
      action: "cancelled",
      actorUserId: req.user.userId,
      actorRole: req.user.accountType,
      fromSlotId: booking.slotId?._id || null,
      fromTeacherId: toIdString(booking.teacherId) || null,
      reason: reason || "",
    });
    await booking.save();

    sendDemoChangeNotifications({ bookingId: booking._id, kind: "cancelled", reason }).catch(
      (error) => console.error("Demo cancellation notification failed", error.message)
    );

    res.status(200).json({ success: true, message: "Demo cancelled", booking });
});
