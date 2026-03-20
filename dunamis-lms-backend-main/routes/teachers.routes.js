const express = require('express');
const router = express.Router();
const { isAuth, accessToRole } = require("../middleware/auth");
const {
  createTeacher,
  getPublicTeachers,
  getPublicTeacherById,
  getAllTeachers,
  getTeacherById,
  updateTeacher,
  addBankDetails,
  deleteTeacher,
} = require('../controller/teacher.controller');

// Routes
router.post('/', isAuth, accessToRole(["admin", "superadmin"]), createTeacher);
router.get('/public', getPublicTeachers);
router.get('/public/:id', getPublicTeacherById);
router.get('/', isAuth, accessToRole(["admin", "superadmin"]), getAllTeachers);
router.get('/:id', isAuth, accessToRole(["admin", "superadmin", "teacher"]), getTeacherById);
router.put("/:id", isAuth, accessToRole(["admin", "superadmin", "teacher"]), updateTeacher);
router.put("/:id/bank-details", isAuth, accessToRole(["teacher", "admin", "superadmin"]), addBankDetails);
router.delete("/:id", isAuth, accessToRole(["admin", "superadmin"]), deleteTeacher);

module.exports = router;
