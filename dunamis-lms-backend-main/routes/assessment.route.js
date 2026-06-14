const express = require("express");
const router = express.Router()

const { isAuth, accessToRole } = require("../middleware/auth");
const { getTeacherAssessments, getStudentAssessments, submitAssessment, getAllAssessments } = require("../controller/assessment.controller");
const { manualAssessmentCycle } = require("../cronJobs/runAssessmentCycle");

// Teacher routes
router.get("/teacher", isAuth, accessToRole(["teacher"]), getTeacherAssessments);

// Student routes
router.get("/student", isAuth, accessToRole(["student"]), getStudentAssessments);

// Submit (complete) an assessment
router.put("/submit/:assessmentId", isAuth, accessToRole(["teacher"]), submitAssessment);

// Manual trigger of the assessment cycle — admin/superadmin only.
router.post("/manualCycle", isAuth, accessToRole(["admin", "superadmin"]), manualAssessmentCycle);

router.get("/", getAllAssessments);

module.exports = router