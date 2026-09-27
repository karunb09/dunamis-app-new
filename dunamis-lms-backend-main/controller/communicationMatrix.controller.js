const CommunicationRule = require("../model/communicationRule.model");
const asyncHandler = require("../utils/asyncHandler");
const { getPermissions } = require("../utils/staffAccess");
const {
  AUDIENCES,
  COMMUNICATION_MATRIX,
  MATRIX_ROWS,
  effectiveRule,
  invalidateRules,
} = require("../utils/communicationMatrix");

const pickRule = (rule) => ({
  learner: rule.learner,
  instructor: rule.instructor,
  aa: rule.aa,
  bde: rule.bde,
  channel: rule.channel,
});

const toRow = (row, override) => ({
  ...row,
  locked: row.locked || {},
  defaults: pickRule(COMMUNICATION_MATRIX[row.event]),
  current: pickRule(effectiveRule(row.event, override)),
  changed: Boolean(override),
  updatedBy: override?.updatedBy || null,
  updatedAt: override?.updatedAt || null,
});

// Changing who hears about what is limited to All Access and the Updates
// permission, the same key that gates the page in the dashboard.
const canEdit = async (requestUser) => {
  if (requestUser.accountType === "superadmin") return true;
  const permissions = await getPermissions(requestUser.userId);
  return permissions.includes("allAccess") || permissions.includes("updates");
};

const refuseEdit = (res) =>
  res.status(403).json({
    success: false,
    message: "You can't change who receives messages.",
    hint: "Ask an admin with the Updates permission or All Access.",
  });

exports.getMatrix = asyncHandler(async (req, res) => {
  const overrides = await CommunicationRule.find().populate("updatedBy", "name").lean();
  const byEvent = new Map(overrides.map((override) => [override.event, override]));
  res.status(200).json({
    success: true,
    rows: MATRIX_ROWS.map((row) => toRow(row, byEvent.get(row.event))),
  });
});

exports.updateMatrixRule = asyncHandler(async (req, res) => {
  const { event } = req.params;
  const row = MATRIX_ROWS.find((candidate) => candidate.event === event);
  if (!row) return res.status(404).json({ success: false, message: "Unknown message type." });
  if (!(await canEdit(req.user))) return refuseEdit(res);

  const defaults = COMMUNICATION_MATRIX[event];
  const lockedChange = AUDIENCES.find(
    (audience) => row.locked?.[audience] && req.body[audience] !== defaults[audience]
  );
  if (lockedChange) {
    return res.status(400).json({
      success: false,
      message: `The ${lockedChange} column of "${row.label}" can't be changed (${row.locked[lockedChange]}).`,
    });
  }

  const override = await CommunicationRule.findOneAndUpdate(
    { event },
    { ...pickRule(req.body), updatedBy: req.user.userId },
    { upsert: true, returnDocument: "after", runValidators: true }
  )
    .populate("updatedBy", "name")
    .lean();
  invalidateRules();

  res.status(200).json({ success: true, row: toRow(row, override) });
});

exports.resetMatrixRule = asyncHandler(async (req, res) => {
  const { event } = req.params;
  const row = MATRIX_ROWS.find((candidate) => candidate.event === event);
  if (!row) return res.status(404).json({ success: false, message: "Unknown message type." });
  if (!(await canEdit(req.user))) return refuseEdit(res);

  await CommunicationRule.deleteOne({ event });
  invalidateRules();

  res.status(200).json({ success: true, row: toRow(row, null) });
});
