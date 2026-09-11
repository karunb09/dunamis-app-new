"use strict";

// Integration tests for the assessment flow: an instructor builds a
// questionnaire, sends it, the learner answers with a video link, the
// instructor scores it and awards a certificate.
//
// The load-bearing claims are that a sent questionnaire is frozen against later
// edits, that a certificate is awarded once and only once, and that neither a
// draft nor another instructor's work can be sent.
//
// Run with:  npm run test:integration

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");

process.env.MAIL_HOST = "";

const { startMemoryMongo, stopMemoryMongo, clearCollections } = require("./helpers/db");

const mongoose = require("mongoose");
const Assessment = require("../model/assessment.model");
const Category = require("../model/category.model");
const Certificate = require("../model/certificate.model");
const Course = require("../model/course.model");
const Questionnaire = require("../model/questionnaire.model");
const Student = require("../model/student.model");
const Teacher = require("../model/teacher.model");
const User = require("../model/user.model");
const assessmentController = require("../controller/assessment.controller");
const questionnaireController = require("../controller/questionnaire.controller");
const { CERTIFICATE_DIR } = require("../services/certificatePdf");

const oid = () => new mongoose.Types.ObjectId();
let seq = 0;

const makeRes = () => {
  const res = { statusCode: 200, payload: null };
  res.status = (code) => ((res.statusCode = code), res);
  res.json = (payload) => ((res.payload = payload), res);
  return res;
};

const run = async (handler, req) => {
  const res = makeRes();
  await handler(req, res, (err) => {
    if (err) throw err;
  });
  return res;
};

const asTeacher = (teacher, extra = {}) => ({
  user: { accountType: "teacher", roleId: teacher._id, userId: teacher.userId },
  params: {},
  body: {},
  ...extra,
});

const asStudent = (student, extra = {}) => ({
  user: { accountType: "student", roleId: student._id, userId: student.userId },
  params: {},
  body: {},
  ...extra,
});

const QUESTIONS = [
  { prompt: "The scale we practised was ______", type: "fill_blank", required: true },
  {
    prompt: "Which did you practise this month?",
    type: "checkbox",
    options: ["Scales", "Arpeggios", "Sight reading"],
    required: false,
  },
];

let teacher;
let otherTeacher;
let student;
let course;

const makeTeacher = async (firstName) => {
  seq += 1;
  const user = await User.create({
    name: { firstName, lastName: "Instructor" },
    password: "x",
    mobileNo: 9500000000 + seq,
    email: `t${seq}@example.com`,
    accountType: "teacher",
  });
  return Teacher.create({ userId: user._id, teacherDetail: oid() });
};

before(async () => {
  await startMemoryMongo();
});

after(async () => {
  await stopMemoryMongo();
  await fs.rm(CERTIFICATE_DIR, { recursive: true, force: true });
});

beforeEach(async () => {
  await clearCollections();
  seq += 1;

  teacher = await makeTeacher("Nidhi");
  otherTeacher = await makeTeacher("Ravi");

  const studentUser = await User.create({
    name: { firstName: "Asha", lastName: "Learner" },
    password: "x",
    mobileNo: 9600000000 + seq,
    email: `s${seq}@example.com`,
    accountType: "student",
  });
  student = await Student.create({ userId: studentUser._id });

  const category = await Category.create({ name: `Music ${seq}` });
  course = await Course.create({
    name: "Carnatic Vocals",
    code: `VOC-${seq}`,
    category: category._id,
    level: "beginner",
  });
});

const publishedQuestionnaire = async (owner = teacher) => {
  const res = await run(
    questionnaireController.createQuestionnaire,
    asTeacher(owner, {
      body: { title: "Month 6 review", questions: QUESTIONS, status: "published" },
    })
  );
  return res.payload.questionnaire;
};

const scheduledAssessment = async () =>
  Assessment.create({
    studentId: student._id,
    courseId: course._id,
    teacherId: teacher._id,
    dueDate: new Date(),
    status: "Pending",
  });

const sendTo = async (questionnaire, assessment, owner = teacher) =>
  run(
    assessmentController.sendQuestionnaire,
    asTeacher(owner, {
      body: {
        questionnaireId: questionnaire._id,
        assessmentIds: [assessment._id],
      },
    })
  );

const answer = async (assessment, body) =>
  run(
    assessmentController.submitAssessmentResponse,
    asStudent(student, { params: { id: assessment._id }, body })
  );

const score = async (assessment, owner = teacher) =>
  run(
    assessmentController.submitAssessment,
    asTeacher(owner, {
      params: { assessmentId: assessment._id },
      body: { homework: 4, practice: 5, speed: 4, performance: 5, trainerFeedback: "Strong" },
    })
  );

test("a draft questionnaire cannot be sent", async () => {
  const draft = await run(
    questionnaireController.createQuestionnaire,
    asTeacher(teacher, { body: { title: "Half-written", questions: QUESTIONS } })
  );
  assert.equal(draft.payload.questionnaire.status, "draft");

  const assessment = await scheduledAssessment();
  const res = await sendTo(draft.payload.questionnaire, assessment);

  assert.equal(res.statusCode, 400);
  assert.match(res.payload.message, /Publish this questionnaire/);
});

test("an instructor cannot send another instructor's questionnaire", async () => {
  const theirs = await publishedQuestionnaire(otherTeacher);
  const assessment = await scheduledAssessment();

  const res = await sendTo(theirs, assessment, teacher);

  assert.equal(res.statusCode, 404);
});

test("sending snapshots the questionnaire, and later edits do not rewrite it", async () => {
  const questionnaire = await publishedQuestionnaire();
  const assessment = await scheduledAssessment();

  const sent = await sendTo(questionnaire, assessment);
  assert.equal(sent.statusCode, 200);

  await run(
    questionnaireController.updateQuestionnaire,
    asTeacher(teacher, {
      params: { id: questionnaire._id },
      body: { questions: [{ prompt: "Completely different", type: "fill_blank" }] },
    })
  );

  const stored = await Assessment.findById(assessment._id);
  assert.equal(stored.status, "Sent");
  assert.equal(stored.questionnaire.questions.length, 2);
  assert.equal(stored.questionnaire.questions[0].prompt, QUESTIONS[0].prompt);
});

test("a learner cannot answer before it is sent", async () => {
  const assessment = await scheduledAssessment();

  const res = await answer(assessment, { videoUrl: "", answers: [] });

  assert.equal(res.statusCode, 409);
  assert.match(res.payload.message, /not sent this assessment yet/);
});

test("required questions must be answered", async () => {
  const questionnaire = await publishedQuestionnaire();
  const assessment = await scheduledAssessment();
  await sendTo(questionnaire, assessment);

  const res = await answer(assessment, {
    videoUrl: "https://youtu.be/abc",
    answers: [{ text: "   " }, { selected: ["Scales"] }],
  });

  assert.equal(res.statusCode, 400);
  assert.match(res.payload.message, /required question/);
});

test("a learner's answers and video are recorded against the prompts", async () => {
  const questionnaire = await publishedQuestionnaire();
  const assessment = await scheduledAssessment();
  await sendTo(questionnaire, assessment);

  const res = await answer(assessment, {
    videoUrl: "https://youtu.be/abc",
    answers: [{ text: "D major" }, { selected: ["Scales", "Arpeggios"] }],
  });

  assert.equal(res.statusCode, 200);
  const stored = await Assessment.findById(assessment._id);
  assert.equal(stored.status, "Submitted");
  assert.equal(stored.submission.videoUrl, "https://youtu.be/abc");
  assert.equal(stored.submission.answers[0].prompt, QUESTIONS[0].prompt);
  assert.equal(stored.submission.answers[0].text, "D major");
  assert.deepEqual(stored.submission.answers[1].selected, ["Scales", "Arpeggios"]);
});

test("a learner can revise until the instructor scores it, and not after", async () => {
  const questionnaire = await publishedQuestionnaire();
  const assessment = await scheduledAssessment();
  await sendTo(questionnaire, assessment);

  await answer(assessment, { videoUrl: "https://youtu.be/one", answers: [{ text: "C" }, {}] });
  await answer(assessment, { videoUrl: "https://youtu.be/two", answers: [{ text: "D" }, {}] });

  let stored = await Assessment.findById(assessment._id);
  assert.equal(stored.submission.videoUrl, "https://youtu.be/two");

  await score(assessment);

  const late = await answer(assessment, {
    videoUrl: "https://youtu.be/three",
    answers: [{ text: "E" }, {}],
  });
  assert.equal(late.statusCode, 409);

  stored = await Assessment.findById(assessment._id);
  assert.equal(stored.submission.videoUrl, "https://youtu.be/two");
});

test("a certificate cannot be issued before the assessment is scored", async () => {
  const questionnaire = await publishedQuestionnaire();
  const assessment = await scheduledAssessment();
  await sendTo(questionnaire, assessment);

  const res = await run(
    assessmentController.issueCertificate,
    asTeacher(teacher, { params: { id: assessment._id } })
  );

  assert.equal(res.statusCode, 409);
  assert.equal(await Certificate.countDocuments(), 0);
});

test("issuing is idempotent — a second tick returns the same certificate", async () => {
  const questionnaire = await publishedQuestionnaire();
  const assessment = await scheduledAssessment();
  await sendTo(questionnaire, assessment);
  await answer(assessment, { videoUrl: "https://youtu.be/abc", answers: [{ text: "D" }, {}] });
  await score(assessment);

  const first = await run(
    assessmentController.issueCertificate,
    asTeacher(teacher, { params: { id: assessment._id } })
  );
  assert.equal(first.statusCode, 201);
  assert.equal(first.payload.certificate.level, "beginner");
  assert.equal(first.payload.certificate.studentName, "Asha Learner");
  assert.match(first.payload.certificate.certificateNumber, /^DCH-CERT-\d{6}$/);

  const second = await run(
    assessmentController.issueCertificate,
    asTeacher(teacher, { params: { id: assessment._id } })
  );
  assert.equal(second.statusCode, 200);
  assert.equal(
    second.payload.certificate.certificateNumber,
    first.payload.certificate.certificateNumber
  );
  assert.equal(await Certificate.countDocuments(), 1, "one award, one number");
});

test("a questionnaire out with a learner cannot be deleted", async () => {
  const questionnaire = await publishedQuestionnaire();
  const assessment = await scheduledAssessment();
  await sendTo(questionnaire, assessment);

  const blocked = await run(
    questionnaireController.deleteQuestionnaire,
    asTeacher(teacher, { params: { id: questionnaire._id } })
  );
  assert.equal(blocked.statusCode, 409);

  // Once scored it is no longer out with anyone, and the snapshot preserves
  // what was asked.
  await answer(assessment, { videoUrl: "", answers: [{ text: "D" }, {}] });
  await score(assessment);

  const allowed = await run(
    questionnaireController.deleteQuestionnaire,
    asTeacher(teacher, { params: { id: questionnaire._id } })
  );
  assert.equal(allowed.statusCode, 200);

  const stored = await Assessment.findById(assessment._id);
  assert.equal(stored.questionnaire.questions[0].prompt, QUESTIONS[0].prompt);
});

test("duplicating copies the questions and starts as a draft", async () => {
  const questionnaire = await publishedQuestionnaire();

  const res = await run(
    questionnaireController.duplicateQuestionnaire,
    asTeacher(teacher, { params: { id: questionnaire._id } })
  );

  assert.equal(res.statusCode, 201);
  assert.equal(res.payload.questionnaire.status, "draft");
  assert.match(res.payload.questionnaire.title, /\(copy\)$/);
  assert.equal(res.payload.questionnaire.questions.length, 2);
  assert.equal(await Questionnaire.countDocuments({ teacherId: teacher._id }), 2);
});

test("an instructor only sees their own library", async () => {
  await publishedQuestionnaire(teacher);
  await publishedQuestionnaire(otherTeacher);

  const mine = await run(
    questionnaireController.listQuestionnaires,
    asTeacher(teacher, { validated: { query: {} } })
  );
  const theirs = await run(
    questionnaireController.listQuestionnaires,
    asTeacher(otherTeacher, { validated: { query: {} } })
  );

  assert.equal(mine.payload.count, 1);
  assert.equal(theirs.payload.count, 1);
  assert.notEqual(
    String(mine.payload.questionnaires[0]._id),
    String(theirs.payload.questionnaires[0]._id)
  );
});
