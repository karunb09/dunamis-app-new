const Branch = require("../model/branch.model");
const Course = require("../model/course.model");
const { DESIGNATIONS, modeIncludes } = require("./orgStructure");

const ALL = "all";
const NONE = "none";

// Everything a scope can expand to, loaded once and reused for every person
// resolved in the same request or cron run. Only online courses are included:
// an online BDM for "Music" must not pick up offline Music students.
const loadScopeCatalog = async () => {
  const [branches, onlineCourses] = await Promise.all([
    Branch.find().select("zone city").lean(),
    Course.find({ mode: "online" }).select("subCategory category").lean(),
  ]);
  return { branches, onlineCourses };
};

const idSet = (values) => new Set((values || []).map((value) => String(value?._id || value)));

const expand = ({ direct, groups, items, matchers }) => {
  if (!direct.size && groups.every((set) => !set.size)) return ALL;
  const covered = new Set(direct);
  for (const item of items) {
    if (matchers.some((matches, index) => groups[index].size && matches(item, groups[index]))) {
      covered.add(String(item._id));
    }
  }
  return covered;
};

// { offline, online }: each is "all", "none", or a Set of branch / online
// course ids. A dimension outside the person's work mode is "none"; inside it,
// no entries at all means company-wide. Staff outside the marketing chain (and
// anyone not placed yet) have no scope, so they cover everything.
const resolveScope = (org, catalog) => {
  const designation = DESIGNATIONS[org?.designation];
  if (!designation?.scope) return { offline: ALL, online: ALL };

  const offline = modeIncludes(org.workMode, "offline")
    ? expand({
        direct: idSet(org.branches),
        groups: [idSet(org.zones), idSet(org.cities)],
        items: catalog.branches,
        matchers: [
          (branch, zones) => zones.has(String(branch.zone)),
          // Always via Branch.city, never through a zone's city.
          (branch, cities) => cities.has(String(branch.city)),
        ],
      })
    : NONE;

  const online = modeIncludes(org.workMode, "online")
    ? expand({
        direct: idSet(org.courses),
        groups: [idSet(org.subCategories), idSet(org.categories)],
        items: catalog.onlineCourses,
        matchers: [
          (course, subCategories) =>
            (course.subCategory || []).some((id) => subCategories.has(String(id))),
          (course, categories) => categories.has(String(course.category)),
        ],
      })
    : NONE;

  return { offline, online };
};

const coversDimension = (dimension, id) =>
  dimension === ALL || (dimension instanceof Set && dimension.has(String(id)));

// A branch means the thing happens offline, at that branch; otherwise it is an
// online course. No context at all (a sign-up) is everyone's.
const scopeCovers = (scope, { branchId, courseId } = {}) => {
  if (branchId) return coversDimension(scope.offline, branchId);
  if (courseId) return coversDimension(scope.online, courseId);
  return true;
};

module.exports = { ALL, NONE, loadScopeCatalog, resolveScope, scopeCovers };
