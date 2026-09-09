const express = require("express");
const router = express.Router();

const { isAuth, accessToRole } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { idParam } = require("../validators/common");
const {
  rateBodySchema,
  rateUpdateSchema,
  payConfigSchema,
} = require("../validators/instructorPay.validator");
const {
  listRates,
  createRate,
  updateRate,
  deleteRate,
  getConfig,
  updateConfig,
} = require("../controller/instructorRate.controller");

const adminOnly = accessToRole(["admin", "superadmin"]);

router.get("/config", isAuth, adminOnly, getConfig);
router.put("/config", isAuth, adminOnly, validate(payConfigSchema), updateConfig);

router.get("/", isAuth, adminOnly, listRates);
router.post("/", isAuth, adminOnly, validate(rateBodySchema), createRate);
router.put(
  "/:id",
  isAuth,
  adminOnly,
  validate(idParam, "params"),
  validate(rateUpdateSchema),
  updateRate
);
router.delete("/:id", isAuth, adminOnly, validate(idParam, "params"), deleteRate);

module.exports = router;
