const express = require("express");
const { z } = require("zod");
const router = express.Router();

const { isAuth, accessToRole } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { idParam, objectId } = require("../validators/common");
const {
  generatePayoutSchema,
  previewQuerySchema,
  payoutListQuerySchema,
  adjustmentsSchema,
  payStatusSchema,
} = require("../validators/instructorPay.validator");
const {
  generateRemuneration,
  previewRemuneration,
  listRemunerationsForMonth,
  updateAdjustments,
  approveRemuneration,
  updatePayStatus,
  downloadPayslip,
  getRemunerationByTeacher,
  getRemunerationById,
} = require("../controller/remuneration.controller");

const adminOnly = accessToRole(["admin", "superadmin"]);
const anyStaff = accessToRole(["admin", "superadmin", "teacher"]);

router.post(
  "/generate",
  isAuth,
  adminOnly,
  validate(generatePayoutSchema),
  generateRemuneration
);
router.get(
  "/preview",
  isAuth,
  adminOnly,
  validate(previewQuerySchema, "query"),
  previewRemuneration
);
router.get(
  "/month",
  isAuth,
  adminOnly,
  validate(payoutListQuerySchema, "query"),
  listRemunerationsForMonth
);

router.patch(
  "/:id/adjustments",
  isAuth,
  adminOnly,
  validate(idParam, "params"),
  validate(adjustmentsSchema),
  updateAdjustments
);
router.post(
  "/:id/approve",
  isAuth,
  adminOnly,
  validate(idParam, "params"),
  approveRemuneration
);
router.patch(
  "/:id/pay-status",
  isAuth,
  adminOnly,
  validate(idParam, "params"),
  validate(payStatusSchema),
  updatePayStatus
);

router.get(
  "/:id/payslip.pdf",
  isAuth,
  anyStaff,
  validate(idParam, "params"),
  downloadPayslip
);
router.get(
  "/payslip/:id",
  isAuth,
  anyStaff,
  validate(idParam, "params"),
  getRemunerationById
);
router.get(
  "/:teacherId",
  isAuth,
  anyStaff,
  validate(z.object({ teacherId: objectId("teacherId") }), "params"),
  getRemunerationByTeacher
);

module.exports = router;
