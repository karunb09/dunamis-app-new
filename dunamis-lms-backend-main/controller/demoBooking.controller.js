const DemoBooking = require("../model/demoBooking.model");
const Slot = require("../model/slot.model");
const Student = require("../model/student.model");
const Category = require( "../model/category.model")

// Book a demo slot
exports.bookDemoSlot = async (req, res) => {
  try {
    const { slotId, courseId } = req.body;
    const userId = req.user.userId;

    if (!courseId || !slotId) {
      return res
        .status(400)
        .json({ message: "courseId and slotId are required" });
    }

    // Find student by logged-in user
    const studentExists = await Student.findOne({ userId })
      .populate("userId", "name email mobileNo")
      .populate("enrolledCourses.courseId", "code name category");

    if (!studentExists) {
      return res.status(404).json({ message: "Student not found" });
    }

    const slot = await Slot.findById(slotId)
      .populate({
        path: "courseId",
        select: "name code category mode teacher",
        populate: [
          { path: "category", model: "Category", select: "_id name" },
          { path: "teacher", model: "teacher", select: "_id userId" },
        ],
      })
      .populate({
        path: "createdBy",
        populate: { path: "userId", select: "name email mobileNo image" },
      });

    if (!slot)
      return res
        .status(404)
        .json({ success: false, message: "Slot not found" });

    // Ensure this is a demo slot
    if (slot.slotType !== "demo") {
      return res.status(400).json({
        success: false,
        message: "This slot is not open for demo booking",
      });
    }

    // Ensure this slot was created by a teacher
    if (!slot.createdBy) {
      return res
        .status(400)
        .json({ message: "This slot is not created by any teacher" });
    }

    // Check if course has teacher assigned
    if (!slot.courseId.teacher || slot.courseId.teacher.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Slot not assigned to any teacher",
      });
    }

    // Prevent duplicate booking
    const existingBooking = await DemoBooking.findOne({
      studentId: studentExists._id,
      slotId,
    });
    if (existingBooking) {
      return res
        .status(400)
        .json({ success: false, message: "Already booked" });
    }

    // Check if student is enrolled in this course
    const isEnrolled = studentExists.enrolledCourses.some(
      (course) =>
        course.courseId?._id?.toString() === slot.courseId._id.toString()
    );

    console.log("slot.courseId.category:", slot.courseId?.category);

    const categoryId =
      slot.courseId?.category?._id?.toString() ||
      slot.courseId?.category?.toString() ||
      null;

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: "Category not found for this course",
      });
    }

    // Create booking
    const booking = await DemoBooking.create({
      studentId: studentExists._id,
      slotId,
      courseId,
      teacherId: slot.createdBy._id,
      categoryId,
      demoStatus: "Booked",
      enrollmentStatus: isEnrolled ? "Enrolled" : "Not Enrolled",
      followUp: "Pending",
      response: "",
    });

    // Link booking to student
    studentExists.demoCourse.push(booking._id);
    await studentExists.save();

    // Get category name (populated or fetch separately)
    const categoryName =
      slot.courseId.category?.name ||
      (await Category.findById(categoryId).then((cat) => cat?.name || "N/A"));

    // Structured response
    const bookingDetails = {
      _id: booking._id,
      student: {
        id: studentExists._id,
        name: studentExists.userId?.name,
        email: studentExists.userId?.email,
        mobile: studentExists.userId?.mobileNo,
      },
      course: {
        id: slot.courseId._id,
        name: slot.courseId.name,
        code: slot.courseId.code,
        category: categoryName,
        mode: slot.courseId.mode,
      },
      slot: {
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
      },
      instructor: {
        id: slot.createdBy._id,
        user: slot.createdBy.userId,
      },
      demoStatus: booking.demoStatus,
      enrollmentStatus: booking.enrollmentStatus,
      followUp: booking.followUp,
      response: booking.response,
    };

    res.status(201).json({
      success: true,
      message: "Demo slot booked successfully",
      booking: bookingDetails,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get all bookings
exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await DemoBooking.find()
      .populate({
        path: "studentId",
        select: "followUps demoCourse mode enrolledCourses adminActions",
        populate: [
          {
            path: "userId",
            select: "name mobileNo email accountType accountStatus image roleId",
            populate: [
              {
                path: "name",
                select: "firstName lastName",
              },
              {
                path: "roleId",
                select: "_id name description",
              },
            ]
          },
          {
            path: "enrolledCourses.courseId",
            select: "name code category",
            populate: {
              path: "category",
              select: "name",
            },
          }
        ]
      })
      .populate({
        path: "slotId",
        select: "date startTime endTime location",
        populate: [
          { path: "courseId", select: "name code mode category" },
          {
            path: "createdBy",
            populate: { path: "userId", select: "name email mobileNo image" },
          },
        ],
      })
      .populate({
        path: "teacherId",
        populate: { path: "userId", select: "name email mobileNo image" },
      });

    res.status(200).json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update booking
exports.updateBooking = async (req, res) => {
  try {
    const { demoStatus, enrollmentStatus, followUp, response } = req.body;

    const updateFields = {};
    if (demoStatus) updateFields.demoStatus = demoStatus;
    if (enrollmentStatus) updateFields.enrollmentStatus = enrollmentStatus;
    if (followUp) updateFields.followUp = followUp;
    if (response !== undefined) updateFields.response = response;

    const booking = await DemoBooking.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true }
    );

    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }

    res.status(200).json({
      success: true,
      message: "Booking updated successfully",
      booking,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
