const express = require("express");
const router = express.Router();

const { isAuth, accessToRole } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { idParam } = require("../validators/common");
const {
  listCertificates,
  downloadCertificate,
} = require("../controller/certificate.controller");

const anyRole = accessToRole(["student", "teacher", "admin", "superadmin"]);

router.get("/", isAuth, anyRole, listCertificates);
router.get(
  "/:id/certificate.pdf",
  isAuth,
  anyRole,
  validate(idParam, "params"),
  downloadCertificate
);

module.exports = router;
