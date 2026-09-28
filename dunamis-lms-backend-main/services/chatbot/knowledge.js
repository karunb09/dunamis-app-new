const crypto = require("crypto");
const Course = require("../../model/course.model");
const Branch = require("../../model/branch.model");
const Category = require("../../model/category.model");
const SiteContent = require("../../model/siteContent.model");
const Teacher = require("../../model/teacher.model");
const ChatbotTurn = require("../../model/chatbotTurn.model");
require("../../model/city.model");
require("../../model/subCategory.model");
require("../../model/teacherApplication.model");
require("../../model/user.model");

const CACHE_MS = 5 * 60 * 1000;

let cached = null;
let cachedAt = 0;
let pending = null;
// Bumped on invalidation so a load already in flight can't re-cache stale data.
let generation = 0;

// Must match the website's slug derivation (lib/serverCourses.js, lib/serverCenters.js).
const slugifyCourse = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, "-");
const slugifyBranch = (value) =>
  String(value || "").toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]+/g, "");

const idOf = (value) => (value?._id || value)?.toString();

const fullName = (name) =>
  [name?.firstName, name?.lastName].map((part) => String(part || "").trim()).filter(Boolean).join(" ");

// Mirrors mapFeeStructure on the website course page: active entries only,
// tenure plans first with the 6-month plan as the headline, legacy fields last.
const summarizeFees = (course) =>
  (course.price || [])
    .filter((price) => price?.isActive !== false)
    .map((price) => {
      const plans = (price.tenurePlans || [])
        .filter((plan) => plan.isActive !== false && Number(plan.monthlyFee) > 0)
        .sort((a, b) => Number(a.months) - Number(b.months));
      const primary = plans.find((plan) => Number(plan.months) === 6) || plans[0];
      const monthlyFee = Number(primary?.monthlyFee) || Number(price.monthlyFee) || 0;
      if (monthlyFee <= 0) return null;

      const discounts = plans.length
        ? plans.map((plan) => Number(plan.discount) || 0)
        : [Number(price.discount) || 0];

      return {
        sessionType: price.sessionType || "standard",
        monthlyFee,
        primaryMonths: primary ? Number(primary.months) : null,
        plans: plans.map((plan) => ({
          months: Number(plan.months),
          monthlyFee: Number(plan.monthlyFee),
        })),
        maxFullPaymentDiscount: Math.max(0, ...discounts),
        offers: (price.customPlans || [])
          .filter((offer) => offer.isActive !== false && Number(offer.fullPayment) > 0)
          .map((offer) => ({ name: offer.name, fullPayment: Number(offer.fullPayment) })),
      };
    })
    .filter(Boolean);

async function loadKnowledge() {
  const [courseDocs, branchDocs, categoryDocs, faqDocs, teacherDocs, taughtRows] = await Promise.all([
    Course.find({ isPublished: true })
      .select("name category subCategory mode level languages price branches teacher termMonths certification")
      .populate({ path: "category", select: "name status" })
      .populate({ path: "subCategory", select: "name" })
      .lean(),
    Branch.find({ status: "active" })
      .select("branchName location branchTimings branchOpenDays courses teachers city")
      .populate({ path: "city", select: "cityName" })
      .lean(),
    Category.find({ status: "published" }).select("name").lean(),
    SiteContent.find({ type: "faq", status: "published" })
      .select("title body category updatedAt")
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean(),
    Teacher.find()
      .select("userId teacherDetail averageRating")
      .populate({ path: "userId", select: "name image accountStatus" })
      .populate({
        path: "teacherDetail",
        select:
          "name profilePicture mode areaOfExpertise currentCity currentState yearOfExperience highestQualification language",
      })
      .lean(),
    ChatbotTurn.aggregate([
      { $match: { "review.teachIntent": { $type: "string" }, normalizedText: { $ne: "" } } },
      { $group: { _id: { text: "$normalizedText", intent: "$review.teachIntent" } } },
    ]),
  ]);

  const publishedCategoryIds = new Set(categoryDocs.map((category) => idOf(category)));

  const courses = courseDocs.map((course) => ({
    id: idOf(course),
    name: course.name,
    slug: slugifyCourse(course.name),
    categoryId: publishedCategoryIds.has(idOf(course.category)) ? idOf(course.category) : null,
    mode: course.mode,
    level: course.level,
    languages: course.languages || [],
    termMonths: course.termMonths || 6,
    certified: course.certification === "certification",
    fees: summarizeFees(course),
    branchIds: (course.branches || []).map(idOf),
    teacherIds: (course.teacher || []).map(idOf),
  }));
  const courseIds = new Set(courses.map((course) => course.id));

  const branches = branchDocs.map((branch) => ({
    id: idOf(branch),
    name: branch.branchName,
    slug: slugifyBranch(branch.branchName),
    location: branch.location || "",
    cityId: idOf(branch.city) || null,
    cityName: branch.city?.cityName || "",
    timings: branch.branchTimings || [],
    openDays: branch.branchOpenDays || [],
    courseIds: (branch.courses || []).map(idOf).filter((id) => courseIds.has(id)),
    teacherIds: (branch.teachers || []).map(idOf),
  }));
  const branchIds = new Set(branches.map((branch) => branch.id));
  for (const course of courses) {
    course.branchIds = course.branchIds.filter((id) => branchIds.has(id));
  }

  const cities = [];
  const seenCities = new Set();
  for (const branch of branches) {
    if (branch.cityId && !seenCities.has(branch.cityId)) {
      seenCities.add(branch.cityId);
      cities.push({ id: branch.cityId, name: branch.cityName });
    }
  }

  // Subcategory names ("Guitar", "Piano") are what visitors actually type; one
  // topic can cover several courses ("Guitar Foundations", "Advanced Guitar").
  const topicMap = new Map();
  for (const course of courseDocs) {
    for (const sub of course.subCategory || []) {
      const id = idOf(sub);
      if (!id || !sub.name) continue;
      if (!topicMap.has(id)) topicMap.set(id, { id, name: sub.name, courseIds: [] });
      topicMap.get(id).courseIds.push(idOf(course));
    }
  }
  const topics = [...topicMap.values()];

  const categories = categoryDocs
    .map((category) => ({ id: idOf(category), name: category.name }))
    .filter((category) => courses.some((course) => course.categoryId === category.id));

  const teachingCourses = new Map();
  for (const course of courses) {
    for (const teacherId of course.teacherIds) {
      if (!teachingCourses.has(teacherId)) teachingCourses.set(teacherId, []);
      teachingCourses.get(teacherId).push(course.id);
    }
  }

  // Only what formatPublicTeacherForCourse already exposes on the course page:
  // never email, phone, employeeId, gender, pay or student counts.
  const instructors = teacherDocs
    .filter((teacher) => teacher.userId?.accountStatus === "active")
    .filter((teacher) => teachingCourses.has(idOf(teacher)))
    .map((teacher) => {
      const detail = teacher.teacherDetail || {};
      const id = idOf(teacher);
      const name = fullName(detail.name) || fullName(teacher.userId?.name);
      return {
        id,
        name,
        firstName: String(detail.name?.firstName || teacher.userId?.name?.firstName || "").trim(),
        photo: detail.profilePicture || teacher.userId?.image || "",
        expertise: detail.areaOfExpertise || "",
        experienceYears: Number(detail.yearOfExperience) || 0,
        qualification: detail.highestQualification || "",
        languages: detail.language?.teach || [],
        mode: detail.mode || "",
        city: detail.currentCity || "",
        rating: Number(teacher.averageRating) || 0,
        courseIds: teachingCourses.get(id),
        branchIds: branches.filter((branch) => branch.teacherIds.includes(id)).map((branch) => branch.id),
      };
    })
    .filter((instructor) => instructor.name);

  const faqs = faqDocs.map((faq) => ({
    id: idOf(faq),
    title: faq.title,
    body: faq.body,
    category: faq.category || "",
    updatedAt: faq.updatedAt,
  }));

  const taught = taughtRows
    .map((row) => ({ text: row._id.text, intent: row._id.intent }))
    .sort((a, b) => `${a.intent}${a.text}`.localeCompare(`${b.intent}${b.text}`));

  const snapshot = { courses, topics, branches, cities, categories, instructors, faqs, taught };
  const signature = crypto.createHash("sha1").update(JSON.stringify(snapshot)).digest("hex");

  return {
    ...snapshot,
    signature,
    courseById: new Map(courses.map((course) => [course.id, course])),
    branchById: new Map(branches.map((branch) => [branch.id, branch])),
    topicById: new Map(topics.map((topic) => [topic.id, topic])),
    cityById: new Map(cities.map((city) => [city.id, city])),
    categoryById: new Map(categories.map((category) => [category.id, category])),
    instructorById: new Map(instructors.map((instructor) => [instructor.id, instructor])),
    faqById: new Map(faqs.map((faq) => [faq.id, faq])),
  };
}

async function getKnowledge() {
  if (cached && Date.now() - cachedAt < CACHE_MS) return cached;
  if (!pending) {
    const startedAt = generation;
    const load = loadKnowledge()
      .then((knowledge) => {
        if (startedAt === generation) {
          cached = knowledge;
          cachedAt = Date.now();
        }
        return knowledge;
      })
      .finally(() => {
        if (pending === load) pending = null;
      });
    pending = load;
  }
  return pending;
}

function invalidateKnowledge() {
  generation += 1;
  pending = null;
  cached = null;
  cachedAt = 0;
}

module.exports = { getKnowledge, invalidateKnowledge, summarizeFees, slugifyCourse, slugifyBranch };
