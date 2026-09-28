const express = require("express");
const router = express.Router();

const { isAuth, accessToRole, requirePermission } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { z } = require("zod");
const { idParam, objectId } = require("../validators/common");
const {
  listCertificates,
  downloadCertificate,
} = require("../controller/certificate.controller");

// Learners and instructors see their own; admins need Student Management.
const anyRole = [
  accessToRole(["student", "teacher", "admin", "superadmin"]),
  requirePermission("studentManagement"),
];

router.get(
  "/",
  isAuth,
  anyRole,
  validate(z.object({ studentId: objectId("studentId").nullish() }), "query"),
  listCertificates
);
router.get(
  "/:id/certificate.pdf",
  isAuth,
  anyRole,
  validate(idParam, "params"),
  downloadCertificate
);

module.exports = router;
