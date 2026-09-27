const User = require("../model/user.model");
const Admin = require("../model/admin.model");
const Teacher = require("../model/teacher.model");
const Branch = require("../model/branch.model");
const Zone = require("../model/zone.model");
const City = require("../model/city.model");
const Course = require("../model/course.model");
const Category = require("../model/category.model");
const asyncHandler = require("../utils/asyncHandler");
const { DESIGNATIONS, DESIGNATION_KEYS, modeIncludes } = require("../utils/orgStructure");
const { ALL, loadScopeCatalog, resolveScope, scopeCovers } = require("../utils/orgScope");
const {
  PROTECTED_ACCOUNT_HINT,
  guardTopAccount,
  isUnrestrictedCaller,
} = require("../utils/staffAccess");
const {
  ORG_NAME_POPULATE,
  normalizeInstructorBranches,
  sameOrg,
  setInstructorBranches,
  validateInstructorPlacement,
  validateStaffPlacement,
} = require("../services/orgPlacement");

const STAFF_TYPES = ["admin", "superadmin"];

const idOf = (value) => String(value?._id || value || "");

// One list of staff for every people picker (manager, centre contact, city
// manager), instead of GET /user/get-all, which returns every student too.
exports.getStaffDirectory = asyncHandler(async (req, res) => {
  const designations = String(req.query.designations || "")
    .split(",")
    .map((key) => key.trim())
    .filter((key) => DESIGNATION_KEYS.includes(key));

  const filter = { accountType: { $in: STAFF_TYPES } };
  if (req.query.includeInactive !== "1") filter.accountStatus = "active";
  if (designations.length) filter["org.designation"] = { $in: designations };

  const staff = await User.find(filter)
    .select("name email mobileNo employeeId accountType accountStatus image roleId org.department org.designation org.reportsTo org.workMode")
    .sort({ "name.firstName": 1, "name.lastName": 1 })
    .lean();

  res.status(200).json({
    success: true,
    staff: staff.map(({ roleId, ...person }) => ({ ...person, adminId: roleId || null })),
  });
});

const missingRequiredScope = (org) => {
  const designation = DESIGNATIONS[org?.designation];
  if (!designation?.scopeRequired) return false;
  return ["offline", "online"]
    .filter((mode) => modeIncludes(org.workMode, mode))
    .some((mode) => !(org[designation.scope[mode]] || []).length);
};

// Coverage for one scope key (zones, cities, categories): the holder either
// lists the record or covers that whole dimension.
const holds = (person, catalog, dimension, key, id) => {
  const scope = resolveScope(person.org, catalog);
  if (scope[dimension] === ALL) return true;
  return (person.org[key] || []).some((entry) => idOf(entry) === String(id));
};

// The reporting tree plus what still needs a person: staff not placed yet and
// branches / courses whose messages would climb past an empty level.
exports.getOrgChart = asyncHandler(async (req, res) => {
  const [staff, instructorUsers, catalog, branches, onlineCourses, zones, cities, categories] =
    await Promise.all([
      User.find({ accountType: { $in: STAFF_TYPES } })
        .select("name email employeeId image accountType accountStatus roleId org")
        .populate(ORG_NAME_POPULATE)
        .lean(),
      User.find({ accountType: "teacher", accountStatus: "active" })
        .select("name email employeeId image accountStatus org")
        .populate("org.reportsTo", "name employeeId")
        .lean(),
      loadScopeCatalog(),
      Branch.find({ status: "active" }).select("branchName").lean(),
      Course.find({ mode: "online", isPublished: true }).select("name").lean(),
      Zone.find().select("name city").populate("city", "cityName").lean(),
      City.find({ isDraft: { $ne: true } }).select("cityName").lean(),
      Category.find({ status: "published" }).select("name").lean(),
    ]);

  const [adminDocs, teacherDocs] = await Promise.all([
    Admin.find({ userId: { $in: staff.map((person) => person._id) } }).select("userId role").lean(),
    Teacher.find({ userId: { $in: instructorUsers.map((person) => person._id) } })
      .select("userId teacherDetail")
      .populate("teacherDetail", "mode")
      .lean(),
  ]);
  const jobTitles = new Map(adminDocs.map((admin) => [String(admin.userId), admin.role]));
  const teacherByUser = new Map(teacherDocs.map((teacher) => [String(teacher.userId), teacher]));
  const teachingBranches = await Branch.find({ teachers: { $in: teacherDocs.map((t) => t._id) } })
    .select("branchName teachers")
    .lean();

  const people = [
    ...staff.map(({ roleId, ...person }) => ({
      ...person,
      kind: "staff",
      adminId: roleId || null,
      jobTitle: jobTitles.get(String(person._id)) || null,
    })),
    ...instructorUsers.map((person) => {
      const teacher = teacherByUser.get(String(person._id));
      return {
        ...person,
        kind: "instructor",
        teacherId: teacher?._id || null,
        instructorMode: teacher?.teacherDetail?.mode || null,
        branches: teachingBranches
          .filter((branch) => branch.teachers.some((id) => String(id) === String(teacher?._id)))
          .map(({ _id, branchName }) => ({ _id, branchName })),
      };
    }),
  ];

  const placed = staff.filter((person) => person.accountStatus === "active" && person.org?.designation);
  const byDesignation = (key) => placed.filter((person) => person.org.designation === key);
  const scopesOf = (key) => byDesignation(key).map((person) => resolveScope(person.org, catalog));
  const aaScopes = scopesOf("aa");
  const bdeScopes = scopesOf("bde");
  const missingLevels = (context) =>
    [
      ["aa", aaScopes],
      ["bde", bdeScopes],
    ]
      .filter(([, scopes]) => !scopes.some((scope) => scopeCovers(scope, context)))
      .map(([level]) => level);

  const withMissing = (records, contextOf) =>
    records
      .map((record) => ({ ...record, missing: missingLevels(contextOf(record)) }))
      .filter((record) => record.missing.length);

  const needsAttention = {
    unplaced: staff
      .filter((person) => person.accountType === "admin" && person.accountStatus === "active" && !person.org?.designation)
      .map((person) => person._id),
    noManager: [
      ...placed.filter((person) => person.org.designation !== "ceo" && !person.org.reportsTo),
      ...instructorUsers.filter((person) => !person.org?.reportsTo),
    ].map((person) => person._id),
    missingScope: placed.filter((person) => missingRequiredScope(person.org)).map((person) => person._id),
    uncoveredBranches: withMissing(branches, (branch) => ({ branchId: branch._id })),
    uncoveredCourses: withMissing(onlineCourses, (course) => ({ courseId: course._id })),
    zonesWithoutBde: zones.filter(
      (zone) => !byDesignation("bde").some((person) => holds(person, catalog, "offline", "zones", zone._id))
    ),
    citiesWithoutBdm: cities.filter(
      (city) => !byDesignation("bdm").some((person) => holds(person, catalog, "offline", "cities", city._id))
    ),
    categoriesWithoutBdm: categories.filter(
      (category) =>
        !byDesignation("bdm").some((person) => holds(person, catalog, "online", "categories", category._id))
    ),
  };

  res.status(200).json({ success: true, people, needsAttention });
});

// PATCH /user/:id/org — place an admin (designation, manager, scope) or an
// instructor (manager, branches).
exports.setOrgPlacement = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }
  if (![...STAFF_TYPES, "teacher"].includes(user.accountType)) {
    return res.status(400).json({
      success: false,
      message: "Only staff and instructors have a place in the org chart.",
    });
  }
  if (await guardTopAccount(req, res, user)) return;

  if (user.accountType === "teacher") {
    const teacher = await Teacher.findOne({ userId: user._id }).populate("teacherDetail", "mode");
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Instructor profile not found" });
    }
    const placement = await validateInstructorPlacement({ targetUserId: user._id, org: req.body.org });
    if (req.body.branchIds !== undefined) {
      const branchIds = await normalizeInstructorBranches({
        branchIds: req.body.branchIds,
        mode: teacher.teacherDetail?.mode,
      });
      await setInstructorBranches({ teacherId: teacher._id, branchIds, mode: "replace" });
    }
    user.org = placement;
  } else {
    const placement = await validateStaffPlacement({ targetUserId: user._id, org: req.body.org });
    const isSelf = String(req.user.userId) === String(user._id);
    if (isSelf && !sameOrg(user.org, placement) && !(await isUnrestrictedCaller(req.user))) {
      return res.status(403).json({
        success: false,
        message: "You can't change your own designation, manager or responsibility.",
        hint: PROTECTED_ACCOUNT_HINT,
      });
    }
    user.org = placement;
  }

  await user.save();
  const saved = await User.findById(user._id).select("org").populate(ORG_NAME_POPULATE).lean();
  res.status(200).json({ success: true, message: "Org placement saved", org: saved.org || null });
});
