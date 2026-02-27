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
} = require("../controller/student.controller");
// send otp
router.post("/send-otp", sendOTP);
// create stud.
router.post("/create", createStudent);
// get all stud.
router.get("/get-all", getAllStudents);
// get by type
router.get("/get-by-type", getStudentsByType);
// get by id
router.get("/:id", getStudentById);
// update
router.put("/:id", updateStudent);
// delete
router.delete("/:id", deleteStudent);

module.exports = router;
