const express = require("express");
const router = express.Router();

const { isAuth, accessToRole } = require("../middleware/auth");
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

const adminOnly = accessToRole(["admin", "superadmin"]);

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
  adminOnly,
  validate(cashInstallmentSchema),
  recordCashInstallment
);
router.get("/:id", isAuth, adminOnly, validate(idParam, "params"), getPaymentDetail);
router.post("/:id/reverify", isAuth, adminOnly, validate(idParam, "params"), reverifyPayment);

module.exports = router;
