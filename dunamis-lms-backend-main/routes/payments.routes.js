const express = require("express");
const router = express.Router();

const { isAuth, accessToRole } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { idParam } = require("../validators/common");
const {
  needsAttentionQuerySchema,
  listPaymentsQuerySchema,
  duesQuerySchema,
} = require("../validators/payments.validator");
const {
  listPayments,
  listDues,
  listNeedsAttention,
  getNeedsAttentionCount,
  reverifyPayment,
} = require("../controller/payments.controller");

const adminOnly = accessToRole(["admin", "superadmin"]);

// Static segments before the ":id" route so "needs-attention" is never
// swallowed as an id.
router.get("/", isAuth, adminOnly, validate(listPaymentsQuerySchema, "query"), listPayments);
router.get(
  "/needs-attention",
  isAuth,
  adminOnly,
  validate(needsAttentionQuerySchema, "query"),
  listNeedsAttention
);
router.get("/needs-attention/count", isAuth, adminOnly, getNeedsAttentionCount);
router.get("/dues", isAuth, adminOnly, validate(duesQuerySchema, "query"), listDues);
router.post("/:id/reverify", isAuth, adminOnly, validate(idParam, "params"), reverifyPayment);

module.exports = router;
