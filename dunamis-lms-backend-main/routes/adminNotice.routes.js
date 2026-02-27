const express = require("express");
const router = express.Router();

const { isAuth } = require("../middleware/auth");
const { getAllNotices, getNoticeById, updateNotice, deleteNotice, sendNotice, createNotice } = require("../controller/adminNotice.controller");

// POST /api/admin/notice
router.post("/",isAuth, createNotice);

// GET /api/admin/notice
router.get("/", getAllNotices);

// GET /api/admin/notice/:id
router.get("/:id", getNoticeById);

// PUT /api/admin/notice/:id
router.put("/:id", updateNotice);

// DELETE /api/admin/notice/:id
router.delete("/:id", deleteNotice);

// PATCH /api/admin/notice/send/:id
router.patch("/send/:id", sendNotice);

module.exports = router;
