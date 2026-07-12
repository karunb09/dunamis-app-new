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

  const partner = await ReferralPartner.findOne({
    code,
    status: "active",
  }).select("name code discountType discountValue");
  if (partner) {
    return {
      referrerType: "freelancer",
      referrerPartner: partner._id,
      referrerName: partner.name,
      discountType: partner.discountType || null,
      discountValue: Number(partner.discountValue) || 0,
    };
  }

  return null;
}

// Applies a freelancer discount to the pricing object (first payment only).
// Returns the input unchanged for attribution-only codes or when the floor
// would cancel the discount. amount floors at 1 (PaymentTransaction.amount min: 1).
function applyReferralDiscount(pricing, resolved) {
  const value = Number(resolved?.discountValue) || 0;
  if (!resolved?.discountType || value <= 0) return pricing;

  const raw =
    resolved.discountType === "percent"
      ? Math.round((pricing.amount * value) / 100)
      : Math.round(value);
  const amount = Math.max(1, pricing.amount - raw);
  if (amount === pricing.amount) return pricing;

  return {
    ...pricing,
    amount,
    originalAmount: pricing.amount,
    discountAmount: pricing.amount - amount,
  };
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
        referrerPartner: resolved.referrerPartner,
        referrerName: resolved.referrerName,
        studentId: transaction.studentId,
        courseId: transaction.courseId,
        amount: transaction.amount,
        discountAmount: transaction.discountAmount || 0,
      },
    },
    { upsert: true }
  );
}

module.exports = {
  PARTNER_CODE_REGEX,
  normalizeCode,
  resolveReferralCode,
  applyReferralDiscount,
  isReferralCodeTaken,
  recordReferralIfAny,
};
