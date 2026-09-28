const CommunicationRule = require("../model/communicationRule.model");

const AUDIENCES = ["learner", "instructor", "aa", "bde"];
const CHANNELS = ["email", "notification"];

// Who hears about what (CEO communication sheet, Sep 2026). One channel per
// row: "email" rows send email only, "notification" rows a dashboard notice
// only. AA / BDE are the people responsible for the learner's branch or course
// (services/staffRouting.js). Receipts, the welcome email, OTPs, passwords and
// join links are always sent and are not rows here.
const COMMUNICATION_MATRIX = {
  // Learners record
  demoBooked: { learner: true, instructor: true, aa: true, bde: true, channel: "email" },
  signUp: { learner: true, instructor: false, aa: true, bde: true, channel: "notification" },
  courseEnrolled: { learner: true, instructor: true, aa: true, bde: true, channel: "email" },
  classReminder: { learner: true, instructor: true, aa: true, bde: false, channel: "notification", contentType: "Reminder" },
  classAttendance: { learner: true, instructor: true, aa: true, bde: true, channel: "notification" },
  homework: { learner: true, instructor: true, aa: true, bde: false, channel: "notification" },
  feeReminder: { learner: true, instructor: false, aa: true, bde: true, channel: "email", contentType: "Reminder" },
  feeReceived: { learner: false, instructor: false, aa: true, bde: true, channel: "notification" },
  assignmentCycle: { learner: true, instructor: true, aa: true, bde: true, channel: "notification" },
  assessmentCycle: { learner: true, instructor: true, aa: true, bde: true, channel: "email" },
  // Instructors record
  demoRescheduled: { learner: true, instructor: true, aa: true, bde: true, channel: "email" },
  classRescheduled: { learner: true, instructor: true, aa: true, bde: true, channel: "email" },
  missedAttendance: { learner: false, instructor: true, aa: true, bde: true, channel: "notification" },
  dailyAttendanceReport: { learner: false, instructor: false, aa: true, bde: true, channel: "email" },
  // Not on the sheet.
  // Fires 15 minutes before a class. AA/BDE excluded — nothing for them to act
  // on, and one row per class per day would bury every other notice.
  classJoinLink: { learner: false, instructor: true, aa: false, bde: false, channel: "notification", contentType: "Reminder" },
  // AA/BDE excluded on purpose — the outgoing instructor may have resigned,
  // there's nothing for sales/coordination staff to act on here.
  enrollmentReassigned: { learner: false, instructor: true, aa: false, bde: false, channel: "email" },
  // Missing branch check-in / check-out nudges. Admins read the same gaps off the
  // Instructor Check-ins page, so AA/BDE copies would only be noise.
  instructorCheckIn: { learner: false, instructor: true, aa: false, bde: false, channel: "email" },
};

const RECEIPT = "Receipt — always sent";
const NOT_APPLICABLE = "Not applicable";

// The rows as the dashboard shows them (sheet sections and wording). `locked`
// cells can't be changed: learners always get a receipt, and some events
// have no learner or instructor to tell.
const MATRIX_ROWS = [
  { event: "demoBooked", section: "learners", label: "Demo" },
  { event: "signUp", section: "learners", label: "Sign up", locked: { instructor: NOT_APPLICABLE } },
  { event: "courseEnrolled", section: "learners", label: "Course enrolled", locked: { learner: RECEIPT } },
  { event: "classReminder", section: "learners", label: "Class reminder" },
  { event: "classAttendance", section: "learners", label: "Class attendance" },
  { event: "homework", section: "learners", label: "Homework" },
  { event: "feeReminder", section: "learners", label: "Fee reminders", locked: { instructor: NOT_APPLICABLE } },
  {
    event: "feeReceived",
    section: "learners",
    label: "Fee received",
    locked: { learner: RECEIPT, instructor: NOT_APPLICABLE },
  },
  { event: "assignmentCycle", section: "learners", label: "Assignments (monthly)" },
  { event: "assessmentCycle", section: "learners", label: "Assessments (6-monthly)" },
  { event: "demoRescheduled", section: "instructors", label: "Demo reschedule" },
  { event: "classRescheduled", section: "instructors", label: "Class reschedule" },
  {
    event: "missedAttendance",
    section: "instructors",
    label: "Missed homework & attendance marking",
    locked: { learner: NOT_APPLICABLE },
  },
  {
    event: "dailyAttendanceReport",
    section: "instructors",
    label: "Daily attendance report",
    locked: { learner: NOT_APPLICABLE, instructor: NOT_APPLICABLE },
  },
  {
    event: "classJoinLink",
    section: "other",
    label: "Class has no join link (15 min before)",
    locked: { learner: NOT_APPLICABLE },
  },
  {
    event: "enrollmentReassigned",
    section: "other",
    label: "Learner moved to another instructor",
    locked: { learner: NOT_APPLICABLE },
  },
  {
    event: "instructorCheckIn",
    section: "other",
    label: "Missing branch check-in / check-out",
    locked: { learner: NOT_APPLICABLE },
  },
];

const ROW_BY_EVENT = new Map(MATRIX_ROWS.map((row) => [row.event, row]));

// Overrides are read on every message, so they're cached. Each PM2 process
// has its own cache: a change reaches the others within CACHE_MS.
const CACHE_MS = 60_000;
let cache = { at: 0, overrides: new Map() };

const invalidateRules = () => {
  cache = { at: 0, overrides: new Map() };
};

const loadOverrides = async () => {
  if (Date.now() - cache.at < CACHE_MS) return cache.overrides;
  const docs = await CommunicationRule.find().lean();
  cache = { at: Date.now(), overrides: new Map(docs.map((doc) => [doc.event, doc])) };
  return cache.overrides;
};

// Locked cells always keep the code default, whatever is stored.
const effectiveRule = (event, override) => {
  const base = COMMUNICATION_MATRIX[event];
  if (!base || !override) return base || null;
  const locked = ROW_BY_EVENT.get(event)?.locked || {};
  const rule = { ...base };
  for (const audience of AUDIENCES) {
    if (!locked[audience] && typeof override[audience] === "boolean") rule[audience] = override[audience];
  }
  if (CHANNELS.includes(override.channel)) rule.channel = override.channel;
  return rule;
};

const getRule = async (event) => {
  if (!COMMUNICATION_MATRIX[event]) return null;
  const overrides = await loadOverrides();
  return effectiveRule(event, overrides.get(event));
};

module.exports = {
  AUDIENCES,
  CHANNELS,
  COMMUNICATION_MATRIX,
  MATRIX_ROWS,
  effectiveRule,
  getRule,
  invalidateRules,
};
