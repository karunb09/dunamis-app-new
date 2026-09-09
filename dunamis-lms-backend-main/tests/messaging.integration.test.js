"use strict";

// Integration tests for learner<->instructor messaging.
//
// The load-bearing assertions are the access ones: a thread can only exist
// between a pair that actually teaches together, and only its two participants
// can read or post in it.
//
// Run with:  npm run test:integration

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

process.env.MAIL_HOST = "";

const { startMemoryMongo, stopMemoryMongo, clearCollections } = require("./helpers/db");

const mongoose = require("mongoose");
const ClassRoster = require("../model/classRoster.model");
const Conversation = require("../model/conversation.model");
const Course = require("../model/course.model");
const Message = require("../model/message.model");
const Student = require("../model/student.model");
const Teacher = require("../model/teacher.model");
const User = require("../model/user.model");
const controller = require("../controller/message.controller");

const oid = () => new mongoose.Types.ObjectId();

let teacher;
let otherTeacher;
let student;
let otherStudent;
let course;

// Minimal express-shaped doubles: the controller only reads req.user/params/
// body/validated and writes via res.status().json().
const makeRes = () => {
  const res = {
    statusCode: 200,
    payload: null,
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(payload) {
      res.payload = payload;
      return res;
    },
  };
  return res;
};

const run = async (handler, req) => {
  const res = makeRes();
  await handler(req, res, (err) => {
    if (err) throw err;
  });
  return res;
};

const asStudent = (studentDoc, extra = {}) => ({
  user: {
    accountType: "student",
    roleId: studentDoc._id,
    userId: studentDoc.userId,
  },
  params: {},
  body: {},
  ...extra,
});

const asTeacher = (teacherDoc, extra = {}) => ({
  user: {
    accountType: "teacher",
    roleId: teacherDoc._id,
    userId: teacherDoc.userId,
  },
  params: {},
  body: {},
  ...extra,
});

const asAdmin = (extra = {}) => ({
  user: { accountType: "admin", userId: oid() },
  params: {},
  body: {},
  ...extra,
});

const makeStudent = async (firstName) => {
  const user = await User.create({
    name: { firstName, lastName: "Learner" },
    email: `${firstName.toLowerCase()}@example.com`,
    password: "Dunamis@123",
    mobileNo: 9000000000,
    accountType: "student",
  });
  return Student.create({ userId: user._id });
};

const makeTeacher = async (firstName) => {
  const user = await User.create({
    name: { firstName, lastName: "Instructor" },
    email: `${firstName.toLowerCase()}@instructors.example.com`,
    password: "Dunamis@123",
    mobileNo: 9111111111,
    accountType: "teacher",
  });
  return Teacher.create({ userId: user._id, teacherDetail: oid() });
};

before(async () => {
  await startMemoryMongo();
});

after(async () => {
  await stopMemoryMongo();
});

beforeEach(async () => {
  await clearCollections();

  teacher = await makeTeacher("Nidhi");
  otherTeacher = await makeTeacher("Ravi");
  student = await makeStudent("Asha");
  otherStudent = await makeStudent("Bala");

  course = await Course.create({
    name: "Carnatic Vocals",
    code: "VOC-101",
    level: "beginner",
  });

  await ClassRoster.create({
    teacherId: teacher._id,
    courseId: course._id,
    parentAvailabilityId: oid(),
    sessionType: "standard",
    startTime: "18:00",
    endTime: "19:00",
    students: [{ studentId: student._id, status: "active" }],
  });
});

const openThread = async () => {
  const res = await run(
    controller.resolveConversation,
    asStudent(student, { body: { courseId: course._id, teacherId: teacher._id } })
  );
  return res.payload.conversation;
};

test("a learner can open a thread with an instructor who teaches them", async () => {
  const res = await run(
    controller.resolveConversation,
    asStudent(student, { body: { courseId: course._id, teacherId: teacher._id } })
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.conversation.teacher.name, "Nidhi Instructor");
  assert.equal(res.payload.conversation.courseName, "Carnatic Vocals");
  assert.equal(await Conversation.countDocuments(), 1);
});

test("opening the same thread twice reuses it", async () => {
  const first = await openThread();
  const second = await openThread();

  assert.equal(String(first._id), String(second._id));
  assert.equal(await Conversation.countDocuments(), 1);
});

test("a learner cannot open a thread with an instructor who does not teach them", async () => {
  const res = await run(
    controller.resolveConversation,
    asStudent(student, {
      body: { courseId: course._id, teacherId: otherTeacher._id },
    })
  );

  assert.equal(res.statusCode, 403);
  assert.equal(await Conversation.countDocuments(), 0);
});

test("messages flow both ways and bump the other side's unread count", async () => {
  const conversation = await openThread();

  await run(
    controller.sendMessage,
    asStudent(student, {
      params: { id: conversation._id },
      body: { body: "Could you resend today's practice notes?" },
    })
  );

  let stored = await Conversation.findById(conversation._id);
  assert.equal(stored.unread.teacher, 1);
  assert.equal(stored.unread.student, 0);
  assert.equal(stored.lastSenderRole, "student");

  await run(
    controller.sendMessage,
    asTeacher(teacher, {
      params: { id: conversation._id },
      body: { body: "Sent — scales in the key of D." },
    })
  );

  stored = await Conversation.findById(conversation._id);
  assert.equal(stored.unread.student, 1);
  assert.equal(stored.unread.teacher, 0, "replying clears your own unread count");
  assert.equal(await Message.countDocuments(), 2);
});

test("marking read clears the count and stamps the other side's messages", async () => {
  const conversation = await openThread();
  await run(
    controller.sendMessage,
    asStudent(student, {
      params: { id: conversation._id },
      body: { body: "Hello" },
    })
  );

  await run(controller.markRead, asTeacher(teacher, { params: { id: conversation._id } }));

  const stored = await Conversation.findById(conversation._id);
  assert.equal(stored.unread.teacher, 0);
  const message = await Message.findOne({ conversationId: conversation._id });
  assert.ok(message.readAt, "the learner's message is stamped read");
});

test("a non-participant cannot read or post in the thread", async () => {
  const conversation = await openThread();

  const read = await run(
    controller.listMessages,
    asStudent(otherStudent, { params: { id: conversation._id } })
  );
  assert.equal(read.statusCode, 404);

  const post = await run(
    controller.sendMessage,
    asTeacher(otherTeacher, {
      params: { id: conversation._id },
      body: { body: "Let me in" },
    })
  );
  assert.equal(post.statusCode, 404);
  assert.equal(await Message.countDocuments(), 0);
});

test("an admin can read any thread but cannot post in one", async () => {
  const conversation = await openThread();
  await run(
    controller.sendMessage,
    asStudent(student, { params: { id: conversation._id }, body: { body: "Hi" } })
  );

  const read = await run(
    controller.listMessages,
    asAdmin({ params: { id: conversation._id } })
  );
  assert.equal(read.statusCode, 200);
  assert.equal(read.payload.messages.length, 1);

  const post = await run(
    controller.sendMessage,
    asAdmin({ params: { id: conversation._id }, body: { body: "Admin here" } })
  );
  assert.equal(post.statusCode, 403);
  assert.equal(await Message.countDocuments(), 1);
});

test("each side only lists their own threads", async () => {
  await openThread();

  const forStudent = await run(controller.listConversations, asStudent(student));
  const forOther = await run(controller.listConversations, asStudent(otherStudent));
  const forTeacher = await run(controller.listConversations, asTeacher(teacher));
  const forAdmin = await run(controller.listConversations, asAdmin());

  assert.equal(forStudent.payload.count, 1);
  assert.equal(forOther.payload.count, 0);
  assert.equal(forTeacher.payload.count, 1);
  assert.equal(forAdmin.payload.count, 1, "admins see every thread");
});

test("the unread badge counts threads when roleId arrives as a string", async () => {
  // The JWT carries roleId as a string. $match does no schema casting, so this
  // is the shape that matters — an ObjectId-only test passes against a broken
  // aggregation.
  const conversation = await openThread();
  await run(
    controller.sendMessage,
    asStudent(student, { params: { id: conversation._id }, body: { body: "Hi" } })
  );

  const res = await run(controller.getUnreadCount, {
    user: {
      accountType: "teacher",
      roleId: String(teacher._id),
      userId: String(teacher.userId),
    },
    params: {},
    body: {},
  });

  assert.equal(res.payload.unread, 1);
});

test("the unread badge totals a caller's threads", async () => {
  const conversation = await openThread();
  await run(
    controller.sendMessage,
    asStudent(student, { params: { id: conversation._id }, body: { body: "One" } })
  );
  await run(
    controller.sendMessage,
    asStudent(student, { params: { id: conversation._id }, body: { body: "Two" } })
  );

  const teacherCount = await run(controller.getUnreadCount, asTeacher(teacher));
  const studentCount = await run(controller.getUnreadCount, asStudent(student));

  assert.equal(teacherCount.payload.unread, 2);
  assert.equal(studentCount.payload.unread, 0);
});

test("messages page newest-first but render oldest-first", async () => {
  const conversation = await openThread();
  for (const body of ["first", "second", "third"]) {
    await run(
      controller.sendMessage,
      asStudent(student, { params: { id: conversation._id }, body: { body } })
    );
  }

  const res = await run(
    controller.listMessages,
    asTeacher(teacher, { params: { id: conversation._id }, validated: { query: { limit: 2 } } })
  );

  assert.equal(res.payload.messages.length, 2);
  assert.deepEqual(
    res.payload.messages.map((m) => m.body),
    ["second", "third"],
    "the newest page, in reading order"
  );
  assert.equal(res.payload.hasMore, true);
});
