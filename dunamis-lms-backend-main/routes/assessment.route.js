const express = require("express");
const router = express.Router();

const { isAuth, accessToRole, requirePermission } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { idParam } = require("../validators/common");
const {
  sendQuestionnaireSchema,
  submitResponseSchema,
} = require("../validators/assessment.validator");
const {
  getTeacherAssessments,
  getStudentAssessments,
  submitAssessment,
  getAllAssessments,
  sendQuestionnaire,
  submitAssessmentResponse,
  issueCertificate,
} = require("../controller/assessment.controller");
const { manualAssessmentCycle } = require("../cronJobs/runAssessmentCycle");

router.get("/teacher", isAuth, accessToRole(["teacher"]), getTeacherAssessments);
router.get("/student", isAuth, accessToRole(["student"]), getStudentAssessments);

router.post(
  "/send",
  isAuth,
  accessToRole(["teacher"]),
  validate(sendQuestionnaireSchema),
  sendQuestionnaire
);
router.post(
  "/:id/submit-response",
  isAuth,
  accessToRole(["student"]),
  validate(idParam, "params"),
  validate(submitResponseSchema),
  submitAssessmentResponse
);
router.post(
  "/:id/certificate",
  isAuth,
  accessToRole(["teacher"]),
  validate(idParam, "params"),
  issueCertificate
);

router.put("/submit/:assessmentId", isAuth, accessToRole(["teacher"]), submitAssessment);
// No dashboard screen: All Access only.
router.post("/manualCycle", isAuth, accessToRole(["admin", "superadmin"]), requirePermission(), manualAssessmentCycle);
router.get("/", isAuth, accessToRole(["admin", "superadmin"]), requirePermission(), getAllAssessments);

module.exports = router;
