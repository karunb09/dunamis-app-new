"use strict";

// Integration tests for the public website chatbot.
//
// The bot is public, so the tests that matter most prove it only ever answers
// from published/active data (drafts and disabled instructors never leak, and
// no reply carries staff contact details), that its answers match the
// website's own pricing rules, and that the review loop — an admin teaching a
// missed phrase or turning it into an FAQ — actually changes the next answer.
//
// Run with:  npm run test:integration

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

process.env.MAIL_HOST = "";

const { startMemoryMongo, stopMemoryMongo } = require("./helpers/db");

const mongoose = require("mongoose");
const Branch = require("../model/branch.model");
const Category = require("../model/category.model");
const City = require("../model/city.model");
const Course = require("../model/course.model");
const SiteContent = require("../model/siteContent.model");
const SubCategory = require("../model/subCategory.model");
const Teacher = require("../model/teacher.model");
const TeacherApplication = require("../model/teacherApplication.model");
const User = require("../model/user.model");
const ChatbotConversation = require("../model/chatbotConversation.model");
const ChatbotTurn = require("../model/chatbotTurn.model");
const { handleChatTurn } = require("../services/chatbot");
const { recordFeedback } = require("../services/chatbot/feedback");
const { getKnowledge, invalidateKnowledge } = require("../services/chatbot/knowledge");
const { getNlp } = require("../services/chatbot/nlp");
const {
  getChatbotSummary,
  listReviewGroups,
  getConversationTranscript,
  resolveReviewGroup,
} = require("../services/chatbot/insights");

const seeded = {};
const everyReply = [];

let seq = 0;
async function makeUser(firstName, lastName, extra = {}) {
  seq += 1;
  return User.create({
    name: { firstName, lastName },
    password: "x",
    mobileNo: 9000000000 + seq,
    email: `user${seq}@test.com`,
    accountType: "teacher",
    ...extra,
  });
}

async function makeInstructor({ firstName, lastName, email, mobileNo, employeeId, accountStatus, teach }) {
  const user = await makeUser(firstName, lastName, { email, mobileNo, employeeId, accountStatus });
  const detail = await TeacherApplication.create({
    name: { firstName, lastName },
    language: { read: ["English"], speak: ["English"], teach },
    email,
    mobileNo,
    currentState: "Telangana",
    currentCity: "Hyderabad",
    currentAddress: "Somewhere",
    areaOfExpertise: "Acoustic guitar",
    yearOfExperience: 8,
    highestQualification: "BMus",
    currentCTC: "1",
    expectedCTC: "1",
    noticePeriod: "0",
    availability: "Flexible",
    mode: "online",
    source: "admin",
    gender: "female",
  });
  return Teacher.create({ userId: user._id, teacherDetail: detail._id, averageRating: 4.8 });
}

async function chat(text, extra = {}) {
  const result = await handleChatTurn({ text, ...extra });
  everyReply.push(JSON.stringify(result));
  return result;
}

async function tap(action, extra = {}) {
  const result = await handleChatTurn({ action, ...extra });
  everyReply.push(JSON.stringify(result));
  return result;
}

before(async () => {
  await startMemoryMongo();

  const manager = await makeUser("Branch", "Manager", { accountType: "admin" });
  const hyderabad = await City.create({
    cityName: "Hyderabad",
    cityManager: manager._id,
    cityAdminContact: "1",
    cityAdminEmail: "city@test.com",
  });
  const pune = await City.create({
    cityName: "Pune",
    cityManager: manager._id,
    cityAdminContact: "1",
    cityAdminEmail: "city2@test.com",
  });

  const guitarTopic = await SubCategory.create({ name: "Guitar" });
  const pianoTopic = await SubCategory.create({ name: "Piano" });
  const music = await Category.create({ name: "Music", status: "published" });

  const priya = await makeInstructor({
    firstName: "Priya",
    lastName: "Sharma",
    email: "priya.private@test.com",
    mobileNo: 9876543210,
    employeeId: "DSMI901",
    accountStatus: "active",
    teach: ["English", "Telugu"],
  });
  const rahul = await makeInstructor({
    firstName: "Rahul",
    lastName: "Verma",
    email: "rahul.private@test.com",
    mobileNo: 9876500000,
    employeeId: "DSMI902",
    accountStatus: "inactive",
    teach: ["English", "Telugu"],
  });

  const guitar = await Course.create({
    name: "Guitar Foundations",
    code: "GF-101",
    description: "Learn guitar",
    category: music._id,
    subCategory: [guitarTopic._id],
    mode: "online",
    courseType: "running",
    level: "beginner",
    certification: "certification",
    languages: ["English", "Telugu"],
    image: "x.png",
    isPublished: true,
    teacher: [priya._id, rahul._id],
    price: [
      {
        sessionType: "standard",
        monthlyFee: 2600,
        fullPayment: 15000,
        isActive: true,
        tenurePlans: [
          { months: 3, monthlyFee: 2800, discount: 5, fullPayment: 7980 },
          { months: 6, monthlyFee: 2500, discount: 10, fullPayment: 13500 },
          { months: 12, monthlyFee: 2300, discount: 15, fullPayment: 23460 },
        ],
      },
    ],
  });

  const piano = await Course.create({
    name: "Piano Mastery",
    code: "PM-101",
    description: "Learn piano",
    category: music._id,
    subCategory: [pianoTopic._id],
    mode: "offline",
    courseType: "running",
    level: "intermediate",
    certification: "non-certification",
    image: "x.png",
    isPublished: true,
    teacher: [priya._id],
    price: [{ sessionType: "standard", monthlyFee: 3000, fullPayment: 16000, isActive: true }],
  });

  const draft = await Course.create({
    name: "Draft Drums",
    code: "DD-101",
    category: music._id,
    isPublished: false,
    price: [{ sessionType: "standard", monthlyFee: 999, fullPayment: 999, isActive: true }],
  });

  const banjara = await Branch.create({
    branchName: "Banjara Hills Centre",
    location: "Road 12, Banjara Hills",
    branchManager: manager._id,
    branchAdminEmail: "manager.private@test.com",
    branchAdminContact: "9111111111",
    zone: "South",
    city: hyderabad._id,
    branchTimings: ["10:00", "19:00"],
    branchOpenDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
    branchCapacity: 40,
    status: "active",
    courses: [piano._id, draft._id],
    teachers: [priya._id],
  });
  await Branch.create({
    branchName: "Secret Centre",
    location: "Hidden Lane",
    branchManager: manager._id,
    branchAdminEmail: "x@test.com",
    branchAdminContact: "1",
    zone: "West",
    city: pune._id,
    branchTimings: ["09:00", "17:00"],
    branchOpenDays: ["monday"],
    branchCapacity: 10,
    status: "draft",
  });
  await Course.updateOne({ _id: piano._id }, { branches: [banjara._id] });

  const faq = await SiteContent.create({
    type: "faq",
    title: "Do you provide instruments during class?",
    body: "Yes — we lend instruments at every centre during class.",
    status: "published",
  });

  Object.assign(seeded, { guitar, piano, draft, banjara, priya, rahul, faq, hyderabad, music });
  invalidateKnowledge();
});

after(async () => {
  const all = everyReply.join("\n");
  for (const secret of [
    "Draft Drums",
    "Secret Centre",
    "Rahul",
    "priya.private@test.com",
    "9876543210",
    "DSMI901",
    "manager.private@test.com",
    "9111111111",
  ]) {
    assert.ok(!all.includes(secret), `a reply leaked "${secret}"`);
  }
  await stopMemoryMongo();
});

beforeEach(async () => {
  await ChatbotConversation.deleteMany({});
  await ChatbotTurn.deleteMany({});
});

test("fees use the 6-month plan as the headline, in English and Hinglish", async () => {
  for (const text of ["guitar fees", "guitar ki fees kitni hai", "gitar fees"]) {
    const { reply } = await chat(text);
    assert.match(reply.text, /Fees for Guitar Foundations/, text);
    assert.match(reply.text, /₹2,500\/month on the 6-month plan/, text);
    assert.match(reply.text, /3 months at ₹2,800\/month/, text);
    assert.match(reply.text, /save up to 15%/, text);
  }
});

test("a legacy-priced course falls back to the top-level monthly fee", async () => {
  const { reply } = await chat("how much is piano");
  assert.match(reply.text, /Piano Mastery/);
  assert.match(reply.text, /₹3,000\/month/);
});

test("centres list only active branches, with hours and days", async () => {
  const { reply } = await chat("centres in hyderabad");
  assert.deepEqual(reply.branches.map((branch) => branch.name), ["Banjara Hills Centre"]);
  assert.equal(reply.branches[0].hours, "10:00 AM – 7:00 PM");
  assert.equal(reply.branches[0].days, "Mon–Sat");
  assert.equal(reply.branches[0].href, "/centers/banjara-hills-centre");

  const timings = await chat("banjara hills timings");
  assert.match(timings.reply.text, /Courses here: Piano Mastery\./);
});

test("a follow-up without a course name answers for the course in context", async () => {
  const first = await chat("tell me about piano");
  assert.equal(first.context.courseId, String(seeded.piano._id));
  const followUp = await chat("what are the fees?", {
    conversationId: first.conversationId,
    context: first.context,
  });
  assert.match(followUp.reply.text, /Piano Mastery/);
  assert.match(followUp.reply.text, /₹3,000\/month/);
});

test("a context id that isn't public is ignored", async () => {
  const { reply } = await chat("what are the fees?", { context: { courseId: String(seeded.draft._id) } });
  assert.match(reply.text, /Which course/);
});

test("a button tap answers without the classifier", async () => {
  const { reply } = await tap({ intent: "course.fees", courseId: String(seeded.guitar._id), label: "Fees" });
  assert.match(reply.text, /₹2,500\/month/);
  const turn = await ChatbotTurn.findOne().lean();
  assert.equal(turn.source, "button");
  assert.equal(turn.text, "Fees");
});

test("a rephrased FAQ question returns the FAQ answer", async () => {
  const { reply } = await chat("do you provide instruments in class");
  assert.equal(reply.text, "Yes — we lend instruments at every centre during class.");
});

test("instructors: active only, filterable by language, no contact details", async () => {
  const forCourse = await chat("who teaches guitar");
  assert.deepEqual(forCourse.reply.instructors.map((instructor) => instructor.name), ["Priya Sharma"]);
  const card = forCourse.reply.instructors[0];
  assert.deepEqual(Object.keys(card).sort(), [
    "city", "courseId", "courseName", "experienceYears", "expertise", "href", "id",
    "languages", "mode", "name", "photo", "rating",
  ]);

  const byLanguage = await chat("guitar teacher in telugu");
  assert.deepEqual(byLanguage.reply.instructors.map((instructor) => instructor.name), ["Priya Sharma"]);
  assert.match(byLanguage.reply.text, /Telugu/);

  const info = await chat("tell me about priya");
  assert.match(info.reply.text, /Priya Sharma — Acoustic guitar/);
  assert.equal(info.context.instructorId, String(seeded.priya._id));

  const demo = await chat("book a demo with her", { context: info.context });
  const bookDemo = demo.reply.actions.find((action) => action.type === "bookDemo");
  assert.equal(bookDemo.instructorId, String(seeded.priya._id));

  const disabled = await chat("tell me about rahul verma");
  assert.equal(disabled.reply.instructors.length, 0);
});

test("unmatched text falls back and is stored redacted", async () => {
  const result = await chat("zzqx 98765 43210 plover@example.com");
  assert.match(result.reply.text, /didn't catch that/);
  assert.ok(result.reply.actions.some((action) => action.href?.startsWith("https://wa.me/")));
  const turn = await ChatbotTurn.findById(result.turnId).lean();
  assert.equal(turn.matched, false);
  assert.equal(turn.text, "zzqx [number] [email]");
  assert.ok(turn.expiresAt instanceof Date);
});

test("ending a chat closes it, and the next message starts a new one", async () => {
  const first = await chat("hello");
  assert.ok(first.conversationId);
  assert.equal(first.ended, false);

  const ended = await tap(
    { intent: "chat.end", reason: "completed", outcome: "demo" },
    { conversationId: first.conversationId }
  );
  assert.equal(ended.ended, true);
  assert.match(ended.reply.text, /demo request is in/);
  const conversation = await ChatbotConversation.findOne({ publicId: first.conversationId }).lean();
  assert.equal(conversation.endReason, "completed");
  assert.equal(conversation.outcome, "demo");
  assert.ok(conversation.endedAt);

  const next = await chat("hello", { conversationId: first.conversationId });
  assert.notEqual(next.conversationId, first.conversationId);

  const again = await tap({ intent: "chat.end", reason: "visitor" }, { conversationId: first.conversationId });
  assert.equal(again.turnId, null);
});

test("feedback needs the right conversation and the latest rating wins", async () => {
  const { conversationId, turnId } = await chat("guitar fees");

  assert.equal(
    await recordFeedback({ conversationId: "00000000-0000-4000-8000-000000000000", turnId, rating: "up" }),
    null
  );

  await recordFeedback({ conversationId, turnId, rating: "up" });
  const saved = await recordFeedback({
    conversationId,
    turnId,
    rating: "down",
    reason: "missingInfo",
    comment: "What about 1:1? call 9876543211",
  });
  assert.equal(saved.feedback.rating, "down");
  assert.equal(saved.feedback.reason, "missingInfo");
  assert.equal(saved.feedback.comment, "What about 1:1? call [number]");

  const groups = await listReviewGroups({ kind: "thumbsDown", days: 30, page: 1, limit: 20 });
  assert.equal(groups.total, 1);
  assert.deepEqual(groups.rows[0].reasonCounts, { missingInfo: 1 });
});

test("teaching a missed phrase changes the next answer and keeps it forever", async () => {
  await chat("zxqv blorp");
  await chat("Zxqv blorp!");

  const groups = await listReviewGroups({ kind: "unanswered", days: 30, page: 1, limit: 20 });
  assert.equal(groups.total, 1);
  assert.equal(groups.rows[0].count, 2);
  assert.equal(groups.rows[0].normalizedText, "zxqv blorp");

  const transcript = await getConversationTranscript(groups.rows[0].conversationId);
  assert.equal(transcript.turns.length, 1);

  const result = await resolveReviewGroup({
    normalizedText: "zxqv blorp",
    kind: "unanswered",
    status: "resolved",
    teachIntent: "course.fees",
  });
  assert.equal(result.updated, 2);
  assert.equal(await ChatbotTurn.countDocuments({ expiresAt: { $exists: true } }), 0);

  const taught = await chat("zxqv blorp");
  assert.match(taught.reply.text, /Which course would you like fees for/);

  const open = await listReviewGroups({ kind: "unanswered", days: 30, page: 1, limit: 20 });
  assert.equal(open.total, 0);
});

test("turning a missed question into an FAQ answers it with that FAQ", async () => {
  await chat("qwop flarn schedule");
  const faq = await SiteContent.create({
    type: "faq",
    title: "Can I change my class schedule?",
    body: "Yes, message your instructor to move a class.",
    status: "published",
  });
  await resolveReviewGroup({
    normalizedText: "qwop flarn schedule",
    kind: "unanswered",
    status: "resolved",
    faqId: String(faq._id),
  });

  const { reply } = await chat("qwop flarn schedule");
  assert.equal(reply.text, "Yes, message your instructor to move a class.");
  await SiteContent.deleteOne({ _id: faq._id });
  invalidateKnowledge();
});

test("the model is retrained only when the knowledge signature changes", async () => {
  invalidateKnowledge();
  const first = await getKnowledge();
  const nlpA = await getNlp(first);
  invalidateKnowledge();
  const second = await getKnowledge();
  assert.equal(second.signature, first.signature);
  assert.equal(await getNlp(second), nlpA);

  await Course.updateOne({ _id: seeded.guitar._id }, { name: "Guitar Foundations Plus" });
  invalidateKnowledge();
  const third = await getKnowledge();
  assert.notEqual(third.signature, first.signature);
  assert.notEqual(await getNlp(third), nlpA);

  await Course.updateOne({ _id: seeded.guitar._id }, { name: "Guitar Foundations" });
  invalidateKnowledge();
});

test("summary counts questions, answers, ratings and leads", async () => {
  const answered = await chat("guitar fees");
  await chat("zzzq plix");
  await recordFeedback({ conversationId: answered.conversationId, turnId: answered.turnId, rating: "up" });
  await tap(
    { intent: "chat.end", reason: "completed", outcome: "callback" },
    { conversationId: answered.conversationId }
  );

  const summary = await getChatbotSummary({ days: 30 });
  assert.equal(summary.questions, 2);
  assert.equal(summary.answered, 1);
  assert.equal(summary.answeredRate, 0.5);
  assert.equal(summary.thumbsUp, 1);
  assert.equal(summary.helpfulRate, 1);
  assert.equal(summary.leads.callback, 1);
});

test("an unknown teach intent is refused", async () => {
  await assert.rejects(
    resolveReviewGroup({ normalizedText: "x", kind: "unanswered", status: "resolved", teachIntent: "delete.everything" }),
    /existing answers/
  );
  assert.ok(mongoose.connection.readyState === 1);
});

// ---- Logged-in students ----------------------------------------------------

const AttendanceHomework = require("../model/attendanceHomework.model");
const Certificate = require("../model/certificate.model");
const ClassRoster = require("../model/classRoster.model");
const Slot = require("../model/slot.model");
const Student = require("../model/student.model");
const { currentDayKey, istDayStart, shiftDay } = require("../utils/istMonth");

const DAY_MS = 24 * 60 * 60 * 1000;
const istDay = (offset) => new Date(istDayStart(shiftDay(currentDayKey(), offset)).getTime() + 9.5 * 3600000);

let students = null;
async function seedStudents() {
  if (students) return students;
  const { guitar, priya } = seeded;

  const makeStudent = async (firstName, extra = {}) => {
    const user = await makeUser(firstName, "Learner", { accountType: "student" });
    const student = await Student.create({ userId: user._id, ...extra });
    return { user, student, viewer: { userId: String(user._id) } };
  };

  const slotId = new mongoose.Types.ObjectId();
  const asha = await makeStudent("Asha", {
    enrolledCourses: [{ courseId: guitar._id, slotId, joinedAt: new Date(Date.now() - 90 * DAY_MS), status: "in-progress" }],
    payments: [
      {
        courseId: guitar._id,
        slotId,
        teacherId: priya._id,
        sessionType: "standard",
        deliveryMode: "online",
        amount: 2500,
        installmentAmount: 2500,
        PaymentStatus: "completed",
        paymentType: "Installment",
        planType: "monthly",
        installmentNo: 1,
        installmentTotal: 6,
        dueDate: new Date(Date.now() - 10 * DAY_MS),
        paidAt: new Date(Date.now() - 40 * DAY_MS),
        monthlyPaymentStatus: "pending",
        feeStatus: "Paid",
        paymentGateway: "cashfree",
      },
    ],
  });
  const ravi = await makeStudent("Ravi");

  await Slot.create({
    courseId: guitar._id,
    createdBy: priya._id,
    date: istDay(2),
    startTime: "17:00",
    endTime: "18:00",
    slotType: "enrolled",
    sessionType: "standard",
    students: [asha.student._id],
  });
  await ClassRoster.create({
    teacherId: priya._id,
    courseId: guitar._id,
    parentAvailabilityId: new mongoose.Types.ObjectId(),
    sessionType: "standard",
    recurringDays: ["saturday", "sunday"],
    startTime: "17:00",
    endTime: "18:00",
    students: [{ studentId: asha.student._id, status: "active" }],
  });
  for (const status of ["Present", "Present", "Present", "Absent"]) {
    await AttendanceHomework.create({
      teacherId: priya._id,
      studentId: asha.student._id,
      userId: asha.user._id,
      courseId: guitar._id,
      category: new mongoose.Types.ObjectId(),
      subCategory: new mongoose.Types.ObjectId(),
      slotId: new mongoose.Types.ObjectId(),
      sessionType: "standard",
      attendanceStatus: status,
      homework: "Practise the G-C-D change for 15 minutes",
      date: istDay(-2),
    });
  }
  await Certificate.create({
    studentId: asha.student._id,
    courseId: guitar._id,
    teacherId: priya._id,
    assessmentId: new mongoose.Types.ObjectId(),
    level: "beginner",
    studentName: "Asha Learner",
    courseName: "Guitar Foundations",
    certificateNumber: "DCH-CERT-000001",
    issuedAt: new Date(Date.now() - 5 * DAY_MS),
  });

  students = { asha, ravi };
  return students;
}

test("a guest asking a personal question is asked to log in", async () => {
  const { reply } = await chat("what do i owe");
  assert.match(reply.text, /Log in to see your classes/);
  assert.ok(reply.actions.some((action) => action.href === "/login"));
});

test("a student's fees answer comes from their own dues, and stays out of the log", async () => {
  const { asha } = await seedStudents();
  for (const text of ["what do i owe", "kitni fees baaki hai"]) {
    const result = await chat(text, { viewer: asha.viewer });
    assert.match(result.reply.text, /You have ₹2,500 due/, text);
    assert.match(result.reply.text, /instalment 2 of 6/, text);
    assert.match(result.reply.text, /overdue/, text);
    assert.ok(result.reply.actions.some((action) => action.href === "/student/fees"));

    const turn = await ChatbotTurn.findById(result.turnId).lean();
    assert.equal(turn.reply.text, "[personal answer]");
    assert.equal(turn.audience, "student");
  }
});

test("a student gets their own class, instructor, homework, attendance, certificates and courses", async () => {
  const { asha } = await seedStudents();
  const ask = async (text) => (await chat(text, { viewer: asha.viewer })).reply;

  const nextClass = await ask("when is my next class");
  assert.match(nextClass.text, /Guitar Foundations with Priya Sharma/);
  assert.match(nextClass.text, /5:00 PM – 6:00 PM/);

  const instructor = await ask("who is my teacher");
  assert.match(instructor.text, /Guitar Foundations: Priya Sharma \(Sat and Sun, 5:00 PM\)/);
  assert.ok(instructor.actions.some((action) => action.href === "/student/messages"));

  assert.match((await ask("my homework")).text, /G-C-D change/);
  assert.match((await ask("my attendance")).text, /75% \(3 of 4 classes\)/);
  assert.match((await ask("my certificate")).text, /1 certificate:\n• Guitar Foundations — beginner/);
  assert.match((await ask("my courses")).text, /Guitar Foundations — in progress/);

  const menu = await ask("hi");
  assert.ok(menu.quickReplies.some((quickReply) => quickReply.action.intent === "me.fees"));
});

test("another student never sees the first student's records", async () => {
  const { ravi } = await seedStudents();
  const ask = async (text) => (await chat(text, { viewer: ravi.viewer })).reply.text;

  assert.match(await ask("what do i owe"), /all paid up/);
  assert.match(await ask("when is my next class"), /don't have an upcoming class/);
  assert.match(await ask("my homework"), /No homework/);
  assert.match(await ask("my certificate"), /No certificates yet/);
  assert.match(await ask("who is my teacher"), /once you're placed in a class/);
});

test("a chat is only continued by the viewer who started it", async () => {
  const { asha, ravi } = await seedStudents();

  const guest = await chat("hello");
  const asStudent = await chat("hello", { conversationId: guest.conversationId, viewer: asha.viewer });
  assert.notEqual(asStudent.conversationId, guest.conversationId);

  const again = await chat("my fees", { conversationId: asStudent.conversationId, viewer: asha.viewer });
  assert.equal(again.conversationId, asStudent.conversationId);

  const other = await chat("my fees", { conversationId: asStudent.conversationId, viewer: ravi.viewer });
  assert.notEqual(other.conversationId, asStudent.conversationId);

  const backToGuest = await chat("hello", { conversationId: asStudent.conversationId });
  assert.notEqual(backToGuest.conversationId, asStudent.conversationId);

  const conversation = await ChatbotConversation.findOne({ publicId: asStudent.conversationId }).lean();
  assert.equal(conversation.audience, "student");
  assert.equal(String(conversation.userId), asha.viewer.userId);

  const summary = await getChatbotSummary({ days: 30 });
  assert.equal(summary.conversations, 4);
  assert.equal(summary.studentConversations, 2);
});
