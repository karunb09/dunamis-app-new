const Slot = require("../model/slot.model");
const Course = require("../model/course.model");
const Branch = require("../model/branch.model");
const Teacher = require("../model/teacher.model");
const Student = require("../model/student.model");
const { syncTeacherAvailabilitySlots } = require("../utils/syncAvailabilitySlots");

const SLOT_DURATION_RULES = {
  enrolled: {
    standard: 60,
    premium: 40,
  },
  demo: {
    standard: 20,
    premium: 20,
  },
};

const DAY_PAIR_OPTIONS = [
  { label: "Mon - Thu", days: ["monday", "thursday"] },
  { label: "Tue - Fri", days: ["tuesday", "friday"] },
  { label: "Wed - Sat", days: ["wednesday", "saturday"] },
  { label: "Sat - Sun", days: ["saturday", "sunday"] },
];

const ALLOWED_DAY_PAIRS = DAY_PAIR_OPTIONS.map((option) => option.days);

const getExpectedDurationMinutes = (slot = {}) =>
  SLOT_DURATION_RULES[slot.slotType]?.[slot.sessionType] || null;

const getMaxStudentsForScheduleSlot = (slot = {}) => {
  if (slot.slotType === "demo") return 1;
  return slot.sessionType === "premium" ? 1 : 4;
};

const isAllowedDayPair = (days = []) => {
  const normalizedDays = days.map((day) => String(day).toLowerCase()).sort();
  return ALLOWED_DAY_PAIRS.some((pair) => {
    const normalizedPair = pair.slice().sort();
    return (
      normalizedPair.length === normalizedDays.length &&
      normalizedPair.every((day, index) => day === normalizedDays[index])
    );
  });
};

const getDayPairLabel = (days = []) => {
  const normalizedDays = days.map((day) => String(day).toLowerCase()).sort();
  const match = DAY_PAIR_OPTIONS.find((option) => {
    const normalizedPair = option.days.slice().sort();
    return (
      normalizedPair.length === normalizedDays.length &&
      normalizedPair.every((day, index) => day === normalizedDays[index])
    );
  });

  return match?.label || "";
};

const getGroupSlotTag = (slot = {}) => {
  if (slot.slotType !== "enrolled" || slot.sessionType !== "standard") {
    return null;
  }

  const studentCount = Array.isArray(slot.students) ? slot.students.length : 0;
  if (studentCount >= 1 && studentCount <= 2) return "Learner's choice";
  if (studentCount >= 3) return "Filling fast";
  return null;
};

const IT_SUPPORT_HINT = process.env.IT_SUPPORT_EMAIL
  ? `Contact IT support at ${process.env.IT_SUPPORT_EMAIL} if this issue persists.`
  : "Contact IT support if this issue persists.";

// Parse "HH:MM" or "H:MM AM/PM" time strings to minutes since midnight.
const parseTimeToMinutes = (timeStr) => {
  const raw = String(timeStr || "").trim();

  // HH:MM (24-hour)
  const hhmm = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmm) return Number(hhmm[1]) * 60 + Number(hhmm[2]);

  // H:MM AM/PM (12-hour)
  const ampm = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampm) {
    let h = Number(ampm[1]);
    const m = Number(ampm[2]);
    const period = ampm[3].toUpperCase();
    if (period === "AM" && h === 12) h = 0;
    if (period === "PM" && h !== 12) h += 12;
    return h * 60 + m;
  }

  return NaN;
};

exports.createSlot = async (req, res) => {
  try {
    const {
      courseId,
      branchId,
      date,
      startTime,
      endTime,
      slotType,
      sessionType,
      batchLabel,
      recurringDays,
      isRecurring,
    } = req.body;

    const accountType = req.user?.accountType;
    const isAdmin = ["admin", "superadmin"].includes(accountType);

    // Resolve teacher — admins may pass teacherId; teachers use their own record
    let teacher;
    if (isAdmin && req.body.teacherId) {
      teacher = await Teacher.findById(req.body.teacherId);
    } else {
      teacher = await Teacher.findOne({ userId: req.user.userId });
    }

    if (!teacher) {
      return res.status(403).json({
        success: false,
        message: isAdmin
          ? "Teacher not found. Provide a valid teacherId."
          : "Only teachers or admins can create slots.",
        hint: IT_SUPPORT_HINT,
      });
    }

    if (!slotType || !["demo", "enrolled"].includes(slotType)) {
      return res.status(400).json({
        success: false,
        message: "slotType must be 'demo' or 'enrolled'.",
      });
    }

    if (!sessionType || !["standard", "premium"].includes(sessionType)) {
      return res.status(400).json({
        success: false,
        message: "sessionType must be 'standard' or 'premium'.",
      });
    }

    if (!courseId || !date || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: "courseId, date, startTime, and endTime are required.",
      });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found. Verify the courseId and try again.",
        hint: IT_SUPPORT_HINT,
      });
    }

    const teacherAssigned = (course.teacher || []).some(
      (t) => t.toString() === teacher._id.toString()
    );
    if (!teacherAssigned && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned to this course.",
        hint: IT_SUPPORT_HINT,
      });
    }

    // Branch validation — required for offline courses
    const resolvedBranchId = branchId || null;
    let branch = null;
    if (resolvedBranchId) {
      branch = await Branch.findById(resolvedBranchId);
      if (!branch) {
        return res.status(404).json({
          success: false,
          message: "Branch not found. Verify the branchId.",
          hint: IT_SUPPORT_HINT,
        });
      }
    }

    if (course.mode === "offline" && !branch) {
      return res.status(400).json({
        success: false,
        message: "branchId is required for offline courses.",
      });
    }

    // Time validation
    const startMin = timeToMinutes(startTime);
    const endMin = timeToMinutes(endTime);

    if (!Number.isFinite(startMin) || !Number.isFinite(endMin)) {
      return res.status(400).json({
        success: false,
        message: "Invalid time format. Use HH:MM (e.g. 10:00).",
      });
    }

    if (startMin >= endMin) {
      return res.status(400).json({
        success: false,
        message: "startTime must be before endTime.",
      });
    }

    // Demo slot duration enforcement — must be exactly 20 minutes
    if (slotType === "demo") {
      if (endMin - startMin !== 20) {
        return res.status(400).json({
          success: false,
          message: "Demo slots must be exactly 20 minutes (e.g. 10:00 – 10:20).",
        });
      }
    }

    // Branch hours validation
    if (branch) {
      const slotDate = new Date(date);
      const dayName = slotDate.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();

      const openDays = (branch.branchOpenDays || []).map((d) =>
        String(d).trim().toLowerCase()
      );
      if (openDays.length && !openDays.some((d) => d.startsWith(dayName.slice(0, 3)))) {
        return res.status(400).json({
          success: false,
          message: `This branch is not open on ${dayName}s. Open days: ${branch.branchOpenDays.join(", ")}.`,
          hint: "Adjust the date or update branch open days. " + IT_SUPPORT_HINT,
        });
      }

      if (Array.isArray(branch.branchTimings) && branch.branchTimings.length === 2) {
        const branchOpen = parseTimeToMinutes(branch.branchTimings[0]);
        const branchClose = parseTimeToMinutes(branch.branchTimings[1]);

        if (Number.isFinite(branchOpen) && Number.isFinite(branchClose)) {
          if (startMin < branchOpen || endMin > branchClose) {
            return res.status(400).json({
              success: false,
              message: `Slot time ${startTime}–${endTime} falls outside branch hours (${branch.branchTimings[0]}–${branch.branchTimings[1]}).`,
              hint: "Adjust the slot time to be within branch operating hours.",
            });
          }
        }
      }
    }

    // Overlap validation — block all conflicts for online; allow demo+enrolled overlap only when both slots are offline
    const slotDate = new Date(date);
    const dayStart = new Date(slotDate.setHours(0, 0, 0, 0));
    const dayEnd = new Date(slotDate.setHours(23, 59, 59, 999));

    const existingSlots = await Slot.find({
      createdBy: teacher._id,
      date: { $gte: dayStart, $lte: dayEnd },
    });

    for (const existing of existingSlots) {
      const eStart = timeToMinutes(existing.startTime);
      const eEnd = timeToMinutes(existing.endTime);
      if (!Number.isFinite(eStart) || !Number.isFinite(eEnd)) continue;

      const overlaps = startMin < eEnd && endMin > eStart;
      if (!overlaps) continue;

      // For offline slots (both have a branchId), allow demo+enrolled overlap —
      // the demo student can visit the physical class location.
      const bothOffline = !!resolvedBranchId && !!existing.branchId;
      if (slotType !== existing.slotType && bothOffline) continue;

      return res.status(400).json({
        success: false,
        message: `You already have a ${existing.slotType} slot at this time (${existing.startTime}–${existing.endTime}).`,
        hint: "Choose a time that does not conflict with an existing slot.",
      });
    }

    const slot = await Slot.create({
      courseId,
      branchId: resolvedBranchId,
      date,
      startTime,
      endTime,
      createdBy: teacher._id,
      slotType,
      sessionType,
      batchLabel: batchLabel || null,
      recurringDays: Array.isArray(recurringDays) ? recurringDays : [],
      isRecurring: Boolean(isRecurring),
    });

    await slot.populate([
      {
        path: "createdBy",
        select: "_id userId",
        populate: { path: "userId", select: "name email mobileNo image" },
      },
      { path: "courseId", select: "name code category mode" },
      {
        path: "branchId",
        select: "branchName location city branchTimings",
        populate: { path: "city", select: "cityName" },
      },
    ]);

    return res.status(201).json({
      success: true,
      message: "Slot created successfully",
      slot,
    });
  } catch (err) {
    console.error("Error creating slot:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to create slot. Please try again.",
      hint: IT_SUPPORT_HINT,
      error: err.message,
    });
  }
};

// Get all slots
exports.getAllSlots = async (req, res) => {
  try {
    const slots = await Slot.find()
      .populate("courseId branchId")
      .populate({
        path: "createdBy",
        select: "_id userId",
        populate: { path: "userId", select: "name email mobileNo image" },
      });
    res.status(200).json(
      slots.map((slot) => ({
        id: slot._id,
        course: slot.courseId,
        branch: slot.branchId,
        createdBy: slot.createdBy,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        slotType: slot.slotType,
        sessionType: slot.sessionType,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get available slots by branch and date
// exports.getAvailableSlots = async (req, res) => {
//   try {
//     const { branchId, date } = req.query;
//     const userId = req.user.userId;

//     // Validate branchId
//     const branchExists = await Branch.findById(branchId);
//     if (!branchExists)
//       return res.status(400).json({ message: "Invalid branchId" });

//     const targetDate = new Date(date);
//     const nextDate = new Date(targetDate);
//     nextDate.setDate(nextDate.getDate() + 1);

//     // Get user and their enrolled courses
//     const student = await Student.findOne({ userId });
//     let courseFilter = {};

//     if (student) {
//       const enrolledCourseIds = student.enrolledCourses.map((c) => c.courseId);
//       courseFilter = {
//         $or: [
//           { courseId: { $in: enrolledCourseIds }, slotType: "enrolled" },
//           { slotType: "demo" },
//         ],
//       };
//     } else {
//       courseFilter = { slotType: "demo" };
//     }

//     const slots = await Slot.find({
//       branchId,
//       date: { $gte: targetDate, $lt: nextDate },
//       ...courseFilter,
//     })
//       .populate("courseId branchId createdBy")
//       .populate({
//         path: "courseId",
//         select: "courseName courseCode category mode",
//       })
//       .populate({
//         path: "createdBy",
//         select: "_id userId",
//         populate: { path: "userId", select: "name email mobileNo image" },
//       });

//     if (slots.length === 0) {
//       return res
//         .status(200)
//         .json({ message: "No available slots for this branch and date" });
//     }

//     res.status(200).json(
//       slots.map((slot) => ({
//         id: slot._id,
//         course: slot.courseId,
//         branch: slot.branchId,
//         createdBy: slot.createdBy,
//         date: slot.date,
//         startTime: slot.startTime,
//         endTime: slot.endTime,
//         slotType: slot.slotType,
//         sessionType: slot.sessionType,
//       }))
//     );
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

exports.getAvailableSlots = async (req, res) => {
  try {
    const {
      courseId,
      teacherId,
      sessionType,
      slotType,
      branchId,
    } = req.query;

    const query = {
      date: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      $expr: {
        $lt: [{ $size: "$students" }, "$maxStudents"],
      },
    };

    if (courseId) {
      const course = await Course.findById(courseId).select("teacher");
      if (!course) {
        return res
          .status(404)
          .json({ success: false, message: "Course not found" });
      }

      const assignedTeacherIds = Array.isArray(course.teacher)
        ? course.teacher.map((id) => id.toString())
        : [];

      if (teacherId && !assignedTeacherIds.includes(teacherId)) {
        return res.status(200).json({
          success: true,
          message: "Available slots fetched successfully",
          slots: [],
        });
      }

      query.courseId = courseId;
      query.createdBy = teacherId || { $in: assignedTeacherIds };
    } else if (teacherId) {
      query.createdBy = teacherId;
    }

    if (sessionType) query.sessionType = sessionType;
    if (slotType) query.slotType = slotType;
    if (branchId) query.branchId = branchId;

    const fetchSlots = async () =>
      Slot.find(query)
      .populate({
        path: "branchId",
        select: "branchName location city branchTimings",
        populate: {
          path: "city",
          select: "cityName",
        },
      })
      .populate("courseId", "name code mode")
      .populate({
        path: "createdBy",
        select: "_id userId",
        populate: { path: "userId", select: "name email image" },
      })
      .select(
        "date startTime endTime maxStudents currentStudentsCount students slotType sessionType branchId parentAvailabilityId recurringDays courseId createdBy"
      )
      .sort({ date: 1, startTime: 1 });

    let slots = await fetchSlots();

    if (!slots.length && (courseId || teacherId)) {
      let teacherIds = [];

      if (teacherId) {
        teacherIds = [teacherId];
      } else if (courseId) {
        const createdByFilter = query.createdBy;
        teacherIds = Array.isArray(createdByFilter?.$in)
          ? createdByFilter.$in
          : createdByFilter
            ? [createdByFilter]
            : [];
      }

      for (const currentTeacherId of teacherIds) {
        await syncTeacherAvailabilitySlots({ teacherId: currentTeacherId });
      }

      slots = await fetchSlots();
    }

    const teacherIds = [
      ...new Set(
        slots
          .map((slot) => slot.createdBy?._id || slot.createdBy)
          .filter(Boolean)
          .map((id) => id.toString())
      ),
    ];
    const teachers = teacherIds.length
      ? await Teacher.find({ _id: { $in: teacherIds } }).select(
          "weeklyAvailability"
        )
      : [];
    const availabilityDaysById = new Map();

    teachers.forEach((teacher) => {
      (teacher.weeklyAvailability || []).forEach((availability) => {
        availabilityDaysById.set(
          availability._id.toString(),
          availability.days || []
        );
      });
    });

    const decoratedSlots = slots.map((slot) => {
      const plainSlot = slot.toObject ? slot.toObject() : slot;
      const studentCount = Number.isFinite(Number(plainSlot.currentStudentsCount))
        ? Number(plainSlot.currentStudentsCount)
        : Array.isArray(plainSlot.students)
        ? plainSlot.students.length
        : 0;
      const maxStudents = Number(plainSlot.maxStudents) || 0;
      const availabilityDays =
        availabilityDaysById.get(String(plainSlot.parentAvailabilityId || "")) ||
        plainSlot.recurringDays ||
        [];

      return {
        ...plainSlot,
        availabilityDays,
        dayPairLabel: getDayPairLabel(availabilityDays),
        studentCount,
        availableSeats: Math.max(maxStudents - studentCount, 0),
        bookingTag: getGroupSlotTag(plainSlot),
      };
    });

    res.status(200).json({
      success: true,
      message: "Available slots fetched successfully",
      slots: decoratedSlots,
    });
  } catch (err) {
    console.error("Error fetching available slots:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update a slot
exports.updateSlot = async (req, res) => {
  try {
    const slot = await Slot.findById(req.params.id);
    if (!slot) {
      return res.status(404).json({ message: "Demo slot not found" });
    }

    const { courseId, branchId, date, startTime, endTime, sessionType } =
      req.body;

    // Validate courseId
    if (courseId) {
      const courseExists = await Course.findById(courseId);
      if (!courseExists) {
        return res.status(400).json({ message: "Invalid courseId" });
      }
      slot.courseId = courseId;
    }

    // Validate branchId
    if (branchId) {
      const branchExists = await Branch.findById(branchId);
      if (!branchExists) {
        return res.status(400).json({ message: "Invalid branchId" });
      }
      slot.branchId = branchId;
    }

    // Validate sessionType
    if (sessionType) {
      if (!["standard", "premium"].includes(sessionType)) {
        return res.status(400).json({ message: "Invalid sessionType" });
      }
      slot.sessionType = sessionType;
    }

    // Update other allowed fields
    if (date) slot.date = date;
    if (startTime) slot.startTime = startTime;
    if (endTime) slot.endTime = endTime;

    await slot.save();

    res.status(200).json({ message: "Slot updated successfully", slot });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete a slot
exports.deleteSlot = async (req, res) => {
  try {
    await Slot.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Slot deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const timeToMinutes = (timeStr) => {
  const match = String(timeStr || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return NaN;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    minutes < 0 ||
    minutes > 59 ||
    hours < 0 ||
    hours > 24 ||
    (hours === 24 && minutes !== 0)
  ) {
    return NaN;
  }

  return hours * 60 + minutes;
};

const isReplaceAvailabilityRequest = (body = {}) => {
  const rawFlag =
    body.replaceWeeklyAvailability ??
    body.replaceAvailability ??
    body.replaceExisting ??
    body.replace ??
    body.mode ??
    body.action;

  if (typeof rawFlag === "boolean") {
    return rawFlag;
  }

  if (typeof rawFlag === "string") {
    return ["replace", "overwrite", "reset", "replace-all"].includes(
      rawFlag.trim().toLowerCase()
    );
  }

  return false;
};

exports.setWeeklyAvailability = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ userId: req.user.userId });
    if (!teacher)
      return res
        .status(403)
        .json({ message: "Only teachers can update availability" });

    const shouldReplaceAvailability = isReplaceAvailabilityRequest(req.body);
    const { availability } = req.body;
    if (!Array.isArray(availability)) {
      return res.status(400).json({ message: "Availability is required" });
    }

    if (!shouldReplaceAvailability && availability.length === 0) {
      return res.status(400).json({ message: "Availability is required" });
    }

    const existingAvailability = Array.isArray(teacher.weeklyAvailability)
      ? teacher.weeklyAvailability.slice()
      : [];

    const validDays = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ];

    for (const slot of availability) {
      if (
        !Array.isArray(slot.days) ||
        slot.days.length === 0 ||
        !slot.startTime ||
        !slot.endTime
      ) {
        return res.status(400).json({
          message:
            "Each slot must include at least one valid day, startTime and endTime",
        });
      }

      for (const d of slot.days) {
        if (!validDays.includes(d.toLowerCase())) {
          return res.status(400).json({ message: `Invalid day: ${d}` });
        }
      }

      if (!isAllowedDayPair(slot.days)) {
        return res.status(400).json({
          message:
            "Slots must use one allowed day pair: Mon-Thu, Tue-Fri, Wed-Sat, or Sat-Sun",
        });
      }

      if (!["demo", "enrolled"].includes(slot.slotType)) {
        return res
          .status(400)
          .json({ message: "Invalid slotType; must be 'demo' or 'enrolled'" });
      }

      if (!["standard", "premium"].includes(slot.sessionType)) {
        return res.status(400).json({
          message: "Invalid sessionType; must be 'standard' or 'premium'",
        });
      }

      const expectedDuration = getExpectedDurationMinutes(slot);
      const start = timeToMinutes(slot.startTime);
      const end = timeToMinutes(slot.endTime);

      if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
        return res.status(400).json({
          message: `Invalid time range for ${slot.startTime}-${slot.endTime}`,
        });
      }

      if (!expectedDuration || end - start !== expectedDuration) {
        return res.status(400).json({
          message:
            slot.slotType === "demo"
              ? "Demo slots must be exactly 20 minutes"
              : slot.sessionType === "premium"
                ? "Individual class slots must be exactly 40 minutes"
                : "Group class slots must be exactly 60 minutes",
        });
      }

      if (slot.branchId) {
        const branch = await Branch.findById(slot.branchId).select(
          "branchName branchTimings branchOpenDays"
        );

        if (!branch) {
          return res.status(400).json({
            message: `Branch not found. ${IT_SUPPORT_HINT}`,
          });
        }

        if (
          Array.isArray(branch.branchOpenDays) &&
          branch.branchOpenDays.length > 0
        ) {
          const openDays = branch.branchOpenDays.map((d) => d.toLowerCase());
          for (const day of slot.days) {
            if (!openDays.includes(day.toLowerCase())) {
              return res.status(400).json({
                message: `${branch.branchName} is not open on ${day}. Open days: ${branch.branchOpenDays.join(", ")}. ${IT_SUPPORT_HINT}`,
              });
            }
          }
        }

        if (
          Array.isArray(branch.branchTimings) &&
          branch.branchTimings.length === 2
        ) {
          const branchOpen = parseTimeToMinutes(branch.branchTimings[0]);
          const branchClose = parseTimeToMinutes(branch.branchTimings[1]);
          if (Number.isFinite(branchOpen) && Number.isFinite(branchClose)) {
            if (start < branchOpen || end > branchClose) {
              return res.status(400).json({
                message: `Slot ${slot.startTime}–${slot.endTime} is outside ${branch.branchName} open hours (${branch.branchTimings[0]}–${branch.branchTimings[1]}). ${IT_SUPPORT_HINT}`,
              });
            }
          }
        }
      }
    }

    const allSlotsByDay = {};

    const baseSlots = shouldReplaceAvailability ? [] : existingAvailability;

    for (const slot of baseSlots) {
      for (const d of slot.days) {
        const day = d.toLowerCase();
        if (!allSlotsByDay[day]) allSlotsByDay[day] = [];
        allSlotsByDay[day].push({
          start: timeToMinutes(slot.startTime),
          end: timeToMinutes(slot.endTime),
          slotType: slot.slotType,
        });
      }
    }

    for (const slot of availability) {
      const start = timeToMinutes(slot.startTime);
      const end = timeToMinutes(slot.endTime);

      if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
        return res.status(400).json({
          message: `Invalid time range for ${slot.startTime}-${slot.endTime}`,
        });
      }

      for (const d of slot.days) {
        const day = d.toLowerCase();
        if (!allSlotsByDay[day]) allSlotsByDay[day] = [];

        for (const existing of allSlotsByDay[day]) {
          // Demo and enrolled slots may overlap — teacher is at the branch for class,
          // demo is a short adjoining session. Only block same-type overlaps.
          if (existing.slotType && existing.slotType !== slot.slotType) continue;
          // For offline courses at the same branch, different courses may share the same
          // time window (different instruments / rooms in the same centre).
          const bothOffline = !!slot.branchId && !!existing.branchId;
          if (bothOffline && slot.courseId && existing.courseId && String(slot.courseId) !== String(existing.courseId)) continue;
          if (start < existing.end && end > existing.start) {
            return res.status(400).json({
              message: `Overlap detected on ${day} between ${slot.startTime}-${slot.endTime}`,
            });
          }
        }

        allSlotsByDay[day].push({ start, end, slotType: slot.slotType, courseId: slot.courseId, branchId: slot.branchId });
      }
    }

    if (shouldReplaceAvailability) {
      teacher.weeklyAvailability = availability.map((slot) => ({
        ...slot,
        days: slot.days.map((day) => day.toLowerCase()),
        maxStudents: getMaxStudentsForScheduleSlot(slot),
      }));
    } else {
      teacher.weeklyAvailability.push(
        ...availability.map((slot) => ({
          ...slot,
          days: slot.days.map((day) => day.toLowerCase()),
          maxStudents: getMaxStudentsForScheduleSlot(slot),
        }))
      );
    }
    await teacher.save();
    const syncResult = await syncTeacherAvailabilitySlots({
      teacher,
      replaceExisting: shouldReplaceAvailability,
    });

    res
      .status(200)
      .json({
        message: "Weekly Availability saved",
        replaced: shouldReplaceAvailability,
        generatedSlots: syncResult.created,
        removedSlots: syncResult.deleted,
        availability: teacher.weeklyAvailability,
      });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
