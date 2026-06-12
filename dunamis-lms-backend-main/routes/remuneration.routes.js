const express = require("express");
const router = express.Router();
const { isAuth, accessToRole } = require("../middleware/auth");
const {
  autoGenerateRemuneration,
  getRemunerationByTeacher,
  getRemunerationById,
} = require("../controller/remuneration.controller");

router.post("/generate", isAuth, accessToRole(["admin", "superadmin"]), autoGenerateRemuneration);
router.get("/payslip/:id", isAuth, accessToRole(["admin", "superadmin", "teacher"]), getRemunerationById);
router.get("/:teacherId", isAuth, accessToRole(["admin", "superadmin", "teacher"]), getRemunerationByTeacher);

module.exports = router;
