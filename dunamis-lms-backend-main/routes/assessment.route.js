const express = require("express");
const router = express.Router()

const { isAuth, accessToRole } = require("../middleware/auth");
const { getTeacherAssessments, getStudentAssessments, submitAssessment, getAllAssessments } = require("../controller/assessment.controller");
const { manualAssessmentCycle } = require("../cronJobs/runAssessmentCycle");

router.get("/teacher", isAuth, accessToRole(["teacher"]), getTeacherAssessments);
router.get("/student", isAuth, accessToRole(["student"]), getStudentAssessments);
router.put("/submit/:assessmentId", isAuth, accessToRole(["teacher"]), submitAssessment);
router.post("/manualCycle", isAuth, accessToRole(["admin", "superadmin"]), manualAssessmentCycle);
router.get("/", isAuth, accessToRole(["admin", "superadmin"]), getAllAssessments);

module.exports = router
