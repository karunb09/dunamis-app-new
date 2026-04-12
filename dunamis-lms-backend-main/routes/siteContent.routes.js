const express = require("express");
const router = express.Router();

const { isAuth, accessToRole } = require("../middleware/auth");
const {
  createContent,
  deleteContent,
  getAllContent,
  getPublicContent,
  updateContent,
} = require("../controller/siteContent.controller");

router.get("/public", getPublicContent);

router.get("/", isAuth, accessToRole(["admin", "superadmin"]), getAllContent);
router.post("/", isAuth, accessToRole(["admin", "superadmin"]), createContent);
router.put("/:id", isAuth, accessToRole(["admin", "superadmin"]), updateContent);
router.delete("/:id", isAuth, accessToRole(["admin", "superadmin"]), deleteContent);

module.exports = router;
