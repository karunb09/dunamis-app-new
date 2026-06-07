const express = require("express");
const router = express.Router();
const {
  createStudent,
  sendOTP,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  getStudentsByType,
  searchStudents,
} = require("../controller/student.controller");
const { isAuth, accessToRole } = require("../middleware/auth");

const canAccessStudentRecord = (req, res, next) => {
  const accountType = req.user?.accountType;

  if (accountType === "admin" || accountType === "superadmin") {
    return next();
  }

  if (accountType === "student" && String(req.user?.roleId) === String(req.params.id)) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "You are not authorized to access this student record",
  });
};

// send otp
router.post("/send-otp", sendOTP);
// create stud.
router.post("/create", createStudent);
// get all stud.
router.get("/get-all", isAuth, accessToRole(["admin", "superadmin"]), getAllStudents);
// get by type
router.get("/get-by-type", isAuth, accessToRole(["admin", "superadmin"]), getStudentsByType);
// search by name / email / phone (admin only)
router.get("/search", isAuth, accessToRole(["admin", "superadmin"]), searchStudents);
// get by id
router.get("/:id", isAuth, accessToRole(["student", "admin", "superadmin"]), canAccessStudentRecord, getStudentById);
// update
router.put("/:id", isAuth, accessToRole(["student", "admin", "superadmin"]), canAccessStudentRecord, updateStudent);
// delete
router.delete("/:id", isAuth, accessToRole(["admin", "superadmin"]), deleteStudent);

module.exports = router;
