const Slot = require("../model/slot.model");
const asyncHandler = require("../utils/asyncHandler");
const Course = require("../model/course.model");
const Branch = require("../model/branch.model");
const Teacher = require("../model/teacher.model");
const Student = require("../model/student.model");
const ClassRoster = require("../model/classRoster.model");
const DemoBooking = require("../model/demoBooking.model");
const ScheduleChangeRequest = require("../model/scheduleChangeRequest.model");
const { syncTeacherAvailabilitySlots } = require("../utils/syncAvailabilitySlots");
const {
  notifyScheduleChangeRequested,
} = require("../services/scheduleChangeNotifications");
const { getMaxStudents, isUnlimited } = require("../utils/slotCapacity");
const { hasSlotStarted } = require("../utils/classRoster");
const {
  IT_SUPPORT_HINT,
  getExpectedDurationMinutes,
  isAllowedDayPair,
  getDayPairLabel,
  timeToMinutes,
  parseTimeToMinutes,
  availabilitySignature,
  scheduleSnapshot,
  sameSchedule,
  resolveAvailabilityEntries,
  validateAvailabilityEntries,
  findAvailabilityOverlap,
} = require("../utils/availabilityRules");

const getGroupSlotTag = (slot = {}) => {
  if (slot.slotType !== "enrolled" || slot.sessionType !== "standard") {
    return null;
  }
  if (slot.branchId) {
    return null;
  }

  const studentCount = Array.isArray(slot.students) ? slot.students.length : 0;
  if (studentCount >= 1 && studentCount <= 2) return "Learner's choice";
  if (studentCount >= 3) return "Filling fast";
  return null;
};

exports.createSlot = asyncHandler(async (req, res) => {
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
});

// Get all slots
exports.getAllSlots = asyncHandler(async (req, res) => {
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
});

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

exports.getAvailableSlots = asyncHandler(async (req, res) => {
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

    // A slot whose start time has already passed today can no longer be
    // booked into — showing it as "available" leads an admin to assign a
    // student to a class that will never happen.
    const now = new Date();
    slots = slots.filter((slot) => !hasSlotStarted(slot, now));

    // Demo bookings never write to Slot.students, so a demo slot's own capacity
    // fields always read as empty. Ask the bookings instead, or every booked
    // demo keeps showing as free.
    const demoSlotIds = slots
      .filter((slot) => slot.slotType === "demo")
      .map((slot) => slot._id);
    if (demoSlotIds.length) {
      const taken = await DemoBooking.aggregate([
        {
          $match: {
            slotId: { $in: demoSlotIds },
            demoStatus: { $in: ["Booked", "Rescheduled"] },
          },
        },
        { $group: { _id: "$slotId", count: { $sum: 1 } } },
      ]);
      const bookedBySlot = new Map(taken.map((row) => [String(row._id), row.count]));
      slots = slots.filter(
        (slot) =>
          slot.slotType !== "demo" ||
          (bookedBySlot.get(String(slot._id)) || 0) < (slot.maxStudents || 1)
      );
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

    // An "enrolled" slot tied to a parentAvailabilityId the teacher no longer
    // offers (removed from weeklyAvailability) is a dead recurring class —
    // it won't regenerate future occurrences, so it must not be bookable.
    slots = slots.filter((slot) => {
      if (slot.slotType !== "enrolled" || !slot.parentAvailabilityId) return true;
      return availabilityDaysById.has(String(slot.parentAvailabilityId));
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
        availableSeats: isUnlimited(maxStudents)
          ? null
          : Math.max(maxStudents - studentCount, 0),
        bookingTag: getGroupSlotTag(plainSlot),
      };
    });

    res.status(200).json({
      success: true,
      message: "Available slots fetched successfully",
      slots: decoratedSlots,
    });
});

// Update a slot
exports.updateSlot = asyncHandler(async (req, res) => {
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
});

// The teacher's recurring classes with their standing join links. Admins may
// pass ?teacherId= to inspect someone else's.
exports.getMyClasses = asyncHandler(async (req, res) => {
  const isTeacher = req.user.accountType === "teacher";
  const teacherId = isTeacher ? req.user.roleId : req.query.teacherId || req.user.roleId;

  const rosters = await ClassRoster.find({ teacherId, status: "active" })
    .populate("courseId", "name code mode")
    .populate("branchId", "branchName")
    .select(
      "courseId branchId parentAvailabilityId sessionType deliveryMode recurringDays startTime endTime students meetingLink meetingLinkUpdatedAt"
    )
    .lean();

  const classes = rosters.map((roster) => ({
    parentAvailabilityId: roster.parentAvailabilityId,
    course: roster.courseId,
    branch: roster.branchId,
    sessionType: roster.sessionType,
    deliveryMode: roster.deliveryMode,
    recurringDays: roster.recurringDays || [],
    startTime: roster.startTime,
    endTime: roster.endTime,
    studentCount: (roster.students || []).filter((m) => m.status === "active").length,
    meetingLink: roster.meetingLink || "",
    meetingLinkUpdatedAt: roster.meetingLinkUpdatedAt,
  }));

  res.status(200).json({ success: true, classes });
});

// The standing room for a weekly batch. Every dated slot generated from this
// recurring class inherits it, so the teacher sets it once rather than weekly.
exports.setClassMeetingLink = asyncHandler(async (req, res) => {
  const { parentAvailabilityId } = req.params;
  const { meetingLink } = req.validated?.body || req.body;

  const roster = await ClassRoster.findOne({ parentAvailabilityId });
  if (!roster) {
    return res.status(404).json({ message: "Class not found" });
  }

  if (
    req.user.accountType === "teacher" &&
    String(roster.teacherId) !== String(req.user.roleId)
  ) {
    return res
      .status(403)
      .json({ message: "You can only set the join link for your own classes" });
  }

  roster.meetingLink = meetingLink;
  roster.meetingLinkUpdatedAt = meetingLink ? new Date() : null;
  roster.meetingLinkSetBy = meetingLink ? req.user.userId : null;
  await roster.save();

  res.status(200).json({
    message: meetingLink ? "Join link saved" : "Join link cleared",
    meetingLink: roster.meetingLink,
  });
});

// A one-off room change for a single dated session.
exports.setSlotMeetingLink = asyncHandler(async (req, res) => {
  const { meetingLink } = req.validated?.body || req.body;

  const slot = await Slot.findById(req.params.id).select("createdBy meetingLinkOverride");
  if (!slot) {
    return res.status(404).json({ message: "Class not found" });
  }

  if (
    req.user.accountType === "teacher" &&
    String(slot.createdBy) !== String(req.user.roleId)
  ) {
    return res
      .status(403)
      .json({ message: "You can only set the join link for your own classes" });
  }

  slot.meetingLinkOverride = meetingLink;
  await slot.save();

  res.status(200).json({
    message: meetingLink ? "Join link saved for this session" : "Session override cleared",
    meetingLinkOverride: slot.meetingLinkOverride,
  });
});

// Delete a slot
exports.deleteSlot = asyncHandler(async (req, res) => {
    await Slot.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Slot deleted" });
});

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

// Active-membership counts for a teacher's recurring classes, keyed by the
// weeklyAvailability subdocument id.
const loadRosterGuards = async (teacherId) => {
  const rosters = await ClassRoster.find({ teacherId, status: "active" })
    .select("parentAvailabilityId courseId students")
    .lean();

  const guards = new Map();
  for (const roster of rosters) {
    const activeIds = (roster.students || [])
      .filter((member) => member.status === "active")
      .map((member) => member.studentId);
    guards.set(String(roster.parentAvailabilityId), {
      rosterId: roster._id,
      courseId: roster.courseId,
      activeIds,
    });
  }
  return guards;
};

exports.setWeeklyAvailability = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findOne({ userId: req.user.userId });
  if (!teacher)
    return res
      .status(403)
      .json({ message: "Only teachers can update availability" });

  const shouldReplaceAvailability = isReplaceAvailabilityRequest(req.body);
  const { availability, teacherNote } = req.body;
  if (!Array.isArray(availability)) {
    return res.status(400).json({ message: "Availability is required" });
  }

  if (!shouldReplaceAvailability && availability.length === 0) {
    return res.status(400).json({ message: "Availability is required" });
  }

  const existingAvailability = Array.isArray(teacher.weeklyAvailability)
    ? teacher.weeklyAvailability.map((entry) => entry.toObject())
    : [];

  const validationError = await validateAvailabilityEntries(availability);
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  const overlapError = findAvailabilityOverlap({
    entries: availability,
    baseEntries: shouldReplaceAvailability ? [] : existingAvailability,
  });
  if (overlapError) {
    return res.status(400).json({ message: overlapError });
  }

  const normalize = (slot) => ({
    ...slot,
    days: slot.days.map((day) => day.toLowerCase()),
    maxStudents: getMaxStudents(slot),
  });

  if (!shouldReplaceAvailability) {
    teacher.weeklyAvailability.push(...availability.map(normalize));
    await teacher.save();
    const appendSync = await syncTeacherAvailabilitySlots({ teacher });
    return res.status(200).json({
      message: "Weekly Availability saved",
      replaced: false,
      generatedSlots: appendSync.created,
      removedSlots: appendSync.deleted,
      availability: teacher.weeklyAvailability,
      pendingApprovals: [],
    });
  }

  const resolved = resolveAvailabilityEntries(availability, existingAvailability);
  const guards = await loadRosterGuards(teacher._id);

  const keptIds = new Set(
    resolved.filter((pair) => pair.previous).map((pair) => String(pair.previous._id))
  );

  // A guarded class keeps its current schedule until an admin decides; only the
  // request is recorded. Everything else applies immediately.
  const queued = [];
  const nextAvailability = [];

  for (const { slot, previous } of resolved) {
    if (!previous) {
      nextAvailability.push(normalize(slot));
      continue;
    }

    const guard = guards.get(String(previous._id));
    const guarded = guard && guard.activeIds.length > 0;

    if (guarded && !sameSchedule(previous, slot)) {
      nextAvailability.push({ ...previous, _id: previous._id });
      queued.push({
        parentAvailabilityId: previous._id,
        changeType: "reschedule",
        current: scheduleSnapshot(previous),
        requested: scheduleSnapshot(normalize(slot)),
        guard,
      });
      continue;
    }

    nextAvailability.push({ ...normalize(slot), _id: previous._id });
  }

  for (const entry of existingAvailability) {
    if (keptIds.has(String(entry._id))) continue;
    const guard = guards.get(String(entry._id));
    if (!guard || guard.activeIds.length === 0) continue;

    nextAvailability.push({ ...entry, _id: entry._id });
    queued.push({
      parentAvailabilityId: entry._id,
      changeType: "remove",
      current: scheduleSnapshot(entry),
      requested: null,
      guard,
    });
  }

  teacher.weeklyAvailability = nextAvailability;
  await teacher.save();

  const syncResult = await syncTeacherAvailabilitySlots({
    teacher,
    replaceExisting: true,
  });

  const pendingApprovals = [];
  for (const item of queued) {
    const request = await ScheduleChangeRequest.findOneAndUpdate(
      { parentAvailabilityId: item.parentAvailabilityId, status: "pending" },
      {
        $set: {
          teacherId: teacher._id,
          courseId: item.guard.courseId,
          rosterId: item.guard.rosterId,
          changeType: item.changeType,
          current: item.current,
          requested: item.requested,
          affectedStudentIds: item.guard.activeIds,
          teacherNote: teacherNote || "",
        },
      },
      { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
    );
    pendingApprovals.push(request);
  }

  // Not awaited — SMTP round-trips would hold the instructor on a spinner for
  // seconds after the save itself is done. Failures are logged inside.
  if (pendingApprovals.length) {
    notifyScheduleChangeRequested({ teacher, requests: pendingApprovals });
  }

  const message = pendingApprovals.length
    ? `Weekly Availability saved. ${pendingApprovals.length} change(s) to classes with enrolled learners need admin approval.`
    : "Weekly Availability saved";

  res.status(200).json({
    message,
    replaced: true,
    generatedSlots: syncResult.created,
    removedSlots: syncResult.deleted,
    availability: teacher.weeklyAvailability,
    pendingApprovals: pendingApprovals.map((request) => ({
      _id: request._id,
      parentAvailabilityId: request.parentAvailabilityId,
      changeType: request.changeType,
      current: request.current,
      requested: request.requested,
      affectedStudents: request.affectedStudentIds.length,
    })),
  });
});
