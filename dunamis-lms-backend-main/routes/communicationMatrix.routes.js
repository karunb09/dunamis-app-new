const express = require("express");
const router = express.Router();

const { isAuth, accessToRole, requirePermission } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { matrixRuleSchema } = require("../validators/communicationMatrix.validator");
const {
  getMatrix,
  resetMatrixRule,
  updateMatrixRule,
} = require("../controller/communicationMatrix.controller");

const adminOnly = [isAuth, accessToRole(["admin", "superadmin"]), requirePermission("updates")];

router.get("/", ...adminOnly, getMatrix);
router.put("/:event", ...adminOnly, validate(matrixRuleSchema), updateMatrixRule);
router.delete("/:event", ...adminOnly, resetMatrixRule);

module.exports = router;
