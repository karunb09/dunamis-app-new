const express = require("express");
const router = express.Router();
const {
  autoGenerateRemuneration,
  getRemunerationByTeacher,
  getRemunerationById,
} = require("../controller/remuneration.controller");

router.post("/generate", autoGenerateRemuneration);
router.get("/payslip/:id", getRemunerationById);
router.get("/:teacherId", getRemunerationByTeacher);

module.exports = router;
