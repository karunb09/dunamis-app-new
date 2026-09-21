const Assessment = require("../model/assessment.model");
const Questionnaire = require("../model/questionnaire.model");
const asyncHandler = require("../utils/asyncHandler");

const isAdmin = (req) => ["admin", "superadmin"].includes(req.user?.accountType);

// Admins can read any library for support; only the owning instructor writes.
const loadOwned = async (req, res) => {
  const questionnaire = await Questionnaire.findById(req.params.id);

  if (!questionnaire) {
    res.status(404).json({ success: false, message: "Questionnaire not found." });
    return null;
  }

  if (
    !isAdmin(req) &&
    String(questionnaire.teacherId) !== String(req.user.roleId)
  ) {
    res.status(403).json({
      success: false,
      message: "This questionnaire belongs to another instructor.",
    });
    return null;
  }

  return questionnaire;
};

exports.listQuestionnaires = asyncHandler(async (req, res) => {
  const { status, courseId } = req.validated?.query || {};

  const query = isAdmin(req) ? {} : { teacherId: req.user.roleId };
  if (status) query.status = status;
  if (courseId) query.courseId = courseId;

  const questionnaires = await Questionnaire.find(query)
    .populate("courseId", "name code")
    .sort({ updatedAt: -1 })
    .lean();

  res
    .status(200)
    .json({ success: true, count: questionnaires.length, questionnaires });
});

exports.getQuestionnaire = asyncHandler(async (req, res) => {
  const questionnaire = await loadOwned(req, res);
  if (!questionnaire) return;

  res.status(200).json({ success: true, questionnaire });
});

exports.createQuestionnaire = asyncHandler(async (req, res) => {
  const questionnaire = await Questionnaire.create({
    ...req.body,
    teacherId: req.user.roleId,
  });

  res.status(201).json({ success: true, questionnaire });
});

exports.updateQuestionnaire = asyncHandler(async (req, res) => {
  const questionnaire = await loadOwned(req, res);
  if (!questionnaire) return;

  Object.assign(questionnaire, req.body);
  await questionnaire.save();

  res.status(200).json({ success: true, questionnaire });
});

exports.duplicateQuestionnaire = asyncHandler(async (req, res) => {
  const source = await loadOwned(req, res);
  if (!source) return;

  const copy = await Questionnaire.create({
    teacherId: req.user.roleId,
    title: `${source.title} (copy)`,
    description: source.description,
    courseId: source.courseId,
    level: source.level,
    questions: source.questions,
    status: "draft",
  });

  res.status(201).json({ success: true, questionnaire: copy });
});

exports.deleteQuestionnaire = asyncHandler(async (req, res) => {
  const questionnaire = await loadOwned(req, res);
  if (!questionnaire) return;

  // Sent assessments carry their own snapshot, so history survives — but a
  // questionnaire someone is part-way through answering must not vanish.
  const inUse = await Assessment.countDocuments({
    questionnaireId: questionnaire._id,
    status: { $in: ["Sent", "Submitted"] },
  });

  if (inUse) {
    return res.status(409).json({
      success: false,
      message: `This questionnaire is out with ${inUse} learner${
        inUse === 1 ? "" : "s"
      } right now. Wait until those assessments are scored, or unpublish it instead.`,
    });
  }

  await questionnaire.deleteOne();

  res.status(200).json({ success: true, message: "Questionnaire removed." });
});
