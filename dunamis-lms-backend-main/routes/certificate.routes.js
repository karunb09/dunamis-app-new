const express = require("express");
const router = express.Router();

const { isAuth, accessToRole } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { z } = require("zod");
const { idParam, objectId } = require("../validators/common");
const {
  listCertificates,
  downloadCertificate,
} = require("../controller/certificate.controller");

const anyRole = accessToRole(["student", "teacher", "admin", "superadmin"]);

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
