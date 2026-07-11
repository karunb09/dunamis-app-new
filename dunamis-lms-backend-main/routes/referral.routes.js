const express = require("express");
const router = express.Router();
const { isAuth, accessToRole } = require("../middleware/auth");
const {
  validateCode,
  getAllReferrals,
  updateRewardStatus,
  createPartner,
  getAllPartners,
  updatePartner,
  deletePartner,
} = require("../controller/referral.controller");

const adminOnly = accessToRole(["admin", "superadmin"]);

router.get("/validate/:code", isAuth, validateCode);
router.get("/partners", isAuth, adminOnly, getAllPartners);
router.post("/partners", isAuth, adminOnly, createPartner);
router.put("/partners/:id", isAuth, adminOnly, updatePartner);
router.delete("/partners/:id", isAuth, adminOnly, deletePartner);
router.get("/", isAuth, adminOnly, getAllReferrals);
router.patch("/:id/reward", isAuth, adminOnly, updateRewardStatus);

module.exports = router;
