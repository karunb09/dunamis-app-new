const Student = require("../model/student.model");
const asyncHandler = require("../utils/asyncHandler");
const Course = require("../model/course.model");
const Teacher = require("../model/teacher.model");
const Enquiry = require("../model/enquiry.model");
const TeacherApplication = require("../model/teacherApplication.model");
const DemoBooking = require("../model/demoBooking.model");
const Branch = require("../model/branch.model");

exports.getAdminSummary = asyncHandler(async (req, res) => {
    const [
      totalStudents,
      activeCourses,
      totalInstructors,
      activeBranches,
      newEnquiries,
      pendingApplications,
      bookedDemos,
      attendedDemos,
      revenueResult,
    ] = await Promise.all([
      Student.countDocuments(),
      Course.countDocuments({ isPublished: true }),
      Teacher.countDocuments(),
      Branch.countDocuments({ status: "active" }),
      Enquiry.countDocuments({ status: "new" }),
      TeacherApplication.countDocuments({ status: { $in: ["new", "shortlisted", "interviewed"] } }),
      DemoBooking.countDocuments({ demoStatus: { $in: ["Booked", "Rescheduled"] } }),
      DemoBooking.countDocuments({ demoStatus: "Attended" }),
      Student.aggregate([
        { $unwind: "$payments" },
        {
          $match: {
            "payments.PaymentStatus": { $in: ["completed", "Completed", "paid", "Paid"] },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $ifNull: ["$payments.amount", 0] } },
          },
        },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalStudents,
        activeCourses,
        totalInstructors,
        activeBranches,
        newEnquiries,
        pendingApplications,
        bookedDemos,
        attendedDemos,
        revenue: revenueResult?.[0]?.total || 0,
      },
    });
});
