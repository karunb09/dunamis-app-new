const mongoose = require("mongoose");
const Conversation = require("../model/conversation.model");
const Message = require("../model/message.model");
const ClassRoster = require("../model/classRoster.model");
const Student = require("../model/student.model");
const Teacher = require("../model/teacher.model");
const asyncHandler = require("../utils/asyncHandler");
const { formatUserName } = require("../utils/formatName");

const toId = (value) => String(value?._id || value || "");

const participantPopulate = [
  {
    path: "studentId",
    select: "userId",
    populate: { path: "userId", select: "name image" },
  },
  {
    path: "teacherId",
    select: "userId",
    populate: { path: "userId", select: "name image" },
  },
  { path: "courseId", select: "name code" },
];

const callerRole = (req) => {
  if (req.user?.accountType === "student") return "student";
  if (req.user?.accountType === "teacher") return "teacher";
  return "admin";
};

const otherSide = (role) => (role === "student" ? "teacher" : "student");

// A thread may only exist between a learner and the instructor who actually
// teaches them. The roster is the durable membership; a paid enrollment covers
// the window before a roster row is written.
const isTeachingPair = async ({ studentId, teacherId, courseId }) => {
  const onRoster = await ClassRoster.exists({
    teacherId,
    courseId,
    students: { $elemMatch: { studentId, status: { $ne: "removed" } } },
  });
  if (onRoster) return true;

  return Boolean(
    await Student.exists({
      _id: studentId,
      payments: {
        $elemMatch: {
          courseId,
          teacherId,
          PaymentStatus: "completed",
        },
      },
      enrolledCourses: {
        $elemMatch: { courseId, active: { $ne: false } },
      },
    })
  );
};

const shapeConversation = (conversation, role) => ({
  _id: conversation._id,
  courseId: toId(conversation.courseId),
  courseName: conversation.courseId?.name || "Course",
  courseCode: conversation.courseId?.code || "",
  student: {
    id: toId(conversation.studentId),
    name: formatUserName(conversation.studentId?.userId?.name, "Learner"),
    image: conversation.studentId?.userId?.image || null,
  },
  teacher: {
    id: toId(conversation.teacherId),
    name: formatUserName(conversation.teacherId?.userId?.name, "Instructor"),
    image: conversation.teacherId?.userId?.image || null,
  },
  lastMessageAt: conversation.lastMessageAt,
  lastMessagePreview: conversation.lastMessagePreview,
  lastSenderRole: conversation.lastSenderRole,
  unread: role === "admin" ? 0 : conversation.unread?.[role] || 0,
  status: conversation.status,
});

// The conversation the caller is allowed to act on, or null. Admins may read
// any thread but never post into one — they are not a participant.
const loadConversationFor = async (req, id) => {
  const conversation = await Conversation.findById(id).populate(participantPopulate);
  if (!conversation) return { conversation: null, role: null };

  const role = callerRole(req);
  if (role === "admin") return { conversation, role };

  const sideId =
    role === "student" ? toId(conversation.studentId) : toId(conversation.teacherId);
  if (toId(req.user.roleId) !== sideId) return { conversation: null, role };

  return { conversation, role };
};

exports.listConversations = asyncHandler(async (req, res) => {
  const role = callerRole(req);

  const query =
    role === "student"
      ? { studentId: req.user.roleId }
      : role === "teacher"
        ? { teacherId: req.user.roleId }
        : {};

  const conversations = await Conversation.find(query)
    .populate(participantPopulate)
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .limit(200);

  res.status(200).json({
    success: true,
    count: conversations.length,
    conversations: conversations.map((item) => shapeConversation(item, role)),
  });
});

exports.getUnreadCount = asyncHandler(async (req, res) => {
  const role = callerRole(req);
  if (role === "admin") {
    return res.status(200).json({ success: true, unread: 0 });
  }

  // $match does no schema casting, so the string roleId off the JWT has to be
  // an ObjectId here — unlike the find() the list endpoint uses.
  const roleId = new mongoose.Types.ObjectId(String(req.user.roleId));
  const query = role === "student" ? { studentId: roleId } : { teacherId: roleId };

  const [result] = await Conversation.aggregate([
    { $match: query },
    { $group: { _id: null, unread: { $sum: `$unread.${role}` } } },
  ]);

  res.status(200).json({ success: true, unread: result?.unread || 0 });
});

exports.resolveConversation = asyncHandler(async (req, res) => {
  const role = callerRole(req);
  if (role === "admin") {
    return res.status(403).json({
      success: false,
      message: "Admins can read conversations but cannot start one.",
    });
  }

  const courseId = req.body.courseId;
  const studentId = role === "student" ? toId(req.user.roleId) : req.body.studentId;
  const teacherId = role === "teacher" ? toId(req.user.roleId) : req.body.teacherId;

  if (!studentId || !teacherId) {
    return res.status(400).json({
      success: false,
      message:
        role === "student"
          ? "teacherId is required."
          : "studentId is required.",
    });
  }

  const [studentExists, teacherExists] = await Promise.all([
    Student.exists({ _id: studentId }),
    Teacher.exists({ _id: teacherId }),
  ]);
  if (!studentExists || !teacherExists) {
    return res
      .status(404)
      .json({ success: false, message: "That learner or instructor was not found." });
  }

  if (!(await isTeachingPair({ studentId, teacherId, courseId }))) {
    return res.status(403).json({
      success: false,
      message: "You can only message an instructor you are currently enrolled with.",
    });
  }

  const conversation = await Conversation.findOneAndUpdate(
    { studentId, teacherId, courseId },
    { $setOnInsert: { studentId, teacherId, courseId } },
    { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
  ).populate(participantPopulate);

  res.status(200).json({
    success: true,
    conversation: shapeConversation(conversation, role),
  });
});

exports.listMessages = asyncHandler(async (req, res) => {
  const { conversation, role } = await loadConversationFor(req, req.params.id);
  if (!conversation) {
    return res
      .status(404)
      .json({ success: false, message: "Conversation not found." });
  }

  const { before, limit } = req.validated?.query || {};
  const pageSize = Math.min(limit || 50, 100);

  const query = { conversationId: conversation._id };
  if (before) query.createdAt = { $lt: new Date(before) };

  const messages = await Message.find(query)
    .sort({ createdAt: -1 })
    .limit(pageSize)
    .lean();

  res.status(200).json({
    success: true,
    conversation: shapeConversation(conversation, role),
    // Oldest-first for rendering; the query pages backwards from newest.
    messages: messages.reverse(),
    hasMore: messages.length === pageSize,
  });
});

exports.sendMessage = asyncHandler(async (req, res) => {
  const { conversation, role } = await loadConversationFor(req, req.params.id);
  if (!conversation) {
    return res
      .status(404)
      .json({ success: false, message: "Conversation not found." });
  }

  if (role === "admin") {
    return res.status(403).json({
      success: false,
      message: "Admins can read conversations but cannot post in one.",
    });
  }

  if (conversation.status === "archived") {
    return res
      .status(409)
      .json({ success: false, message: "This conversation is archived." });
  }

  const body = req.body.body;
  const message = await Message.create({
    conversationId: conversation._id,
    senderUserId: req.user.userId,
    senderRole: role,
    body,
  });

  await Conversation.updateOne(
    { _id: conversation._id },
    {
      $set: {
        lastMessageAt: message.createdAt,
        lastMessagePreview: body.slice(0, 140),
        lastSenderRole: role,
        [`unread.${role}`]: 0,
      },
      $inc: { [`unread.${otherSide(role)}`]: 1 },
    }
  );

  res.status(201).json({ success: true, message });
});

exports.markRead = asyncHandler(async (req, res) => {
  const { conversation, role } = await loadConversationFor(req, req.params.id);
  if (!conversation) {
    return res
      .status(404)
      .json({ success: false, message: "Conversation not found." });
  }

  if (role === "admin") {
    return res.status(200).json({ success: true, unread: 0 });
  }

  await Promise.all([
    Conversation.updateOne(
      { _id: conversation._id },
      { $set: { [`unread.${role}`]: 0 } }
    ),
    Message.updateMany(
      {
        conversationId: conversation._id,
        senderRole: otherSide(role),
        readAt: null,
      },
      { $set: { readAt: new Date() } }
    ),
  ]);

  res.status(200).json({ success: true, unread: 0 });
});
