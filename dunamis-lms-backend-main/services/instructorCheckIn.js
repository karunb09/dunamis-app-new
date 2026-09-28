const Branch = require("../model/branch.model");
const ClassRoster = require("../model/classRoster.model");
const DemoBooking = require("../model/demoBooking.model");
const InstructorCheckIn = require("../model/instructorCheckIn.model");
const Slot = require("../model/slot.model");
const Teacher = require("../model/teacher.model");
// Registered for the populates below; the app does it via index.js, tests don't.
require("../model/course.model");
require("../model/user.model");
require("../model/city.model");
require("../model/teacherApplication.model");
const { IT_SUPPORT_HINT } = require("../utils/availabilityRules");
const { parseTimeMinutes } = require("../utils/classRoster");
const { formatUserName } = require("../utils/formatName");
const { DEFAULT_GEOFENCE_RADIUS_M, haversineMeters, hasPin } = require("../utils/geo");
const {
  dayKeyFromDate,
  istDayEndExclusive,
  istDayStart,
  shiftDay,
  shiftMonth,
} = require("../utils/istMonth");
const { slotEndInstant, slotStartInstant } = require("../utils/slotTime");

// A reading's own margin of error gets the benefit of the doubt up to 100 m —
// indoor fixes are often ±50–80 m — but a ±500 m fix proves nothing.
const ACCURACY_ALLOWANCE_CAP_M = 100;
const MAX_ACCURACY_M = 500;
// This long after the last class ends, a check-out counts as a late logout, the
// reminder goes out, and the check-out may be made from anywhere.
const LATE_CHECKOUT_AFTER_MS = 30 * 60 * 1000;
const NO_CLASS_FALLBACK_MS = 3 * 60 * 60 * 1000;
const MAX_REPORT_DAYS = 62;

const fail = (statusCode, message, extra = {}) =>
  Object.assign(new Error(message), { statusCode, ...extra });

const toId = (value) => String(value?._id || value || "");

const minutesCeil = (ms) => Math.ceil(ms / 60000);

const formatIstTime = (value) =>
  new Date(value).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });

const formatDistance = (metres) =>
  metres >= 1000 ? `${(metres / 1000).toFixed(1)} km` : `${Math.round(metres)} m`;

const weakSignal = (accuracyM) =>
  fail(
    422,
    `Your location is too imprecise (±${Math.round(accuracyM)} m). Turn on precise location, step near a window and try again.`,
    { details: { accuracyM } }
  );

const evaluateGeofence = (branch, { lat, lng, accuracyM }) => {
  if (!hasPin(branch?.geo)) return { distanceM: null, radiusM: null, withinRadius: null };
  const radiusM = branch.geofenceRadiusM || DEFAULT_GEOFENCE_RADIUS_M;
  const distanceM = Math.round(haversineMeters(branch.geo, { lat, lng }));
  const allowance = Math.min(accuracyM, ACCURACY_ALLOWANCE_CAP_M);
  return { distanceM, radiusM, withinRadius: distanceM - allowance <= radiusM };
};

const outsideRadius = (branch, fence, accuracyM, advice) =>
  fail(422, `You are ${formatDistance(fence.distanceM)} from ${branch.branchName}. ${advice}`, {
    details: { distanceM: fence.distanceM, radiusM: fence.radiusM, accuracyM },
  });

const describeTeacher = (teacher) => ({
  _id: teacher?._id || null,
  userId: teacher?.userId?._id || null,
  name: formatUserName(teacher?.userId?.name, "Instructor"),
  email: teacher?.userId?.email || "",
  employeeId: teacher?.userId?.employeeId || "",
});

const teacherPopulate = {
  path: "createdBy",
  select: "userId",
  populate: { path: "userId", select: "name email employeeId" },
};

// The offline classes an instructor is actually expected at: enrolled slots
// with learners (the roster rescues an empty slot, as in the attendance report)
// and demo slots with a booking that wasn't cancelled. Most generated slots are
// empty availability and nobody needs to turn up for them.
const offlineClasses = async ({ from, to, teacherId = null, branchId = null }) => {
  const slots = await Slot.find({
    date: { $gte: istDayStart(from), $lt: istDayEndExclusive(to) },
    branchId: branchId || { $ne: null },
    ...(teacherId ? { createdBy: teacherId } : {}),
  })
    .select(
      "courseId branchId createdBy date startTime endTime slotType students parentAvailabilityId checkInReminderSentAt"
    )
    .populate("courseId", "name")
    .populate("branchId", "branchName")
    .populate(teacherPopulate)
    .lean();

  const live = slots.filter((slot) => slot.branchId && slot.createdBy);
  if (!live.length) return [];

  const emptyParents = live
    .filter(
      (slot) =>
        slot.slotType === "enrolled" && !(slot.students || []).length && slot.parentAvailabilityId
    )
    .map((slot) => slot.parentAvailabilityId);
  const rosters = emptyParents.length
    ? await ClassRoster.find({ parentAvailabilityId: { $in: emptyParents }, status: "active" })
        .select("parentAvailabilityId students")
        .lean()
    : [];
  const rosterSize = new Map(
    rosters.map((roster) => [
      toId(roster.parentAvailabilityId),
      (roster.students || []).filter((member) => member.status === "active").length,
    ])
  );

  const demoIds = live.filter((slot) => slot.slotType === "demo").map((slot) => slot._id);
  const bookings = demoIds.length
    ? await DemoBooking.aggregate([
        { $match: { slotId: { $in: demoIds }, demoStatus: { $ne: "Cancelled" } } },
        { $group: { _id: "$slotId", count: { $sum: 1 } } },
      ])
    : [];
  const bookingCount = new Map(bookings.map((row) => [toId(row._id), row.count]));

  return live
    .map((slot) => ({
      slotId: slot._id,
      slotType: slot.slotType,
      courseName: slot.courseId?.name || "Class",
      teacher: describeTeacher(slot.createdBy),
      branch: { _id: slot.branchId._id, branchName: slot.branchId.branchName },
      startAt: slotStartInstant(slot),
      endAt: slotEndInstant(slot),
      learners:
        slot.slotType === "demo"
          ? bookingCount.get(toId(slot._id)) || 0
          : (slot.students || []).length || rosterSize.get(toId(slot.parentAvailabilityId)) || 0,
      checkInReminderSentAt: slot.checkInReminderSentAt || null,
    }))
    .filter((cls) => cls.learners > 0)
    .sort((a, b) => a.startAt - b.startAt || a.courseName.localeCompare(b.courseName));
};

const isAssigned = async (teacherId, branch) => {
  if ((branch.teachers || []).some((id) => toId(id) === toId(teacherId))) return true;
  return Boolean(
    await Teacher.exists({ _id: teacherId, "weeklyAvailability.branchId": branch._id })
  );
};

// A visit with no scheduled class has nothing to end against, so the branch's
// closing time stands in — or three hours on, if that string is unreadable.
const fallbackCheckOutAt = (branch, dayKey, checkInAt) => {
  const closeMinutes = parseTimeMinutes(branch?.branchTimings?.[1]);
  const close = new Date(istDayStart(dayKey).getTime() + closeMinutes * 60000);
  return closeMinutes && close > checkInAt
    ? close
    : new Date(checkInAt.getTime() + NO_CLASS_FALLBACK_MS);
};

const lastEndOf = (classes) =>
  classes.length
    ? new Date(Math.max(...classes.map((cls) => new Date(cls.endAt).getTime())))
    : null;

// Classes that had not started when the instructor left go back to the pool,
// so a later visit to the same branch that day can claim them.
const keepStartedClasses = (visit, now) => {
  const classes = (visit.classes || []).filter((cls) => new Date(cls.startAt) < now);
  return { classes, lastClassEndAt: lastEndOf(classes) };
};

const buildFix = (fix, now, fence) => ({
  at: now,
  lat: fix.lat,
  lng: fix.lng,
  accuracyM: fix.accuracyM,
  distanceM: fence.distanceM,
  withinRadius: fence.withinRadius,
  deviceTime: fix.deviceTime || null,
  userAgent: fix.userAgent || "",
});

const OFFLINE_MODES = new Set(["offline", "hybrid"]);

// Branch check-in is for offline and hybrid instructors. An online instructor
// can't be linked to a branch or an offline course (assertCanTeachInPerson), so
// the mode always agrees with where they teach; linkedBranches only lets a new
// offline instructor's page explain why it is still empty.
const checkInAccess = async (teacherId) => {
  const teacher = await Teacher.findById(teacherId)
    .select("teacherDetail weeklyAvailability.branchId")
    .populate("teacherDetail", "mode")
    .lean();
  if (!teacher) return { eligible: false, mode: null, linkedBranches: 0 };

  const availabilityBranchIds = (teacher.weeklyAvailability || [])
    .map((entry) => entry.branchId)
    .filter(Boolean);
  const linkedBranches = await Branch.countDocuments({
    $or: [{ teachers: teacher._id }, { _id: { $in: availabilityBranchIds } }],
  });
  const mode = teacher.teacherDetail?.mode || null;
  return { eligible: OFFLINE_MODES.has(mode), mode, linkedBranches };
};

const teacherIdForUser = async (userId) => {
  const teacher = await Teacher.findOne({ userId }).select("_id").lean();
  if (!teacher) throw fail(403, "Instructor profile not found.", { hint: IT_SUPPORT_HINT });
  return teacher._id;
};

const checkIn = async ({ teacherId, branchId, fix, now = new Date() }) => {
  const { eligible } = await checkInAccess(teacherId);
  if (!eligible) {
    throw fail(
      403,
      "You're set up to teach online only, so there's no branch to check in to.",
      { hint: "If you teach at a centre, ask the admin team to switch you to offline or hybrid." }
    );
  }
  if (fix.accuracyM > MAX_ACCURACY_M) throw weakSignal(fix.accuracyM);

  const branch = await Branch.findById(branchId)
    .select("branchName geo geofenceRadiusM teachers branchTimings")
    .lean();
  if (!branch) throw fail(404, "Branch not found.");

  const dayKey = dayKeyFromDate(now);
  const todays = await offlineClasses({ from: dayKey, to: dayKey, teacherId, branchId });
  if (!todays.length && !(await isAssigned(teacherId, branch))) {
    throw fail(
      403,
      `You are not assigned to ${branch.branchName}. Ask the admin team to add you to this branch.`,
      { hint: IT_SUPPORT_HINT }
    );
  }

  const fence = evaluateGeofence(branch, fix);
  if (fence.withinRadius === false) {
    throw outsideRadius(
      branch,
      fence,
      fix.accuracyM,
      `Check-in only works within ${fence.radiusM} m of the branch.`
    );
  }

  const open = await InstructorCheckIn.findOne({ teacherId, status: "open" }).lean();
  if (open) {
    if (toId(open.branchId) === toId(branchId) && open.dayKey === dayKey) {
      throw fail(
        409,
        `You are already checked in at ${branch.branchName} since ${formatIstTime(open.checkIn.at)}.`
      );
    }
    // Checking in somewhere else closes the old visit without a check-out time.
    // Refusing instead would strand an instructor who forgot to check out at the
    // last branch: they are no longer inside its radius to do it.
    const { classes, lastClassEndAt } = keepStartedClasses(open, now);
    await InstructorCheckIn.updateOne(
      { _id: open._id, status: "open" },
      { $set: { status: "unclosed", classes, lastClassEndAt } }
    );
  }

  const earlier = await InstructorCheckIn.find({ teacherId, branchId, dayKey })
    .select("classes.slotId")
    .lean();
  const claimed = new Set(
    earlier.flatMap((visit) => (visit.classes || []).map((cls) => toId(cls.slotId)))
  );
  // A class that already ended with nobody checked in stays uncovered — it is
  // reported as missed, not folded into this visit as hours of lateness.
  const classes = todays.filter((cls) => cls.endAt > now && !claimed.has(toId(cls.slotId)));

  const firstClassStartAt = classes[0]?.startAt || null;
  const lastClassEndAt = lastEndOf(classes);
  const lateMs = firstClassStartAt ? now - firstClassStartAt : 0;

  try {
    const visit = await InstructorCheckIn.create({
      teacherId,
      branchId,
      dayKey,
      status: "open",
      checkIn: buildFix(fix, now, fence),
      classes: classes.map(({ slotId, courseName, slotType, startAt, endAt }) => ({
        slotId,
        courseName,
        slotType,
        startAt,
        endAt,
      })),
      firstClassStartAt,
      lastClassEndAt,
      expectedCheckOutAt: lastClassEndAt || fallbackCheckOutAt(branch, dayKey, now),
      flags: {
        lateCheckIn: lateMs > 0,
        lateByMinutes: lateMs > 0 ? minutesCeil(lateMs) : 0,
        noScheduledClass: !classes.length,
        locationUnverified: fence.withinRadius === null,
      },
    });
    return visit.toObject();
  } catch (err) {
    if (err?.code === 11000) {
      throw fail(409, "You are already checked in. Refresh the page to see your open visit.");
    }
    throw err;
  }
};

const checkOut = async ({ teacherId, visitId, fix, now = new Date() }) => {
  const visit = await InstructorCheckIn.findOne({ _id: visitId, teacherId }).lean();
  if (!visit) throw fail(404, "Check-in not found.");
  if (visit.status === "unclosed") {
    throw fail(
      409,
      "This visit was closed when you checked in at another branch. Ask the admin team to record when you left."
    );
  }
  if (visit.status !== "open") throw fail(409, "You have already checked out of this visit.");
  if (visit.dayKey !== dayKeyFromDate(now)) {
    throw fail(
      409,
      "Check-out for a previous day is closed. Ask the admin team to record when you left."
    );
  }

  const branch = await Branch.findById(visit.branchId)
    .select("branchName geo geofenceRadiusM")
    .lean();
  const { classes, lastClassEndAt } = keepStartedClasses(visit, now);
  const reference = lastClassEndAt || new Date(visit.expectedCheckOutAt);
  const lateWindowOpensAt = new Date(reference.getTime() + LATE_CHECKOUT_AFTER_MS);
  const lateCheckOut = now >= lateWindowOpensAt;
  const fence = evaluateGeofence(branch, fix);

  // Once the late window is open the instructor has plainly left, so the
  // reading only records where they were — it no longer has to prove presence.
  if (!lateCheckOut) {
    if (fix.accuracyM > MAX_ACCURACY_M) throw weakSignal(fix.accuracyM);
    if (fence.withinRadius === false) {
      throw outsideRadius(
        branch,
        fence,
        fix.accuracyM,
        `Check out from the branch — or, from ${formatIstTime(lateWindowOpensAt)}, from anywhere, marked as a late logout.`
      );
    }
  }

  const earlyMs = lastClassEndAt ? lastClassEndAt - now : 0;
  const updated = await InstructorCheckIn.findOneAndUpdate(
    { _id: visit._id, teacherId, status: "open" },
    {
      $set: {
        status: "closed",
        checkOut: { ...buildFix(fix, now, fence), offSite: fence.withinRadius === false },
        classes,
        lastClassEndAt,
        "flags.earlyCheckOut": earlyMs > 0,
        "flags.earlyByMinutes": earlyMs > 0 ? minutesCeil(earlyMs) : 0,
        "flags.lateCheckOut": lateCheckOut,
      },
    },
    { returnDocument: "after" }
  ).lean();
  if (!updated) throw fail(409, "You have already checked out of this visit.");
  return updated;
};

const latestCorrection = (visit) =>
  [...(visit.adminNotes || [])].reverse().find((note) => note.correctedCheckOutAt)
    ?.correctedCheckOutAt || null;

// Derived fields shared by the instructor and admin views. Admin notes are
// left off here: the instructor sees a corrected time, not the notes.
const describeVisit = (visit, todayKey) => {
  const correctedCheckOutAt = latestCorrection(visit);
  const effectiveCheckOutAt = correctedCheckOutAt || visit.checkOut?.at || null;
  return {
    _id: visit._id,
    branch: visit.branchId?._id
      ? { _id: visit.branchId._id, branchName: visit.branchId.branchName }
      : { _id: visit.branchId, branchName: "Branch" },
    dayKey: visit.dayKey,
    status: visit.status,
    checkIn: visit.checkIn,
    checkOut: visit.checkOut || null,
    classes: visit.classes || [],
    firstClassStartAt: visit.firstClassStartAt,
    lastClassEndAt: visit.lastClassEndAt,
    expectedCheckOutAt: visit.expectedCheckOutAt,
    flags: visit.flags || {},
    isOpen: visit.status === "open" && visit.dayKey === todayKey,
    missingLogout: !visit.checkOut && (visit.status === "unclosed" || visit.dayKey < todayKey),
    correctedCheckOutAt,
    minutesOnSite: effectiveCheckOutAt
      ? Math.max(0, Math.round((new Date(effectiveCheckOutAt) - new Date(visit.checkIn.at)) / 60000))
      : null,
  };
};

const describeAdminVisit = (visit, todayKey) => ({
  ...describeVisit(visit, todayKey),
  teacher: describeTeacher(visit.teacherId),
  adminNotes: (visit.adminNotes || []).map((note) => ({
    note: note.note,
    correctedCheckOutAt: note.correctedCheckOutAt,
    at: note.at,
    by: formatUserName(note.by?.name, "Admin"),
  })),
});

const emptyTally = () => ({
  visits: 0,
  lateCheckIns: 0,
  lateMinutes: 0,
  earlyCheckOuts: 0,
  earlyMinutes: 0,
  lateCheckOuts: 0,
  missingLogouts: 0,
  offSiteCheckOuts: 0,
  unverified: 0,
  minutesOnSite: 0,
  classesCovered: 0,
  classesMissed: 0,
});

const addVisitToTally = (tally, visit) => {
  tally.visits += 1;
  if (visit.flags.lateCheckIn) {
    tally.lateCheckIns += 1;
    tally.lateMinutes += visit.flags.lateByMinutes || 0;
  }
  if (visit.flags.earlyCheckOut) {
    tally.earlyCheckOuts += 1;
    tally.earlyMinutes += visit.flags.earlyByMinutes || 0;
  }
  if (visit.flags.lateCheckOut) tally.lateCheckOuts += 1;
  if (visit.missingLogout) tally.missingLogouts += 1;
  if (visit.checkOut?.offSite) tally.offSiteCheckOuts += 1;
  if (visit.flags.locationUnverified) tally.unverified += 1;
  tally.minutesOnSite += visit.minutesOnSite || 0;
  tally.classesCovered += visit.classes.length;
};

// Check-in counts as live from the first day anyone used it. Before that a
// class has no check-in because the feature didn't exist, and counting it as
// missed would bury the launch month (and later, pay) in false absences.
const checkInLiveSince = async () =>
  (await InstructorCheckIn.findOne().sort({ dayKey: 1 }).select("dayKey").lean())?.dayKey || null;

// Classes that have started with no visit covering them.
const missedClassesAmong = (classes, visits, now, liveSince) => {
  if (!liveSince) return [];
  const covered = new Set(
    visits.flatMap((visit) => (visit.classes || []).map((cls) => toId(cls.slotId)))
  );
  return classes.filter(
    (cls) =>
      cls.startAt <= now &&
      dayKeyFromDate(cls.startAt) >= liveSince &&
      !covered.has(toId(cls.slotId))
  );
};

const describeMissedClass = ({ slotId, slotType, courseName, teacher, branch, startAt, endAt, learners }) => ({
  slotId,
  slotType,
  courseName,
  teacher,
  branch,
  startAt,
  endAt,
  learners,
});

const getTeacherToday = async ({ teacherId, now = new Date() }) => {
  const dayKey = dayKeyFromDate(now);
  const [teacher, classes, visits] = await Promise.all([
    Teacher.findById(teacherId)
      .select("teacherDetail weeklyAvailability.branchId")
      .populate("teacherDetail", "mode")
      .lean(),
    offlineClasses({ from: dayKey, to: dayKey, teacherId }),
    InstructorCheckIn.find({ teacherId, dayKey })
      .populate("branchId", "branchName")
      .sort({ "checkIn.at": 1 })
      .lean(),
  ]);

  const linkedIds = [
    ...(teacher?.weeklyAvailability || []).map((entry) => toId(entry.branchId)),
    ...classes.map((cls) => toId(cls.branch._id)),
  ].filter(Boolean);
  const branches = await Branch.find({
    $or: [{ teachers: teacherId }, { _id: { $in: [...new Set(linkedIds)] } }],
  })
    .select("branchName location geo geofenceRadiusM city")
    .populate("city", "cityName")
    .lean();

  const coveredBy = new Map(
    visits.flatMap((visit) =>
      (visit.classes || []).map((cls) => [toId(cls.slotId), toId(visit._id)])
    )
  );

  const branchViews = branches
    .map((branch) => {
      const branchClasses = classes
        .filter((cls) => toId(cls.branch._id) === toId(branch._id))
        .map((cls) => ({
          slotId: cls.slotId,
          slotType: cls.slotType,
          courseName: cls.courseName,
          startAt: cls.startAt,
          endAt: cls.endAt,
          learners: cls.learners,
          coveredBy: coveredBy.get(toId(cls.slotId)) || null,
        }));
      return {
        _id: branch._id,
        branchName: branch.branchName,
        location: branch.location || "",
        cityName: branch.city?.cityName || "",
        pinned: hasPin(branch.geo),
        geo: hasPin(branch.geo) ? { lat: branch.geo.lat, lng: branch.geo.lng } : null,
        radiusM: branch.geofenceRadiusM || DEFAULT_GEOFENCE_RADIUS_M,
        classes: branchClasses,
      };
    })
    .sort(
      (a, b) =>
        (a.classes[0]?.startAt?.getTime() ?? Infinity) -
          (b.classes[0]?.startAt?.getTime() ?? Infinity) ||
        a.branchName.localeCompare(b.branchName)
    );

  const described = visits.map((visit) => describeVisit(visit, dayKey));
  return {
    dayKey,
    serverTime: now,
    mode: teacher?.teacherDetail?.mode || null,
    branches: branchViews,
    openVisit: described.find((visit) => visit.isOpen) || null,
    visits: described,
    rules: {
      lateCheckOutAfterMinutes: LATE_CHECKOUT_AFTER_MS / 60000,
      maxAccuracyM: MAX_ACCURACY_M,
    },
  };
};

const monthRange = (month) => ({
  from: `${month}-01`,
  to: shiftDay(`${shiftMonth(month, 1)}-01`, -1),
});

const getTeacherHistory = async ({ teacherId, month, now = new Date() }) => {
  const todayKey = dayKeyFromDate(now);
  const { from, to } = monthRange(month || todayKey.slice(0, 7));
  const [visits, classes, liveSince] = await Promise.all([
    InstructorCheckIn.find({ teacherId, dayKey: { $gte: from, $lte: to } })
      .populate("branchId", "branchName")
      .sort({ "checkIn.at": -1 })
      .lean(),
    offlineClasses({ from, to, teacherId }),
    checkInLiveSince(),
  ]);

  const described = visits.map((visit) => describeVisit(visit, todayKey));
  const totals = emptyTally();
  described.forEach((visit) => addVisitToTally(totals, visit));
  const missed = missedClassesAmong(classes, visits, now, liveSince);
  totals.classesMissed = missed.length;

  return {
    month: from.slice(0, 7),
    totals,
    visits: described,
    missedClasses: missed.map(describeMissedClass),
  };
};

const daysBetween = (from, to) =>
  Math.round((istDayStart(to) - istDayStart(from)) / 86400000) + 1;

const adminVisitQuery = (filter) =>
  InstructorCheckIn.find(filter)
    .populate({ path: "teacherId", select: "userId", populate: { path: "userId", select: "name email employeeId" } })
    .populate("branchId", "branchName")
    .populate("adminNotes.by", "name");

// branchIds: the caller's area (a scoped admin); null for every branch.
const buildCheckInReport = async ({
  from,
  to,
  teacherId = null,
  branchId = null,
  branchIds = null,
  now = new Date(),
}) => {
  const todayKey = dayKeyFromDate(now);
  const rangeFrom = from || todayKey;
  const rangeTo = to || rangeFrom;
  if (rangeFrom > rangeTo) throw fail(400, "The start date must be on or before the end date.");
  if (daysBetween(rangeFrom, rangeTo) > MAX_REPORT_DAYS) {
    throw fail(400, `Pick a range of ${MAX_REPORT_DAYS} days or fewer.`);
  }

  const filter = {
    dayKey: { $gte: rangeFrom, $lte: rangeTo },
    ...(teacherId ? { teacherId } : {}),
    ...(branchId ? { branchId } : branchIds ? { branchId: { $in: branchIds } } : {}),
  };
  const inArea = (id) => !branchIds || branchIds.some((allowed) => toId(allowed) === toId(id));
  const [visits, allClasses, unpinnedBranches, liveSince] = await Promise.all([
    adminVisitQuery(filter).sort({ "checkIn.at": -1 }).lean(),
    offlineClasses({ from: rangeFrom, to: rangeTo, teacherId, branchId }),
    Branch.find({ status: "active", "geo.lat": null, ...(branchIds ? { _id: { $in: branchIds } } : {}) })
      .select("branchName")
      .sort({ branchName: 1 })
      .lean(),
    checkInLiveSince(),
  ]);

  const classes = allClasses.filter((cls) => inArea(cls.branch._id));
  const described = visits.map((visit) => describeAdminVisit(visit, todayKey));
  const missed = missedClassesAmong(classes, visits, now, liveSince).map(describeMissedClass);

  const byTeacher = new Map();
  const rowFor = (teacher) => {
    const key = toId(teacher._id);
    if (!byTeacher.has(key)) {
      byTeacher.set(key, {
        teacherId: teacher._id,
        name: teacher.name,
        employeeId: teacher.employeeId,
        ...emptyTally(),
      });
    }
    return byTeacher.get(key);
  };
  described.forEach((visit) => addVisitToTally(rowFor(visit.teacher), visit));
  missed.forEach((cls) => {
    rowFor(cls.teacher).classesMissed += 1;
  });

  const summary = [...byTeacher.values()].sort(
    (a, b) =>
      b.lateCheckIns - a.lateCheckIns ||
      b.earlyCheckOuts - a.earlyCheckOuts ||
      a.name.localeCompare(b.name)
  );

  const totals = emptyTally();
  described.forEach((visit) => addVisitToTally(totals, visit));
  totals.classesMissed = missed.length;
  totals.openNow = described.filter((visit) => visit.isOpen).length;

  return {
    range: { from: rangeFrom, to: rangeTo },
    liveSince,
    generatedAt: now,
    totals,
    summary,
    visits: described,
    missedClasses: missed,
    unpinnedBranches,
  };
};

const addAdminNote = async ({ visitId, userId, note, correctedCheckOutAt = null, now = new Date() }) => {
  const visit = await InstructorCheckIn.findById(visitId).select("checkIn status dayKey").lean();
  if (!visit) throw fail(404, "Check-in not found.");

  if (correctedCheckOutAt) {
    const corrected = new Date(correctedCheckOutAt);
    const checkInAt = new Date(visit.checkIn.at);
    if (visit.status === "open" && visit.dayKey === dayKeyFromDate(now)) {
      throw fail(
        409,
        "The instructor is still checked in. Add a corrected time once they check out or the day ends."
      );
    }
    if (corrected <= checkInAt) {
      throw fail(400, "The corrected check-out must be after the check-in time.");
    }
    if (corrected - checkInAt > 24 * 60 * 60 * 1000) {
      throw fail(400, "The corrected check-out must be within 24 hours of the check-in.");
    }
    if (corrected > now) throw fail(400, "The corrected check-out can't be in the future.");
  }

  await InstructorCheckIn.updateOne(
    { _id: visitId },
    {
      $push: {
        adminNotes: {
          note,
          correctedCheckOutAt: correctedCheckOutAt ? new Date(correctedCheckOutAt) : null,
          by: userId,
          at: now,
        },
      },
    }
  );

  const updated = await adminVisitQuery({ _id: visitId }).lean();
  return describeAdminVisit(updated[0], dayKeyFromDate(now));
};

module.exports = {
  LATE_CHECKOUT_AFTER_MS,
  MAX_ACCURACY_M,
  addAdminNote,
  buildCheckInReport,
  checkIn,
  checkInAccess,
  checkInLiveSince,
  checkOut,
  evaluateGeofence,
  getTeacherHistory,
  getTeacherToday,
  offlineClasses,
  teacherIdForUser,
};
