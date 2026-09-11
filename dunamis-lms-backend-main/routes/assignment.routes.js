const express = require("express");
const router = express.Router();
const { createAssignment, listTeacherLearners, submitAssignment, reviewSubmission, getAssignmentsByStatus, getStudentAssignments } = require("../controller/assignment.controller");
const validate = require("../middleware/validate");
const { createAssignmentSchema, reviewSubmissionSchema } = require("../validators/assignment.validator");
const { isAuth, accessToRole } = require("../middleware/auth");
const { manualAssignmentCycle } = require("../cronJobs/assignment.cron");

router.post("/create", isAuth, accessToRole(["teacher"]), validate(createAssignmentSchema), createAssignment);
router.get("/learners", isAuth, accessToRole(["teacher"]), listTeacherLearners);
router.put("/submit", isAuth, accessToRole(["student"]), submitAssignment);
router.put("/review", isAuth, accessToRole(["teacher"]), validate(reviewSubmissionSchema), reviewSubmission);
router.get("/status", isAuth, accessToRole(["teacher"]), getAssignmentsByStatus);
router.get("/student", isAuth, accessToRole(["student"]), getStudentAssignments);
// Manual trigger of the assignment cycle — admin/superadmin only.
router.post("/manualAssignmentCycle", isAuth, accessToRole(["admin", "superadmin"]), manualAssignmentCycle);

module.exports = router;
