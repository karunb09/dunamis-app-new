// The company's org chart as data (CEO sheet, Sep 2026). Mirrors the backend's
// utils/orgStructure.js — change both together. The titles and employee-ID
// suggestions are form conveniences only; the server never reads them.
export { LANGUAGE_SELECT_STYLES as SELECT_STYLES } from "./languages";

export const DEPARTMENT_LABELS = {
  leadership: "Leadership",
  content: "Content",
  operations: "Operations",
  marketing: "Marketing",
};

// titles: job-title suggestions, keyed by work mode where the sheet names the
// role differently offline and online. idPrefix / idLetter: the employee-ID
// prefix the create form pre-selects (the unit comes from the current pick).
export const DESIGNATIONS = {
  ceo: { label: "CEO", department: "leadership", managers: [], titles: ["CEO"], idPrefix: "DMPL" },
  resourceHead: {
    label: "Resource Head",
    department: "content",
    managers: ["ceo"],
    titles: ["Resource Head"],
    idPrefix: "DMPL",
  },
  courseManager: {
    label: "Course Manager",
    department: "content",
    managers: ["resourceHead"],
    titles: ["Course Manager"],
    idLetter: "A",
  },
  contentCreator: {
    label: "Content Creator",
    department: "content",
    managers: ["courseManager", "resourceHead"],
    titles: ["Content Creator"],
    idLetter: "A",
  },
  operationsHead: {
    label: "Operations Head",
    department: "operations",
    managers: ["ceo"],
    titles: ["Operations Head"],
    idPrefix: "DMPL",
  },
  operationsManager: {
    label: "Operations Manager",
    department: "operations",
    managers: ["operationsHead"],
    titles: ["Operations Manager"],
    idLetter: "A",
  },
  hrManager: {
    label: "HR Manager",
    department: "operations",
    managers: ["operationsHead"],
    titles: ["HR Manager"],
    idLetter: "A",
  },
  financeManager: {
    label: "Finance & Accounts Manager",
    department: "operations",
    managers: ["operationsHead"],
    titles: ["Finance & Accounts Manager"],
    idLetter: "A",
  },
  marketingHead: {
    label: "Marketing Head",
    department: "marketing",
    managers: ["ceo"],
    titles: ["Marketing Head"],
    scope: { offline: "cities", online: "categories" },
    scopeRequired: false,
    idPrefix: "DMPL",
  },
  bdm: {
    label: "BDM",
    department: "marketing",
    managers: ["marketingHead"],
    titles: {
      offline: "Regional Manager",
      online: "Business Development Manager",
      both: "Regional Manager / BDM",
    },
    scope: { offline: "cities", online: "categories" },
    scopeRequired: true,
    idLetter: "B",
  },
  bde: {
    label: "BDE",
    department: "marketing",
    managers: ["bdm"],
    titles: {
      offline: "Branch Manager",
      online: "Business Development Executive",
      both: "Branch Manager / BDE",
    },
    scope: { offline: "zones", online: "subCategories" },
    scopeRequired: true,
    idLetter: "B",
  },
  aa: {
    label: "AA",
    department: "marketing",
    managers: ["bde"],
    titles: ["Admin Assistant", "Tele Caller", "Course Counselor"],
    scope: { offline: "branches", online: "courses" },
    scopeRequired: true,
    idLetter: "A",
  },
};

// The sheet only places Offline Instructors (under a BDE); online instructors
// may report to any of these.
export const INSTRUCTOR_MANAGERS = ["bde", "bdm", "courseManager", "resourceHead"];

export const WORK_MODES = [
  { value: "offline", label: "Offline" },
  { value: "online", label: "Online" },
  { value: "both", label: "Both" },
];

export const SCOPE_FIELDS = {
  branches: "Branches",
  zones: "Zones",
  cities: "Cities",
  courses: "Online courses",
  subCategories: "Course groups (subcategories)",
  categories: "Categories",
};

export const SCOPE_KEYS = Object.keys(SCOPE_FIELDS);

export const modeIncludes = (workMode, mode) =>
  !workMode || workMode === "both" || workMode === mode;

export const designationLabel = (key) => DESIGNATIONS[key]?.label || "";

// "an AA", "an HR Manager", "a BDE".
export const withArticle = (label) => `${/^(?:[AEIO]|HR\b)/.test(label) ? "an" : "a"} ${label}`;

export const designationsByDepartment = () =>
  Object.keys(DEPARTMENT_LABELS).map((department) => ({
    department,
    label: DEPARTMENT_LABELS[department],
    designations: Object.entries(DESIGNATIONS)
      .filter(([, designation]) => designation.department === department)
      .map(([key, designation]) => ({ key, label: designation.label })),
  }));

export const jobTitleOptions = (designationKey, workMode) => {
  const titles = DESIGNATIONS[designationKey]?.titles;
  if (!titles) return [];
  if (Array.isArray(titles)) return titles;
  return [titles[workMode || "both"]];
};

// The scope pickers a designation shows for a work mode, e.g. an offline BDE
// gets ["zones"], a BDM working both gets ["cities", "categories"].
export const scopeKeysFor = (designationKey, workMode) => {
  const scope = DESIGNATIONS[designationKey]?.scope;
  if (!scope) return [];
  return ["offline", "online"]
    .filter((mode) => modeIncludes(workMode, mode))
    .map((mode) => scope[mode]);
};

export const suggestedEmployeePrefix = (designationKey, currentPrefix = "DSMA") => {
  const designation = DESIGNATIONS[designationKey];
  if (!designation) return currentPrefix;
  if (designation.idPrefix) return designation.idPrefix;
  const unit = /^(DSM|DSD|DCC)/.exec(currentPrefix)?.[1] || "DSM";
  return `${unit}${designation.idLetter}`;
};
