const express = require('express');
const router = express.Router();
const { getAllTeachers, getTeacherById, updateTeacher, addBankDetails } = require('../controller/teacher.controller');

// Routes
router.get('/', getAllTeachers);
router.get('/:id', getTeacherById);
router.put("/:id", updateTeacher);
router.put("/:id/bank-details", addBankDetails);

module.exports = router;