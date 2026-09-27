// The company's org chart as data (CEO sheet, Sep 2026). Mirrored in the
// dashboard at src/constants/orgStructure.js — change both together.

const DEPARTMENTS = ["leadership", "content", "operations", "marketing"];

const WORK_MODES = ["online", "offline", "both"];

// What someone is responsible for. Offline: branch ⊂ zone ⊂ city.
// Online: course ⊂ subcategory ("group of courses") ⊂ category.
const OFFLINE_SCOPE_KEYS = ["branches", "zones", "cities"];
const ONLINE_SCOPE_KEYS = ["courses", "subCategories", "categories"];
const SCOPE_KEYS = [...OFFLINE_SCOPE_KEYS, ...ONLINE_SCOPE_KEYS];

// scope: the one offline and one online key a designation may hold. Only the
// marketing field chain has a scope; everyone else is company-wide.
// scopeRequired: false for the Marketing Head, whose empty scope means all.
const DESIGNATIONS = {
  ceo: { label: "CEO", department: "leadership", managers: [] },
  resourceHead: { label: "Resource Head", department: "content", managers: ["ceo"] },
  courseManager: { label: "Course Manager", department: "content", managers: ["resourceHead"] },
  contentCreator: {
    label: "Content Creator",
    department: "content",
    managers: ["courseManager", "resourceHead"],
  },
  operationsHead: { label: "Operations Head", department: "operations", managers: ["ceo"] },
  operationsManager: {
    label: "Operations Manager",
    department: "operations",
    managers: ["operationsHead"],
  },
  hrManager: { label: "HR Manager", department: "operations", managers: ["operationsHead"] },
  financeManager: {
    label: "Finance & Accounts Manager",
    department: "operations",
    managers: ["operationsHead"],
  },
  marketingHead: {
    label: "Marketing Head",
    department: "marketing",
    managers: ["ceo"],
    scope: { offline: "cities", online: "categories" },
    scopeRequired: false,
  },
  bdm: {
    label: "BDM",
    department: "marketing",
    managers: ["marketingHead"],
    scope: { offline: "cities", online: "categories" },
    scopeRequired: true,
  },
  bde: {
    label: "BDE",
    department: "marketing",
    managers: ["bdm"],
    scope: { offline: "zones", online: "subCategories" },
    scopeRequired: true,
  },
  aa: {
    label: "AA",
    department: "marketing",
    managers: ["bde"],
    scope: { offline: "branches", online: "courses" },
    scopeRequired: true,
  },
};

// The sheet only places Offline Instructors (under a BDE); online instructors
// may report to any of these, chosen per person.
const INSTRUCTOR_MANAGERS = ["bde", "bdm", "courseManager", "resourceHead"];

// Who picks up an AA/BDE message when nobody at that level covers it.
const ESCALATION_LADDER = ["aa", "bde", "bdm", "marketingHead"];

const DESIGNATION_KEYS = Object.keys(DESIGNATIONS);

const modeIncludes = (workMode, mode) => !workMode || workMode === "both" || workMode === mode;

module.exports = {
  DEPARTMENTS,
  DESIGNATIONS,
  DESIGNATION_KEYS,
  ESCALATION_LADDER,
  INSTRUCTOR_MANAGERS,
  OFFLINE_SCOPE_KEYS,
  ONLINE_SCOPE_KEYS,
  SCOPE_KEYS,
  WORK_MODES,
  modeIncludes,
};
