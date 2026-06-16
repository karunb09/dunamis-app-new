const express = require('express');
const router = express.Router();
const { isAuth, accessToRole } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { idParam } = require("../validators/common");
const { bankDetailsSchema } = require("../validators/teacher.validator");
const {
  createTeacher,
  getPublicTeachers,
  getPublicTeacherById,
  getAllTeachers,
  getTeacherById,
  updateTeacher,
  addBankDetails,
  deleteTeacher,
  updateInstructorDocument,
  getInstructorDocuments,
  getTeacherCourseMedia,
} = require('../controller/teacher.controller');

// Routes
router.post('/', isAuth, accessToRole(["admin", "superadmin"]), createTeacher);
router.get('/public', getPublicTeachers);
router.get('/public/:id', getPublicTeacherById);
router.get('/', isAuth, accessToRole(["admin", "superadmin"]), getAllTeachers);
router.get('/:id', isAuth, accessToRole(["admin", "superadmin", "teacher"]), getTeacherById);
router.put("/:id", isAuth, accessToRole(["admin", "superadmin", "teacher"]), updateTeacher);
router.put("/:id/bank-details", isAuth, accessToRole(["teacher", "admin", "superadmin"]), validate(idParam, "params"), validate(bankDetailsSchema), addBankDetails);
router.post("/:id/documents", isAuth, accessToRole(["teacher", "admin", "superadmin"]), updateInstructorDocument);
router.get("/:id/documents", isAuth, accessToRole(["teacher", "admin", "superadmin"]), getInstructorDocuments);
router.get("/:id/course-media", isAuth, accessToRole(["teacher", "admin", "superadmin"]), getTeacherCourseMedia);
router.delete("/:id", isAuth, accessToRole(["admin", "superadmin"]), deleteTeacher);

module.exports = router;
