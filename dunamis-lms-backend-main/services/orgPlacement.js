const mongoose = require("mongoose");
const User = require("../model/user.model");
const Branch = require("../model/branch.model");
const Zone = require("../model/zone.model");
const City = require("../model/city.model");
const Course = require("../model/course.model");
const SubCategory = require("../model/subCategory.model");
const Category = require("../model/category.model");
const ClassRoster = require("../model/classRoster.model");
const {
  DESIGNATIONS,
  INSTRUCTOR_MANAGERS,
  SCOPE_KEYS,
  WORK_MODES,
  modeIncludes,
} = require("../utils/orgStructure");

const orgError = (statusCode, message, hint) =>
  Object.assign(new Error(message), { statusCode, ...(hint ? { hint } : {}) });

const SCOPE_SOURCES = {
  branches: { model: Branch, noun: "branch", plural: "branches" },
  zones: { model: Zone, noun: "zone", plural: "zones" },
  cities: { model: City, noun: "city", plural: "cities" },
  // Online scope: an offline course here would never match an online learner.
  courses: { model: Course, noun: "online course", plural: "online courses", filter: { mode: "online" } },
  subCategories: { model: SubCategory, noun: "subcategory", plural: "subcategories" },
  categories: { model: Category, noun: "category", plural: "categories" },
};

// Names for everything User.org points at, for screens that list people.
const ORG_NAME_POPULATE = [
  { path: "org.reportsTo", select: "name employeeId" },
  { path: "org.branches", select: "branchName" },
  { path: "org.zones", select: "name" },
  { path: "org.cities", select: "cityName" },
  { path: "org.courses", select: "name" },
  { path: "org.subCategories", select: "name" },
  { path: "org.categories", select: "name" },
];

const nounOf = (key) => SCOPE_SOURCES[key].noun;
const pluralOf = (key) => SCOPE_SOURCES[key].plural;
const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);
const withArticle = (label) => `${/^(?:[AEIO]|HR\b)/.test(label) ? "an" : "a"} ${label}`;

const toIdList = (value, key) => {
  const list = [].concat(value ?? []).filter((id) => id !== "" && id !== null);
  for (const id of list) {
    if (!mongoose.isValidObjectId(id)) throw orgError(400, `Invalid ${nounOf(key)} id: ${id}`);
  }
  return [...new Set(list.map(String))];
};

const assertExists = async (key, ids) => {
  if (!ids.length) return;
  const { model, noun, filter = {} } = SCOPE_SOURCES[key];
  const found = await model.countDocuments({ _id: { $in: ids }, ...filter });
  if (found !== ids.length) {
    throw orgError(400, `${ids.length - found} selected ${noun}(s) no longer exist.`, "Reload the page and pick again.");
  }
};

const managerLabel = (keys) => withArticle(keys.map((key) => DESIGNATIONS[key].label).join(" or "));

// Walks up from the proposed manager; reaching the person being placed means
// the change would make them their own (indirect) manager.
const assertNoCycle = async (targetUserId, managerId) => {
  if (!targetUserId) return;
  let current = managerId;
  for (let depth = 0; current && depth < 50; depth += 1) {
    if (String(current) === String(targetUserId)) {
      throw orgError(409, "That reporting line would loop back to this person.", "Pick a manager outside their own team.");
    }
    const next = await User.findById(current).select("org.reportsTo").lean();
    current = next?.org?.reportsTo;
  }
};

const resolveManager = async ({ targetUserId, reportsTo, allowed }) => {
  if (!reportsTo) return undefined;
  if (!mongoose.isValidObjectId(reportsTo)) throw orgError(400, "Invalid manager id.");
  if (targetUserId && String(reportsTo) === String(targetUserId)) {
    throw orgError(400, "Someone can't report to themselves.");
  }
  const manager = await User.findById(reportsTo).select("accountType accountStatus org.designation").lean();
  if (!manager || !["admin", "superadmin"].includes(manager.accountType)) {
    throw orgError(400, "The selected manager is not a staff account.");
  }
  if (manager.accountStatus !== "active") {
    throw orgError(400, "The selected manager's account is disabled.");
  }
  if (!allowed.includes(manager.org?.designation)) {
    throw orgError(400, `This role reports to ${managerLabel(allowed)}.`);
  }
  await assertNoCycle(targetUserId, reportsTo);
  return manager._id;
};

// Instructors only carry a manager; their branches live on Branch.teachers.
const validateInstructorPlacement = async ({ targetUserId, org = {} }) => {
  const reportsTo = await resolveManager({
    targetUserId,
    reportsTo: org.reportsTo,
    allowed: INSTRUCTOR_MANAGERS,
  });
  return reportsTo ? { reportsTo } : undefined;
};

// Returns the User.org to store for an admin, or throws a 4xx error.
const validateStaffPlacement = async ({ targetUserId, org = {} }) => {
  const designation = DESIGNATIONS[org.designation];
  if (!designation) throw orgError(400, "Pick a designation.");

  const reportsTo =
    org.designation === "ceo"
      ? undefined
      : await resolveManager({ targetUserId, reportsTo: org.reportsTo, allowed: designation.managers });

  const placement = { department: designation.department, designation: org.designation, reportsTo };
  for (const key of SCOPE_KEYS) placement[key] = [];

  if (!designation.scope) {
    for (const key of SCOPE_KEYS) {
      if (toIdList(org[key], key).length) {
        throw orgError(400, `${capitalize(withArticle(designation.label))} is company-wide and has no ${nounOf(key)} scope.`);
      }
    }
    return placement;
  }

  const workMode = org.workMode || "both";
  if (!WORK_MODES.includes(workMode)) throw orgError(400, "Work mode must be online, offline or both.");
  placement.workMode = workMode;

  const allowedKeys = ["offline", "online"]
    .filter((mode) => modeIncludes(workMode, mode))
    .map((mode) => designation.scope[mode]);

  for (const key of SCOPE_KEYS) {
    const ids = toIdList(org[key], key);
    if (!ids.length) continue;
    if (!allowedKeys.includes(key)) {
      throw orgError(
        400,
        `${capitalize(withArticle(designation.label))} working ${workMode} is responsible for ${allowedKeys
          .map(pluralOf)
          .join(" and ")}, not ${pluralOf(key)}.`
      );
    }
    await assertExists(key, ids);
    placement[key] = ids;
  }

  if (designation.scopeRequired) {
    for (const key of allowedKeys) {
      if (!placement[key].length) {
        throw orgError(400, `${capitalize(withArticle(designation.label))} needs at least one ${nounOf(key)}.`);
      }
    }
  }

  return placement;
};

// Validates the branches picked for an instructor before any account is made.
const normalizeInstructorBranches = async ({ branchIds, mode }) => {
  const ids = toIdList(branchIds, "branches");
  if (ids.length && mode === "online") {
    throw orgError(400, "Online instructors don't teach at a branch.", "Switch their mode to offline or hybrid first.");
  }
  await assertExists("branches", ids);
  return ids;
};

// Branch.teachers is the instructor's branch list. "add" (hiring) never
// removes; "replace" (editing) drops branches missing from the list, but not
// while the instructor still teaches learners there.
const setInstructorBranches = async ({ teacherId, branchIds, mode }) => {
  if (mode === "replace") {
    const current = await Branch.find({ teachers: teacherId }).select("_id").lean();
    const keep = new Set(branchIds.map(String));
    const removed = current.map((branch) => String(branch._id)).filter((id) => !keep.has(id));
    if (removed.length) {
      const stillTeaching = await ClassRoster.exists({
        teacherId,
        branchId: { $in: removed },
        status: "active",
        "students.status": { $in: ["active", "paused"] },
      });
      if (stillTeaching) {
        throw orgError(
          409,
          "This instructor still teaches learners at a branch you removed.",
          "Reassign those learners to another instructor first, then remove the branch."
        );
      }
      await Branch.updateMany({ _id: { $in: removed } }, { $pull: { teachers: teacherId } });
    }
  }
  if (branchIds.length) {
    await Branch.updateMany({ _id: { $in: branchIds } }, { $addToSet: { teachers: teacherId } });
  }
};

// Compares what a form resent with what is stored, so an unchanged save by
// someone who may not edit their own placement is not mistaken for an edit.
const sameOrg = (a = {}, b = {}) => {
  const scalar = (value) => (value ? String(value) : "");
  const list = (value) => (value || []).map((id) => String(id?._id || id)).sort().join(",");
  return (
    ["department", "designation", "reportsTo", "workMode"].every((key) => scalar(a[key]) === scalar(b[key])) &&
    SCOPE_KEYS.every((key) => list(a[key]) === list(b[key]))
  );
};

module.exports = {
  ORG_NAME_POPULATE,
  normalizeInstructorBranches,
  orgError,
  sameOrg,
  setInstructorBranches,
  validateInstructorPlacement,
  validateStaffPlacement,
};
