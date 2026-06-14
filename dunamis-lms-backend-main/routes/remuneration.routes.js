const express = require("express");
const router = express.Router();
const {
  autoGenerateRemuneration,
  getRemunerationByTeacher,
  getRemunerationById,
} = require("../controller/remuneration.controller");
const { isAuth, accessToRole } = require("../middleware/auth");

// Payroll generation is admin/superadmin-only.
router.post("/generate", isAuth, accessToRole(["admin", "superadmin"]), autoGenerateRemuneration);
// NOTE: the GET payslip reads below are still unauthenticated and expose salary
// data — lock with role logic (teacher sees own, admin sees all) as a follow-up.
router.get("/payslip/:id", getRemunerationById);
router.get("/:teacherId", getRemunerationByTeacher);

module.exports = router;
