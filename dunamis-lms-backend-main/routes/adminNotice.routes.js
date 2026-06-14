const express = require("express");
const router = express.Router();

const { isAuth, accessToRole } = require("../middleware/auth");
const { getAllNotices, getNoticeById, updateNotice, deleteNotice, sendNotice, createNotice } = require("../controller/adminNotice.controller");

const adminOnly = [isAuth, accessToRole(["admin", "superadmin"])];

router.post("/", ...adminOnly, createNotice);
router.get("/", getAllNotices);
router.get("/:id", getNoticeById);
router.put("/:id", ...adminOnly, updateNotice);
router.delete("/:id", ...adminOnly, deleteNotice);
router.patch("/send/:id", ...adminOnly, sendNotice);

module.exports = router;
