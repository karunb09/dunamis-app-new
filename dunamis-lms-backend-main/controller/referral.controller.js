const asyncHandler = require("../utils/asyncHandler");
const Referral = require("../model/referral.model");
const ReferralPartner = require("../model/referralPartner.model");
const {
  PARTNER_CODE_REGEX,
  normalizeCode,
  resolveReferralCode,
  isReferralCodeTaken,
} = require("../utils/referral");

// Normalizes discount fields from a partner create/update body.
// No type (or "none") = attribution-only. Returns { error } on invalid input.
const parseDiscount = (body) => {
  const type = body.discountType;
  if (type !== "percent" && type !== "flat") {
    return { discountType: null, discountValue: 0 };
  }
  const value = Number(body.discountValue);
  if (!Number.isFinite(value) || value < 0) {
    return { error: "discountValue must be a non-negative number" };
  }
  if (type === "percent" && value > 100) {
    return { error: "Percent discount cannot exceed 100" };
  }
  return { discountType: type, discountValue: value };
};

exports.validateCode = asyncHandler(async (req, res) => {
  const resolved = await resolveReferralCode(req.params.code);
  return res.status(200).json({
    success: true,
    valid: Boolean(resolved),
    referrer: resolved
      ? { name: resolved.referrerName, type: resolved.referrerType }
      : null,
    discount:
      resolved?.discountType && resolved.discountValue > 0
        ? { type: resolved.discountType, value: resolved.discountValue }
        : null,
  });
});

exports.getAllReferrals = asyncHandler(async (req, res) => {
  const { rewardStatus, referrerType } = req.query;
  const filter = {};
  if (["pending", "rewarded"].includes(rewardStatus)) filter.rewardStatus = rewardStatus;
  if (["employee", "freelancer"].includes(referrerType)) filter.referrerType = referrerType;

  const referrals = await Referral.find(filter)
    .populate({
      path: "studentId",
      select: "userId",
      populate: { path: "userId", select: "name email" },
    })
    .populate({ path: "courseId", select: "name" })
    .populate({ path: "transactionId", select: "merchantOrderId amount paidAt gateway" })
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, referrals });
});

exports.updateRewardStatus = asyncHandler(async (req, res) => {
  const { rewardStatus, rewardNote } = req.body;

  if (!["pending", "rewarded"].includes(rewardStatus)) {
    return res.status(400).json({
      success: false,
      message: "rewardStatus must be 'pending' or 'rewarded'",
    });
  }

  const referral = await Referral.findById(req.params.id);
  if (!referral) {
    return res.status(404).json({ success: false, message: "Referral not found" });
  }

  referral.rewardStatus = rewardStatus;
  if (rewardNote !== undefined) referral.rewardNote = String(rewardNote || "");
  referral.rewardedAt = rewardStatus === "rewarded" ? new Date() : null;
  referral.rewardedBy = rewardStatus === "rewarded" ? req.user.userId : null;
  await referral.save();

  res.status(200).json({ success: true, referral });
});

exports.createPartner = asyncHandler(async (req, res) => {
  const { name, city, area, phone, email } = req.body;
  const code = normalizeCode(req.body.code);

  if (!name?.trim() || !city?.trim() || !area?.trim() || !code) {
    return res.status(400).json({
      success: false,
      message: "name, city, area, and code are required",
    });
  }

  if (!PARTNER_CODE_REGEX.test(code)) {
    return res.status(400).json({
      success: false,
      message: "Code must be exactly 9 letters (A–Z), e.g. BLRKSNFTM",
    });
  }

  if (await isReferralCodeTaken(code)) {
    return res.status(409).json({
      success: false,
      message: `Code ${code} is already in use`,
    });
  }

  const discount = parseDiscount(req.body);
  if (discount.error) {
    return res.status(400).json({ success: false, message: discount.error });
  }

  const partner = await ReferralPartner.create({
    name: name.trim(),
    city: city.trim(),
    area: area.trim(),
    code,
    phone: phone?.trim() || "",
    email: email?.trim() || "",
    discountType: discount.discountType,
    discountValue: discount.discountValue,
    createdBy: req.user.userId,
  });

  res.status(201).json({ success: true, partner });
});

exports.getAllPartners = asyncHandler(async (req, res) => {
  const partners = await ReferralPartner.find().sort({ createdAt: -1 });
  res.status(200).json({ success: true, partners });
});

exports.updatePartner = asyncHandler(async (req, res) => {
  const partner = await ReferralPartner.findById(req.params.id);
  if (!partner) {
    return res.status(404).json({ success: false, message: "Referral partner not found" });
  }

  const { name, city, area, phone, email, status } = req.body;

  if (req.body.code !== undefined) {
    const code = normalizeCode(req.body.code);
    if (!PARTNER_CODE_REGEX.test(code || "")) {
      return res.status(400).json({
        success: false,
        message: "Code must be exactly 9 letters (A–Z), e.g. BLRKSNFTM",
      });
    }
    if (code !== partner.code && (await isReferralCodeTaken(code, { excludePartnerId: partner._id }))) {
      return res.status(409).json({
        success: false,
        message: `Code ${code} is already in use`,
      });
    }
    partner.code = code;
  }

  if (req.body.discountType !== undefined || req.body.discountValue !== undefined) {
    const discount = parseDiscount(req.body);
    if (discount.error) {
      return res.status(400).json({ success: false, message: discount.error });
    }
    partner.discountType = discount.discountType;
    partner.discountValue = discount.discountValue;
  }

  if (name !== undefined) partner.name = String(name).trim();
  if (city !== undefined) partner.city = String(city).trim();
  if (area !== undefined) partner.area = String(area).trim();
  if (phone !== undefined) partner.phone = String(phone).trim();
  if (email !== undefined) partner.email = String(email).trim();
  if (["active", "inactive"].includes(status)) partner.status = status;

  await partner.save();
  res.status(200).json({ success: true, partner });
});

exports.deletePartner = asyncHandler(async (req, res) => {
  const partner = await ReferralPartner.findByIdAndDelete(req.params.id);
  if (!partner) {
    return res.status(404).json({ success: false, message: "Referral partner not found" });
  }
  res.status(200).json({ success: true, partnerId: req.params.id });
});
