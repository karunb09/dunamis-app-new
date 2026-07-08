const User = require("../model/user.model");
const ReferralPartner = require("../model/referralPartner.model");
const Referral = require("../model/referral.model");

const PARTNER_CODE_REGEX = /^[A-Z]{9}$/;

const normalizeCode = (raw) => {
  const code = String(raw || "").trim().toUpperCase();
  return code || null;
};

async function resolveReferralCode(rawCode) {
  const code = normalizeCode(rawCode);
  if (!code) return null;

  const employee = await User.findOne({
    employeeId: code,
    accountStatus: "active",
  }).select("name employeeId");
  if (employee) {
    return {
      referrerType: "employee",
      referrerUser: employee._id,
      referrerPartner: null,
      referrerName: `${employee.name?.firstName || ""} ${employee.name?.lastName || ""}`.trim(),
    };
  }

  const partner = await ReferralPartner.findOne({
    code,
    status: "active",
  }).select("name code");
  if (partner) {
    return {
      referrerType: "freelancer",
      referrerUser: null,
      referrerPartner: partner._id,
      referrerName: partner.name,
    };
  }

  return null;
}

async function isReferralCodeTaken(rawCode, { excludeUserId = null, excludePartnerId = null } = {}) {
  const code = normalizeCode(rawCode);
  if (!code) return false;

  const userQuery = { employeeId: code };
  if (excludeUserId) userQuery._id = { $ne: excludeUserId };
  if (await User.exists(userQuery)) return true;

  const partnerQuery = { code };
  if (excludePartnerId) partnerQuery._id = { $ne: excludePartnerId };
  return Boolean(await ReferralPartner.exists(partnerQuery));
}

// One attribution per enrollment: initial transaction only, idempotent via unique transactionId.
async function recordReferralIfAny(transaction) {
  if (!transaction?.referralCode) return;
  if ((transaction.installmentNo || 1) !== 1) return;

  const resolved = await resolveReferralCode(transaction.referralCode);
  if (!resolved) return;

  await Referral.updateOne(
    { transactionId: transaction._id },
    {
      $setOnInsert: {
        code: normalizeCode(transaction.referralCode),
        referrerType: resolved.referrerType,
        referrerUser: resolved.referrerUser,
        referrerPartner: resolved.referrerPartner,
        referrerName: resolved.referrerName,
        studentId: transaction.studentId,
        courseId: transaction.courseId,
        amount: transaction.amount,
      },
    },
    { upsert: true }
  );
}

module.exports = {
  PARTNER_CODE_REGEX,
  normalizeCode,
  resolveReferralCode,
  isReferralCodeTaken,
  recordReferralIfAny,
};
