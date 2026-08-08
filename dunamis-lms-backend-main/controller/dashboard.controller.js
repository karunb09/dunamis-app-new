const Student = require("../model/student.model");
const asyncHandler = require("../utils/asyncHandler");
const Course = require("../model/course.model");
const Teacher = require("../model/teacher.model");
const Enquiry = require("../model/enquiry.model");
const TeacherApplication = require("../model/teacherApplication.model");
const DemoBooking = require("../model/demoBooking.model");
const Branch = require("../model/branch.model");
const PaymentTransaction = require("../model/paymentTransaction.model");

// Recognized-revenue statuses — keep this in sync with controller/insights.controller.js.
const PAID_STATUSES = ["paid", "paid_pending_fulfillment", "fulfilled"];

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
      // PaymentTransaction is the authoritative revenue source — it also
      // captures manual/cash enrollments that Student.payments[] misses.
      PaymentTransaction.aggregate([
        { $match: { status: { $in: PAID_STATUSES } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
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
