const express = require('express');
const router = express.Router();
const { isAuth, accessToRole, requirePermission } = require("../middleware/auth");
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
// Teachers pass requirePermission untouched; their own-record checks stay in the controllers.
const managers = requirePermission("instructorManagement");

router.post('/', isAuth, accessToRole(["admin", "superadmin"]), managers, createTeacher);
router.get('/public', getPublicTeachers);
router.get('/public/:id', getPublicTeacherById);
// Also the instructor pickers on course and branch forms.
router.get('/', isAuth, accessToRole(["admin", "superadmin"]), requirePermission("instructorManagement", "courseManagement", "offlineCenters"), getAllTeachers);
router.get('/:id', isAuth, accessToRole(["admin", "superadmin", "teacher"]), managers, getTeacherById);
router.put("/:id", isAuth, accessToRole(["admin", "superadmin", "teacher"]), managers, updateTeacher);
router.put("/:id/bank-details", isAuth, accessToRole(["teacher", "admin", "superadmin"]), managers, validate(idParam, "params"), validate(bankDetailsSchema), addBankDetails);
router.post("/:id/documents", isAuth, accessToRole(["teacher", "admin", "superadmin"]), managers, updateInstructorDocument);
router.get("/:id/documents", isAuth, accessToRole(["teacher", "admin", "superadmin"]), managers, getInstructorDocuments);
router.get("/:id/course-media", isAuth, accessToRole(["teacher", "admin", "superadmin"]), managers, getTeacherCourseMedia);
router.delete("/:id", isAuth, accessToRole(["admin", "superadmin"]), managers, deleteTeacher);

module.exports = router;
