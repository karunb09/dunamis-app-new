const Student = require("../model/student.model");
const asyncHandler = require("../utils/asyncHandler");
const Course = require("../model/course.model");
const Teacher = require("../model/teacher.model");
const Enquiry = require("../model/enquiry.model");
const TeacherApplication = require("../model/teacherApplication.model");
const DemoBooking = require("../model/demoBooking.model");
const Branch = require("../model/branch.model");
const PaymentTransaction = require("../model/paymentTransaction.model");
const { getScope, loadStaff } = require("../middleware/auth");
const { placeFilter, studentFilter } = require("../utils/scopeFilters");

// Recognized-revenue statuses — keep this in sync with controller/insights.controller.js.
const PAID_STATUSES = ["paid", "paid_pending_fulfillment", "fulfilled"];

exports.getAdminSummary = asyncHandler(async (req, res) => {
    const staff = await loadStaff(req);
    const can = (key) => Boolean(staff?.unrestricted || staff?.permissions?.includes(key));
    // A scoped admin's home counts cover their branches and courses only.
    const area = await getScope(req);
    const demoArea = area ? placeFilter(area) : {};
    const skip = Promise.resolve(null);

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
      Student.countDocuments(area ? await studentFilter(area) : {}),
      Course.countDocuments({ isPublished: true }),
      Teacher.countDocuments(),
      Branch.countDocuments({ status: "active" }),
      can("enquiries") ? Enquiry.countDocuments({ status: "new" }) : skip,
      can("instructorManagement")
        ? TeacherApplication.countDocuments({ status: { $in: ["new", "shortlisted", "interviewed"] } })
        : skip,
      DemoBooking.countDocuments({ demoStatus: { $in: ["Booked", "Rescheduled"] }, ...demoArea }),
      DemoBooking.countDocuments({ demoStatus: "Attended", ...demoArea }),
      // PaymentTransaction is the authoritative revenue source — it also
      // captures manual/cash enrollments that Student.payments[] misses.
      // Revenue is Financials information.
      can("financials")
        ? PaymentTransaction.aggregate([
            { $match: { status: { $in: PAID_STATUSES }, ...(area ? placeFilter(area) : {}) } },
            { $group: { _id: null, total: { $sum: "$amount" } } },
          ])
        : skip,
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalStudents,
        activeCourses,
        totalInstructors,
        activeBranches,
        // null = not something this admin's permissions cover.
        newEnquiries,
        pendingApplications,
        bookedDemos,
        attendedDemos,
        revenue: revenueResult ? revenueResult[0]?.total || 0 : null,
      },
    });
});
