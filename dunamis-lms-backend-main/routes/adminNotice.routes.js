const express = require("express");
const router = express.Router();

const { isAuth, accessToRole } = require("../middleware/auth");
const adminOnly = [isAuth, accessToRole(["admin", "superadmin"])];
const { getAllNotices, getNoticeById, updateNotice, deleteNotice, sendNotice, createNotice } = require("../controller/adminNotice.controller");

// POST /api/admin/notice
router.post("/", ...adminOnly, createNotice);

// GET /api/admin/notice
router.get("/", getAllNotices);

// GET /api/admin/notice/:id
router.get("/:id", getNoticeById);

// PUT /api/admin/notice/:id
router.put("/:id", ...adminOnly, updateNotice);

// DELETE /api/admin/notice/:id
router.delete("/:id", ...adminOnly, deleteNotice);

// PATCH /api/admin/notice/send/:id
router.patch("/send/:id", ...adminOnly, sendNotice);

module.exports = router;
