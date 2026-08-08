const express = require("express");
const router = express.Router();

const { isAuth } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { idParam } = require("../validators/common");
const {
  installmentOrderSchema,
  clientEventSchema,
} = require("../validators/studentPayments.validator");
const {
  getFeesSummary,
  createInstallmentOrder,
  getTransactionDetail,
  recordClientEvent,
} = require("../controller/studentPayments.controller");

router.get("/summary", isAuth, getFeesSummary);
router.post("/order", isAuth, validate(installmentOrderSchema), createInstallmentOrder);
router.get("/transaction/:id", isAuth, validate(idParam, "params"), getTransactionDetail);
router.post(
  "/transaction/:id/event",
  isAuth,
  validate(idParam, "params"),
  validate(clientEventSchema),
  recordClientEvent
);

module.exports = router;
