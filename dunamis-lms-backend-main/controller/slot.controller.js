const Slot = require("../model/slot.model");
const Course = require("../model/course.model");
const Branch = require("../model/branch.model");
const Teacher = require("../model/teacher.model");
const Student = require("../model/student.model");
const { syncTeacherAvailabilitySlots } = require("../utils/syncAvailabilitySlots");

// Date to minutes for overlap check
// const timeToMinutes = (date, timeStr) => {
//   const [hours, minutes] = timeStr.split(":").map(Number);
//   return new Date(date).setHours(hours, minutes, 0, 0);
// };

// Create a new slot
// exports.createSlot = async (req, res) => {
//   try {
//     const {
//       courseId,
//       branchId,
//       date,
//       startTime,
//       endTime,
//       slotType,
//       sessionType,
//     } = req.body;

//     // Validate required sessionType
//     if (!sessionType || !["standard", "premium"].includes(sessionType)) {
//       return res
//         .status(400)
//         .json({
//           message: "Invalid sessionType; must be 'standard' or 'premium'",
//         });
//     }

//     const teacher = await Teacher.findOne({ userId: req.user.userId });
//     if (!teacher) {
//       return res
//         .status(403)
//         .json({ message: "Only teachers can create slots" });
//     }

//     // Validate courseId
//     const courseExists = await Course.findById(courseId);
//     if (!courseExists)
//       return res.status(400).json({ message: "Invalid courseId" });

//     const teacherAssigned = (courseExists.teacher || []).some(
//       (t) => t.toString() === teacher._id.toString()
//     );
//     if (!teacherAssigned) {
//       return res.status(403).json({
//         message:
//           "You are not assigned to this course; cannot create a slot for it",
//       });
//     }

//     // Validate branchId
//     const branchExists = await Branch.findById(branchId);
//     if (!branchExists)
//       return res.status(400).json({ message: "Invalid branchId" });

//     // Check for existing default slot timing for this course + sessionType
//     let slotStart = startTime;
//     let slotEnd = endTime;
//     if (!Array.isArray(teacher.defaultSlots)) {
//       teacher.defaultSlots = [];
//     }
//     const defaultSlot = teacher.defaultSlots.find(
//       (s) => s.courseId.toString() === courseId && s.sessionType === sessionType
//     );

//     if (defaultSlot) {
//       slotStart = defaultSlot.startTime;
//       slotEnd = defaultSlot.endTime;
//     } else {
//       // Save as default for future use
//       teacher.defaultSlots.push({ courseId, sessionType, startTime, endTime });
//       await teacher.save();
//     }

//     // Validate startTime < endTime
//     const startMinutes = timeToMinutes(date, slotStart);
//     const endMinutes = timeToMinutes(date, slotEnd);

//     if (startMinutes >= endMinutes) {
//       return res
//         .status(400)
//         .json({ message: "startTime must be before endTime" });
//     }

//     // Check overlapping slots
//     const teacherSlots = await Slot.find({ createdBy: teacher._id, date });

//     // Check overlapping slots
//     const overlapping = teacherSlots.some((s) => {
//       const sStart = timeToMinutes(date, s.startTime);
//       const sEnd = timeToMinutes(date, s.endTime);
//       return startMinutes < sEnd && endMinutes > sStart;
//     });
//     if (overlapping)
//       return res
//         .status(400)
//         .json({ message: "You already have a slot scheduled at this time" });

//     const slot = await Slot.create({
//       courseId,
//       branchId,
//       date,
//       startTime: slotStart,
//       endTime: slotEnd,
//       createdBy: teacher._id,
//       slotType: slotType || "demo",
//       sessionType,
//     });

//     await slot.populate([
//       {
//         path: "createdBy",
//         select: "_id userId",
//         populate: { path: "userId", select: "name email mobileNo image" },
//       },
//       { path: "courseId", select: "name code category mode" },
//       { path: "branchId", select: "name location" },
//     ]);

//     res
//       .status(201)
//       .json({ success: true, message: "Booking slot created", slot });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

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

    if (courseId) query.courseId = courseId;
    if (teacherId) query.createdBy = teacherId;
    if (sessionType) query.sessionType = sessionType;
    if (slotType) query.slotType = slotType;
    if (branchId) query.branchId = branchId;

    const fetchSlots = async () =>
      Slot.find(query)
      .populate("branchId", "branchName city")
      .populate("courseId", "name code mode")
      .populate({
        path: "createdBy",
        select: "_id userId",
        populate: { path: "userId", select: "name email image" },
      })
      .select(
        "date startTime endTime maxStudents students slotType sessionType branchId parentAvailabilityId courseId createdBy"
      )
      .sort({ date: 1, startTime: 1 });

    let slots = await fetchSlots();

    if (!slots.length && (courseId || teacherId)) {
      let teacherIds = [];

      if (teacherId) {
        teacherIds = [teacherId];
      } else if (courseId) {
        const course = await Course.findById(courseId).select("teacher");
        teacherIds = Array.isArray(course?.teacher)
          ? course.teacher.map((id) => id.toString())
          : [];
      }

      for (const currentTeacherId of teacherIds) {
        await syncTeacherAvailabilitySlots({ teacherId: currentTeacherId });
      }

      slots = await fetchSlots();
    }

    res.status(200).json({
      success: true,
      message: "Available slots fetched successfully",
      slots,
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
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
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
          if (start < existing.end && end > existing.start) {
            return res.status(400).json({
              message: `Overlap detected on ${day} between ${slot.startTime}-${slot.endTime}`,
            });
          }
        }

        allSlotsByDay[day].push({ start, end });
      }
    }

    if (shouldReplaceAvailability) {
      teacher.weeklyAvailability = availability.map((slot) => ({
        ...slot,
        days: slot.days.map((day) => day.toLowerCase()),
      }));
    } else {
      teacher.weeklyAvailability.push(...availability);
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
