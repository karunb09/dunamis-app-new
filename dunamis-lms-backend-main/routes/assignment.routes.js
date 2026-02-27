const express = require("express");
const router = express.Router();
const { createAssignment, submitAssignment, reviewSubmission, getAssignmentsByStatus, getStudentAssignments } = require("../controller/assignment.controller");
const { isAuth, accessToRole } = require("../middleware/auth");
const { manualAssignmentCycle } = require("../cronJobs/assignment.cron");

router.put("/create", isAuth, accessToRole(["teacher"]), createAssignment);
router.put("/submit", isAuth, accessToRole(["student"]), submitAssignment);
router.put("/review", isAuth, accessToRole(["teacher"]), reviewSubmission);
router.get("/status", isAuth, accessToRole(["teacher"]), getAssignmentsByStatus);
router.get("/student", isAuth, accessToRole(["student"]), getStudentAssignments);
router.post("/manualAssignmentCycle", manualAssignmentCycle);

module.exports = router;
