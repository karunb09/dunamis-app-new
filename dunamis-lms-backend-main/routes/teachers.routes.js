const express = require('express');
const router = express.Router();
const { isAuth, accessToRole } = require("../middleware/auth");
const {
  createTeacher,
  getAllTeachers,
  getTeacherById,
  updateTeacher,
  addBankDetails,
} = require('../controller/teacher.controller');

// Routes
router.post('/', isAuth, accessToRole(["admin", "superadmin"]), createTeacher);
router.get('/', getAllTeachers);
router.get('/:id', getTeacherById);
router.put("/:id", isAuth, accessToRole(["admin", "superadmin", "teacher"]), updateTeacher);
router.put("/:id/bank-details", isAuth, accessToRole(["teacher", "admin", "superadmin"]), addBankDetails);

module.exports = router;
