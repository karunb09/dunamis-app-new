const User = require("../model/user.model");
const { ESCALATION_LADDER } = require("../utils/orgStructure");
const { loadScopeCatalog, resolveScope, scopeCovers } = require("../utils/orgScope");

// Every active staff member with their scope already expanded. Loaded once per
// message, or once per run by crons that send many.
const loadRoutingDirectory = async () => {
  const [staff, catalog] = await Promise.all([
    User.find({ accountType: { $in: ["admin", "superadmin"] }, accountStatus: "active" })
      .select("name email accountType org")
      .lean(),
    loadScopeCatalog(),
  ]);
  return { staff: staff.map((person) => ({ ...person, scope: resolveScope(person.org, catalog) })) };
};

const covering = (directory, designation, context) =>
  directory.staff.filter(
    (person) => person.org?.designation === designation && scopeCovers(person.scope, context)
  );

// Staff for the ticked AA / BDE columns of one message about `context`
// ({ branchId } offline, { courseId } online, {} for no location at all).
// A column nobody covers climbs the ladder AA → BDE → BDM → Marketing Head,
// so the message reaches whoever manages that gap; if the whole ladder is
// empty it goes to every active admin rather than vanishing (fellBack).
const resolveStaff = ({ columns, context = {}, directory }) => {
  const recipients = new Map();
  let fellBack = false;

  for (const column of ["aa", "bde"]) {
    if (!columns[column]) continue;
    let found = [];
    for (const level of ESCALATION_LADDER.slice(ESCALATION_LADDER.indexOf(column))) {
      found = covering(directory, level, context);
      if (found.length) break;
    }
    if (!found.length) {
      fellBack = true;
      found = directory.staff;
    }
    for (const person of found) recipients.set(String(person._id), person);
  }

  return { recipients: [...recipients.values()], fellBack };
};

// Where a learner's enrollment in `course` happens, for crons that start from
// the Student rather than a payment or class: the newest payment for the
// course names its branch (offline) or has none (online). Student.branch is
// only a fallback for offline courses whose payments predate that field.
const enrollmentContext = ({ student, course }) => {
  const latest = (student.payments || [])
    .filter((payment) => String(payment.courseId?._id || payment.courseId) === String(course._id))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0];
  const branchId = latest?.branchId || (course.mode === "offline" ? student.branch : null);
  return branchId ? { branchId } : { courseId: course._id };
};

module.exports = { enrollmentContext, loadRoutingDirectory, resolveStaff };
