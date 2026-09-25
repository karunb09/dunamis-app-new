const asyncHandler = require("../utils/asyncHandler");
const Slot = require("../model/slot.model");
const Teacher = require("../model/teacher.model");
const ClassRoster = require("../model/classRoster.model");
const ScheduleChangeRequest = require("../model/scheduleChangeRequest.model");
const { syncTeacherAvailabilitySlots } = require("../utils/syncAvailabilitySlots");
const {
  rollingRange,
  applyRostersToSlots,
  hasSlotStarted,
  startOfDay,
} = require("../utils/classRoster");
const {
  IT_SUPPORT_HINT,
  validateAvailabilityEntries,
  findAvailabilityOverlap,
} = require("../utils/availabilityRules");
const { getMaxStudents } = require("../utils/slotCapacity");
const {
  notifyScheduleChangeReviewed,
} = require("../services/scheduleChangeNotifications");

const REVIEW_STATUSES = ["approved", "rejected"];

exports.getMyScheduleChangeRequests = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findOne({ userId: req.user.userId }).select("_id");
  if (!teacher) {
    return res.status(403).json({ message: "Only teachers have schedule change requests" });
  }

  const requests = await ScheduleChangeRequest.find({ teacherId: teacher._id })
    .populate("courseId", "name")
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const rosters = await ClassRoster.find({ teacherId: teacher._id, status: "active" })
    .select("parentAvailabilityId students")
    .lean();

  const enrolledCounts = rosters.map((roster) => ({
    parentAvailabilityId: roster.parentAvailabilityId,
    activeStudents: (roster.students || []).filter((m) => m.status === "active").length,
  }));

  res.status(200).json({ success: true, requests, enrolledCounts });
});

exports.getAllScheduleChangeRequests = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status && ["pending", "approved", "rejected"].includes(req.query.status)) {
    filter.status = req.query.status;
  }

  const requests = await ScheduleChangeRequest.find(filter)
    .populate({ path: "teacherId", select: "userId", populate: { path: "userId", select: "name email employeeId" } })
    .populate("courseId", "name")
    .populate({ path: "affectedStudentIds", select: "userId", populate: { path: "userId", select: "name email" } })
    .populate("reviewedBy", "name")
    .sort({ status: 1, createdAt: -1 })
    .lean();

  res.status(200).json({ success: true, requests, total: requests.length });
});

// Removes the not-yet-started future occurrences of a class, so an approved move
// does not leave the class listed at both the old and the new time.
const dropFutureOccurrences = async (parentAvailabilityId) => {
  const now = new Date();
  const slots = await Slot.find({
    parentAvailabilityId,
    slotType: "enrolled",
    date: { $gte: startOfDay(now) },
  }).select("_id date startTime");

  const removable = slots.filter((slot) => !hasSlotStarted(slot, now)).map((slot) => slot._id);
  if (!removable.length) return 0;

  await Slot.deleteMany({ _id: { $in: removable } });
  return removable.length;
};

exports.reviewScheduleChangeRequest = asyncHandler(async (req, res) => {
  const { status, adminNote } = req.body;
  if (!REVIEW_STATUSES.includes(status)) {
    return res.status(400).json({ message: "Status must be 'approved' or 'rejected'" });
  }

  const request = await ScheduleChangeRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ message: "Request not found" });
  if (request.status !== "pending") {
    return res.status(400).json({ message: "This request has already been reviewed" });
  }

  const teacher = await Teacher.findById(request.teacherId).populate("userId", "name email");
  if (!teacher) {
    return res.status(404).json({ message: `Instructor not found. ${IT_SUPPORT_HINT}` });
  }

  const entry = (teacher.weeklyAvailability || []).id(request.parentAvailabilityId);
  if (!entry) {
    return res.status(409).json({
      message: `That class is no longer on the instructor's schedule, so this request cannot be applied. ${IT_SUPPORT_HINT}`,
    });
  }

  if (status === "rejected") {
    request.status = "rejected";
    request.adminNote = adminNote || "";
    request.reviewedBy = req.user.userId;
    request.reviewedAt = new Date();
    await request.save();

    notifyScheduleChangeReviewed({ teacher, request, status, adminNote });
    return res.status(200).json({ success: true, request });
  }

  if (request.changeType === "remove") {
    await dropFutureOccurrences(request.parentAvailabilityId);
    entry.deleteOne();
    await teacher.save();
    await ClassRoster.updateOne(
      { parentAvailabilityId: request.parentAvailabilityId },
      { $set: { status: "archived" } }
    );
  } else {
    // Subdocuments must be converted, not spread — spreading a Mongoose
    // document yields its internals, not its fields.
    const requested = request.requested?.toObject
      ? request.requested.toObject()
      : request.requested || {};
    const candidate = {
      ...entry.toObject(),
      ...requested,
      courseId: entry.courseId,
      slotType: entry.slotType,
    };
    candidate.maxStudents = getMaxStudents(candidate);

    // Re-validated now, not at request time — branch hours and the rest of the
    // timetable may have moved while the request sat in the queue.
    const validationError = await validateAvailabilityEntries([candidate]);
    if (validationError) return res.status(400).json({ message: validationError });

    const others = (teacher.weeklyAvailability || [])
      .filter((item) => String(item._id) !== String(entry._id))
      .map((item) => item.toObject());
    const overlapError = findAvailabilityOverlap({
      entries: [candidate],
      baseEntries: others,
    });
    if (overlapError) return res.status(400).json({ message: overlapError });

    const activeCount = await ClassRoster.findOne({
      parentAvailabilityId: request.parentAvailabilityId,
    })
      .select("students")
      .lean()
      .then((roster) =>
        (roster?.students || []).filter((m) => m.status === "active").length
      );
    if (activeCount > candidate.maxStudents) {
      return res.status(400).json({
        message: `That change caps the class at ${candidate.maxStudents} learner(s) but ${activeCount} are enrolled. Reassign learners first.`,
        hint: IT_SUPPORT_HINT,
      });
    }

    await dropFutureOccurrences(request.parentAvailabilityId);

    entry.set({
      days: candidate.days,
      startTime: candidate.startTime,
      endTime: candidate.endTime,
      sessionType: candidate.sessionType,
      branchId: candidate.branchId || null,
      maxStudents: candidate.maxStudents,
    });
    await teacher.save();

    await ClassRoster.updateOne(
      { parentAvailabilityId: request.parentAvailabilityId },
      {
        $set: {
          recurringDays: candidate.days,
          startTime: candidate.startTime,
          endTime: candidate.endTime,
          sessionType: candidate.sessionType,
          branchId: candidate.branchId || null,
          maxStudents: candidate.maxStudents,
        },
      }
    );
  }

  const { rangeStart, rangeEnd } = rollingRange();
  await syncTeacherAvailabilitySlots({ teacher, rangeStart, rangeEnd });
  await applyRostersToSlots({ teacherId: teacher._id, rangeStart, rangeEnd });

  request.status = "approved";
  request.adminNote = adminNote || "";
  request.reviewedBy = req.user.userId;
  request.reviewedAt = new Date();
  await request.save();

  // Not awaited — learner emails must not hold the admin's request open.
  notifyScheduleChangeReviewed({ teacher, request, status, adminNote });

  res.status(200).json({ success: true, request });
});
