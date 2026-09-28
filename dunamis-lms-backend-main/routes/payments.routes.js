const express = require("express");
const router = express.Router();

const { isAuth, accessToRole, requirePermission } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { idParam } = require("../validators/common");
const {
  needsAttentionQuerySchema,
  listPaymentsQuerySchema,
  exportPaymentsQuerySchema,
  duesQuerySchema,
  cashInstallmentSchema,
} = require("../validators/payments.validator");
const {
  listPayments,
  exportPayments,
  listDues,
  listNeedsAttention,
  getNeedsAttentionCount,
  reverifyPayment,
  recordCashInstallment,
  getPaymentDetail,
} = require("../controller/payments.controller");

const adminOnly = [accessToRole(["admin", "superadmin"]), requirePermission("financials")];
// Also reached from the student profile's Payments tab (Student Management).
const paymentsOrStudents = [
  accessToRole(["admin", "superadmin"]),
  requirePermission("financials", "studentManagement"),
];

// Static segments before the ":id" route so "needs-attention" is never
// swallowed as an id.
router.get("/", isAuth, adminOnly, validate(listPaymentsQuerySchema, "query"), listPayments);
router.get(
  "/export",
  isAuth,
  adminOnly,
  validate(exportPaymentsQuerySchema, "query"),
  exportPayments
);
router.get(
  "/needs-attention",
  isAuth,
  adminOnly,
  validate(needsAttentionQuerySchema, "query"),
  listNeedsAttention
);
router.get("/needs-attention/count", isAuth, adminOnly, getNeedsAttentionCount);
router.get("/dues", isAuth, adminOnly, validate(duesQuerySchema, "query"), listDues);
router.post(
  "/cash-installment",
  isAuth,
  paymentsOrStudents,
  validate(cashInstallmentSchema),
  recordCashInstallment
);
router.get("/:id", isAuth, paymentsOrStudents, validate(idParam, "params"), getPaymentDetail);
router.post("/:id/reverify", isAuth, adminOnly, validate(idParam, "params"), reverifyPayment);

module.exports = router;
