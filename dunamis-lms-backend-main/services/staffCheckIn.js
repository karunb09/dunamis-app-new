const Branch = require("../model/branch.model");
const StaffCheckIn = require("../model/staffCheckIn.model");
const User = require("../model/user.model");
// Registered for the populates below; the app does it via index.js, tests don't.
require("../model/city.model");
const { parseTimeMinutes } = require("../utils/classRoster");
const { formatUserName } = require("../utils/formatName");
const { DEFAULT_GEOFENCE_RADIUS_M, hasPin } = require("../utils/geo");
const { dayKeyFromDate, istDayStart, shiftDay } = require("../utils/istMonth");
const { ALL, loadScopeCatalog, resolveScope } = require("../utils/orgScope");
const { DESIGNATIONS, modeIncludes } = require("../utils/orgStructure");
const {
  LATE_CHECKOUT_AFTER_MS,
  MAX_ACCURACY_M,
  assertCorrectionAllowed,
  buildFix,
  describeNotes,
  evaluateGeofence,
  fail,
  fallbackCheckOutAt,
  formatIstTime,
  latestCorrection,
  minutesCeil,
  monthRange,
  outsideRadius,
  resolveRange,
  toId,
  weakSignal,
} = require("./checkInCore");

// Branch staff who check in: AAs at their branches, BDEs across their zones.
const STAFF_DESIGNATIONS = ["aa", "bde"];
const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const BRANCH_FIELDS = "branchName location geo geofenceRadiusM branchTimings branchOpenDays city status";
const USER_FIELDS = "name email employeeId accountType accountStatus org createdAt";

const placementHint =
  "If you work at this centre, ask an admin with Admin Management to add it to your placement.";

const isStaffRole = (user) =>
  user?.accountType === "admin" &&
  STAFF_DESIGNATIONS.includes(user.org?.designation) &&
  modeIncludes(user.org?.workMode, "offline");

// The branches a staff member's placement covers, as id strings. A scope with
// no entries in its offline dimension means every branch.
const branchIdsFor = (user, catalog) => {
  const { offline } = resolveScope(user.org, catalog);
  if (offline === ALL) return catalog.branches.map((branch) => toId(branch._id));
  return offline instanceof Set ? [...offline] : [];
};

const describeStaff = (user) => ({
  _id: user?._id || null,
  name: formatUserName(user?.name, "Staff member"),
  email: user?.email || "",
  employeeId: user?.employeeId || "",
  designation: user?.org?.designation || null,
  designationLabel: DESIGNATIONS[user?.org?.designation]?.label || "",
});

// Who gets branch check-in: active AAs and BDEs whose work includes offline.
// branchCount lets a newly placed person's page explain why it is empty.
const staffCheckInAccess = async (user, catalog = null) => {
  if (!isStaffRole(user) || user.accountStatus !== "active") {
    return { eligible: false, designation: user?.org?.designation || null, branchCount: 0 };
  }
  const ids = branchIdsFor(user, catalog || (await loadScopeCatalog()));
  const branchCount = await Branch.countDocuments({ _id: { $in: ids }, status: "active" });
  return { eligible: true, designation: user.org.designation, branchCount };
};

const timeOn = (dayKey, value) =>
  String(value || "").trim()
    ? new Date(istDayStart(dayKey).getTime() + parseTimeMinutes(value) * 60000)
    : null;

const weekdayOf = (dayKey) => {
  const [year, month, day] = dayKey.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
};

// A branch with no open days listed is treated as open every day.
const isClosedOn = (branch, dayKey) => {
  const openDays = (branch?.branchOpenDays || []).map((day) => String(day).toLowerCase());
  return openDays.length > 0 && !openDays.includes(weekdayOf(dayKey));
};

const branchHoursFor = (branch, dayKey) => ({
  opensAt: timeOn(dayKey, branch?.branchTimings?.[0]),
  closesAt: timeOn(dayKey, branch?.branchTimings?.[1]),
  closedToday: isClosedOn(branch, dayKey),
});

const loadUser = async (userId) => {
  const user = await User.findById(userId).select(USER_FIELDS).lean();
  if (!user) throw fail(404, "Account not found.");
  return user;
};

const assertEligible = async (user, catalog) => {
  const access = await staffCheckInAccess(user, catalog);
  if (!access.eligible) {
    throw fail(403, "Branch check-in is for AAs and BDEs who work at a branch.", {
      hint: "If you work at a centre, ask an admin with Admin Management to set your placement.",
    });
  }
};

const checkIn = async ({ userId, branchId, fix, now = new Date() }) => {
  const user = await loadUser(userId);
  const catalog = await loadScopeCatalog();
  await assertEligible(user, catalog);
  if (fix.accuracyM > MAX_ACCURACY_M) throw weakSignal(fix.accuracyM);

  const branch = await Branch.findById(branchId).select(BRANCH_FIELDS).lean();
  if (!branch) throw fail(404, "Branch not found.");
  if (!branchIdsFor(user, catalog).includes(toId(branch._id))) {
    throw fail(403, `${branch.branchName} isn't one of your branches.`, { hint: placementHint });
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

  const dayKey = dayKeyFromDate(now);
  const open = await StaffCheckIn.findOne({ userId, status: "open" }).lean();
  if (open) {
    if (toId(open.branchId) === toId(branchId) && open.dayKey === dayKey) {
      throw fail(
        409,
        `You are already checked in at ${branch.branchName} since ${formatIstTime(open.checkIn.at)}.`
      );
    }
    // Checking in somewhere else closes the old visit without a check-out time,
    // as for instructors: refusing would strand someone who forgot to check out
    // at the last branch and is no longer inside its radius.
    await StaffCheckIn.updateOne({ _id: open._id, status: "open" }, { $set: { status: "unclosed" } });
  }

  const hours = branchHoursFor(branch, dayKey);
  try {
    const visit = await StaffCheckIn.create({
      userId,
      branchId,
      dayKey,
      status: "open",
      checkIn: buildFix(fix, now, fence),
      branchOpensAt: hours.opensAt,
      branchClosesAt: hours.closesAt,
      branchClosedToday: hours.closedToday,
      expectedCheckOutAt: fallbackCheckOutAt(branch, dayKey, now),
      flags: { locationUnverified: fence.withinRadius === null },
    });
    return visit.toObject();
  } catch (err) {
    if (err?.code === 11000) {
      throw fail(409, "You are already checked in. Refresh the page to see your open visit.");
    }
    throw err;
  }
};

const checkOut = async ({ userId, visitId, fix, now = new Date() }) => {
  const visit = await StaffCheckIn.findOne({ _id: visitId, userId }).lean();
  if (!visit) throw fail(404, "Check-in not found.");
  if (visit.status === "unclosed") {
    throw fail(
      409,
      "This visit was closed when you checked in at another branch. Ask the admin team to record when you left."
    );
  }
  if (visit.status !== "open") throw fail(409, "You have already checked out of this visit.");
  if (visit.dayKey !== dayKeyFromDate(now)) {
    throw fail(409, "Check-out for a previous day is closed. Ask the admin team to record when you left.");
  }

  const branch = await Branch.findById(visit.branchId).select("branchName geo geofenceRadiusM").lean();
  const lateWindowOpensAt = new Date(new Date(visit.expectedCheckOutAt).getTime() + LATE_CHECKOUT_AFTER_MS);
  const lateCheckOut = now >= lateWindowOpensAt;
  const fence = evaluateGeofence(branch, fix);

  // Once the late window is open the person has plainly left, so the reading
  // only records where they were — it no longer has to prove presence.
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

  const updated = await StaffCheckIn.findOneAndUpdate(
    { _id: visit._id, userId, status: "open" },
    {
      $set: {
        status: "closed",
        checkOut: { ...buildFix(fix, now, fence), offSite: fence.withinRadius === false },
        "flags.lateCheckOut": lateCheckOut,
      },
    },
    { returnDocument: "after" }
  ).lean();
  if (!updated) throw fail(409, "You have already checked out of this visit.");
  return updated;
};

const describeVisit = (visit, todayKey, { withNotes = false } = {}) => {
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
    branchOpensAt: visit.branchOpensAt,
    branchClosesAt: visit.branchClosesAt,
    branchClosedToday: Boolean(visit.branchClosedToday),
    expectedCheckOutAt: visit.expectedCheckOutAt,
    flags: visit.flags || {},
    isOpen: visit.status === "open" && visit.dayKey === todayKey,
    missingLogout: !visit.checkOut && (visit.status === "unclosed" || visit.dayKey < todayKey),
    correctedCheckOutAt,
    minutesOnSite: effectiveCheckOutAt
      ? Math.max(0, Math.round((new Date(effectiveCheckOutAt) - new Date(visit.checkIn.at)) / 60000))
      : null,
    ...(withNotes
      ? { adminNotes: describeNotes(visit.adminNotes, (by) => formatUserName(by?.name, "Admin")) }
      : {}),
  };
};

// One person's day, judged at its two ends only: the first check-in against
// that branch's opening, the last check-out against that branch's closing.
// Check-outs and check-ins in between are travel between branches.
const describeDay = (visits) => {
  const ordered = [...visits].sort((a, b) => new Date(a.checkIn.at) - new Date(b.checkIn.at));
  const first = ordered[0];
  const last = ordered[ordered.length - 1];

  const lateMs =
    !first.branchClosedToday && first.branchOpensAt
      ? new Date(first.checkIn.at) - new Date(first.branchOpensAt)
      : 0;
  // Raw check-out only: an admin correction changes hours, never the flags.
  const earlyMs =
    last.status === "closed" && !last.branchClosedToday && last.branchClosesAt && last.checkOut
      ? new Date(last.branchClosesAt) - new Date(last.checkOut.at)
      : 0;

  return {
    dayKey: first.dayKey,
    visits: ordered,
    branches: [...new Set(ordered.map((visit) => visit.branch.branchName))],
    firstInAt: first.checkIn.at,
    lastOutAt: last.checkOut?.at || null,
    lastOutCorrectedAt: last.correctedCheckOutAt,
    lateCheckIn: lateMs > 0,
    lateByMinutes: lateMs > 0 ? minutesCeil(lateMs) : 0,
    earlyCheckOut: earlyMs > 0,
    earlyByMinutes: earlyMs > 0 ? minutesCeil(earlyMs) : 0,
    missingLogout: ordered.some((visit) => visit.missingLogout),
    lateCheckOut: ordered.some((visit) => visit.flags.lateCheckOut),
    offSite: ordered.some((visit) => visit.checkOut?.offSite),
    locationUnverified: ordered.some((visit) => visit.flags.locationUnverified),
    branchClosedToday: Boolean(first.branchClosedToday),
    isOpen: ordered.some((visit) => visit.isOpen),
    minutesOnSite: ordered.reduce((sum, visit) => sum + (visit.minutesOnSite || 0), 0),
  };
};

const groupDays = (described, keyOf = (visit) => visit.dayKey) => {
  const groups = new Map();
  for (const visit of described) {
    const key = keyOf(visit);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(visit);
  }
  return [...groups.values()].map(describeDay);
};

const emptyTally = () => ({
  days: 0,
  lateDays: 0,
  lateMinutes: 0,
  earlyDays: 0,
  earlyMinutes: 0,
  missingLogouts: 0,
  lateCheckOuts: 0,
  offSiteCheckOuts: 0,
  unverified: 0,
  minutesOnSite: 0,
  noCheckInDays: 0,
});

const addDayToTally = (tally, day) => {
  tally.days += 1;
  if (day.lateCheckIn) {
    tally.lateDays += 1;
    tally.lateMinutes += day.lateByMinutes;
  }
  if (day.earlyCheckOut) {
    tally.earlyDays += 1;
    tally.earlyMinutes += day.earlyByMinutes;
  }
  if (day.missingLogout) tally.missingLogouts += 1;
  if (day.lateCheckOut) tally.lateCheckOuts += 1;
  if (day.offSite) tally.offSiteCheckOuts += 1;
  if (day.locationUnverified) tally.unverified += 1;
  tally.minutesOnSite += day.minutesOnSite;
};

// Staff check-in counts as live from the first day anyone used it, so the
// days before it existed never read as absences.
const staffLiveSince = async () =>
  (await StaffCheckIn.findOne().sort({ dayKey: 1 }).select("dayKey").lean())?.dayKey || null;

// Finished days (never today) on which at least one of the person's branches
// was open and they checked in nowhere.
const noCheckInDaysFor = ({ user, branches, from, to, visitedDays, liveSince, todayKey }) => {
  if (!liveSince || !branches.length) return [];
  const joined = user.createdAt ? dayKeyFromDate(new Date(user.createdAt)) : from;
  let day = [from, liveSince, joined].sort().pop();
  const last = to < todayKey ? to : shiftDay(todayKey, -1);
  const missed = [];
  while (day <= last) {
    const open = branches.filter((branch) => !isClosedOn(branch, day));
    if (open.length && !visitedDays.has(day)) {
      missed.push({ dayKey: day, branches: open.map((branch) => branch.branchName) });
    }
    day = shiftDay(day, 1);
  }
  return missed;
};

const getStaffToday = async ({ userId, now = new Date() }) => {
  const dayKey = dayKeyFromDate(now);
  const user = await loadUser(userId);
  const catalog = await loadScopeCatalog();
  const access = await staffCheckInAccess(user, catalog);
  const [branches, visits] = await Promise.all([
    access.eligible
      ? Branch.find({ _id: { $in: branchIdsFor(user, catalog) }, status: "active" })
          .select(BRANCH_FIELDS)
          .populate("city", "cityName")
          .lean()
      : [],
    StaffCheckIn.find({ userId, dayKey }).populate("branchId", "branchName").sort({ "checkIn.at": 1 }).lean(),
  ]);

  const branchViews = branches
    .map((branch) => {
      const hours = branchHoursFor(branch, dayKey);
      return {
        _id: branch._id,
        branchName: branch.branchName,
        location: branch.location || "",
        cityName: branch.city?.cityName || "",
        pinned: hasPin(branch.geo),
        geo: hasPin(branch.geo) ? { lat: branch.geo.lat, lng: branch.geo.lng } : null,
        radiusM: branch.geofenceRadiusM || DEFAULT_GEOFENCE_RADIUS_M,
        hours,
      };
    })
    .sort(
      (a, b) =>
        Number(a.hours.closedToday) - Number(b.hours.closedToday) ||
        (a.hours.opensAt?.getTime() ?? Infinity) - (b.hours.opensAt?.getTime() ?? Infinity) ||
        a.branchName.localeCompare(b.branchName)
    );

  const described = visits.map((visit) => describeVisit(visit, dayKey));
  return {
    dayKey,
    serverTime: now,
    access,
    branches: branchViews,
    openVisit: described.find((visit) => visit.isOpen) || null,
    visits: described,
    day: described.length ? describeDay(described) : null,
    rules: {
      lateCheckOutAfterMinutes: LATE_CHECKOUT_AFTER_MS / 60000,
      maxAccuracyM: MAX_ACCURACY_M,
    },
  };
};

const getStaffHistory = async ({ userId, month, now = new Date() }) => {
  const todayKey = dayKeyFromDate(now);
  const { from, to } = monthRange(month || todayKey.slice(0, 7));
  const user = await loadUser(userId);
  const catalog = await loadScopeCatalog();
  const [visits, branches, liveSince] = await Promise.all([
    StaffCheckIn.find({ userId, dayKey: { $gte: from, $lte: to } })
      .populate("branchId", "branchName")
      .lean(),
    isStaffRole(user)
      ? Branch.find({ _id: { $in: branchIdsFor(user, catalog) }, status: "active" })
          .select("branchName branchOpenDays")
          .lean()
      : [],
    staffLiveSince(),
  ]);

  const days = groupDays(visits.map((visit) => describeVisit(visit, todayKey))).sort((a, b) =>
    b.dayKey.localeCompare(a.dayKey)
  );
  const totals = emptyTally();
  days.forEach((day) => addDayToTally(totals, day));
  const noCheckIn = noCheckInDaysFor({
    user,
    branches,
    from,
    to,
    visitedDays: new Set(days.map((day) => day.dayKey)),
    liveSince,
    todayKey,
  });
  totals.noCheckInDays = noCheckIn.length;

  return { month: from.slice(0, 7), totals, days, noCheckInDays: noCheckIn };
};

const adminVisitQuery = (filter) =>
  StaffCheckIn.find(filter)
    .populate("userId", "name email employeeId org.designation")
    .populate("branchId", "branchName")
    .populate("adminNotes.by", "name");

// branchIds: the caller's area (a scoped admin); null for every branch.
const buildStaffCheckInReport = async ({
  from,
  to,
  userId = null,
  branchId = null,
  branchIds = null,
  now = new Date(),
}) => {
  const todayKey = dayKeyFromDate(now);
  const { rangeFrom, rangeTo } = resolveRange({ from, to, todayKey });
  const area = branchIds ? new Set(branchIds.map(toId)) : null;
  const inView = (id) => (branchId ? toId(id) === toId(branchId) : !area || area.has(toId(id)));

  const catalog = await loadScopeCatalog();
  // Every visit in the range, not only those in view: a day is judged on the
  // person's real first check-in and last check-out, wherever they were.
  const [visits, staff, activeBranches, liveSince] = await Promise.all([
    adminVisitQuery({
      dayKey: { $gte: rangeFrom, $lte: rangeTo },
      ...(userId ? { userId } : {}),
    })
      .sort({ "checkIn.at": -1 })
      .lean(),
    User.find({
      accountType: "admin",
      accountStatus: "active",
      "org.designation": { $in: STAFF_DESIGNATIONS },
      ...(userId ? { _id: userId } : {}),
    })
      .select(USER_FIELDS)
      .lean(),
    Branch.find({ status: "active" }).select("branchName branchOpenDays geo").lean(),
    staffLiveSince(),
  ]);

  const described = visits.map((visit) => ({
    ...describeVisit(visit, todayKey, { withNotes: true }),
    person: describeStaff(visit.userId),
  }));
  const allDays = groupDays(described, (visit) => `${toId(visit.person._id)}|${visit.dayKey}`);
  // A day appears when any of its visits is in view, and lists only those;
  // visits elsewhere stay out of a scoped admin's sight.
  const days = allDays
    .filter((day) => day.visits.some((visit) => inView(visit.branch._id)))
    .map((day) => {
      const visible = day.visits.filter((visit) => inView(visit.branch._id));
      return {
        ...day,
        visits: visible,
        branches: [...new Set(visible.map((visit) => visit.branch.branchName))],
        person: day.visits[0].person,
      };
    })
    .sort((a, b) => b.dayKey.localeCompare(a.dayKey) || a.person.name.localeCompare(b.person.name));

  // A day counts as visited if the person checked in anywhere, even at a branch
  // outside this view — a BDE on the other side of their zone wasn't absent.
  const people = staff.filter(isStaffRole);
  const visitedBy = new Map();
  for (const day of allDays) {
    const key = toId(day.visits[0].person._id);
    if (!visitedBy.has(key)) visitedBy.set(key, new Set());
    visitedBy.get(key).add(day.dayKey);
  }

  const branchById = new Map(activeBranches.map((branch) => [toId(branch._id), branch]));
  const noCheckInDays = people.flatMap((person) => {
    const theirs = branchIdsFor(person, catalog)
      .filter(inView)
      .map((id) => branchById.get(id))
      .filter(Boolean);
    return noCheckInDaysFor({
      user: person,
      branches: theirs,
      from: rangeFrom,
      to: rangeTo,
      visitedDays: visitedBy.get(toId(person._id)) || new Set(),
      liveSince,
      todayKey,
    }).map((day) => ({ ...day, person: describeStaff(person) }));
  });

  const byPerson = new Map();
  const rowFor = (person) => {
    const key = toId(person._id);
    if (!byPerson.has(key)) byPerson.set(key, { ...person, ...emptyTally() });
    return byPerson.get(key);
  };
  days.forEach((day) => addDayToTally(rowFor(day.person), day));
  noCheckInDays.forEach((day) => {
    rowFor(day.person).noCheckInDays += 1;
  });

  const summary = [...byPerson.values()].sort(
    (a, b) =>
      b.lateDays - a.lateDays ||
      b.earlyDays - a.earlyDays ||
      b.noCheckInDays - a.noCheckInDays ||
      a.name.localeCompare(b.name)
  );

  const totals = emptyTally();
  days.forEach((day) => addDayToTally(totals, day));
  totals.noCheckInDays = noCheckInDays.length;
  totals.openNow = days.filter((day) => day.isOpen).length;

  return {
    range: { from: rangeFrom, to: rangeTo },
    liveSince,
    generatedAt: now,
    totals,
    summary,
    days,
    noCheckInDays: noCheckInDays.sort(
      (a, b) => b.dayKey.localeCompare(a.dayKey) || a.person.name.localeCompare(b.person.name)
    ),
    unpinnedBranches: activeBranches
      .filter((branch) => !hasPin(branch.geo) && inView(branch._id))
      .map(({ _id, branchName }) => ({ _id, branchName }))
      .sort((a, b) => a.branchName.localeCompare(b.branchName)),
  };
};

const addStaffNote = async ({ visitId, userId, note, correctedCheckOutAt = null, now = new Date() }) => {
  const visit = await StaffCheckIn.findById(visitId).select("userId checkIn status dayKey").lean();
  if (!visit) throw fail(404, "Check-in not found.");
  // Corrections decide hours, so nobody writes them for themselves.
  if (toId(visit.userId) === toId(userId)) {
    throw fail(403, "You can't add a note to your own check-in.", {
      hint: "Ask another admin with Reports access to record it.",
    });
  }
  const todayKey = dayKeyFromDate(now);
  assertCorrectionAllowed({ visit, correctedCheckOutAt, now, todayKey, who: "They" });

  await StaffCheckIn.updateOne(
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

  const [updated] = await adminVisitQuery({ _id: visitId }).lean();
  return { ...describeVisit(updated, todayKey, { withNotes: true }), person: describeStaff(updated.userId) };
};

module.exports = {
  addStaffNote,
  branchHoursFor,
  branchIdsFor,
  buildStaffCheckInReport,
  checkIn,
  checkOut,
  getStaffHistory,
  getStaffToday,
  isClosedOn,
  isStaffRole,
  staffCheckInAccess,
  staffLiveSince,
};
