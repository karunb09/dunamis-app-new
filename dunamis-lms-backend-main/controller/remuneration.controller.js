const Remuneration = require("../model/remuneration.model");
const asyncHandler = require("../utils/asyncHandler");
const Teacher = require("../model/teacher.model");
const Slot = require("../model/slot.model");
const Student = require("../model/student.model");
const DemoBooking = require("../model/demoBooking.model");
const { calculateHours } = require("../utils/remuneration");
const { toWords } = require("number-to-words");

exports.getRemunerationByTeacher = asyncHandler(async (req, res) => {
    const { teacherId } = req.params;

    if (!teacherId) {
      return res.status(400).json({
        success: false,
        message: "Please Enter Teacher Id.",
      });
    }

    const teacherExists = await Teacher.findById(teacherId);
    if (!teacherExists) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found.",
      });
    }

    const records = await Remuneration.find({ teacherId }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: records.length,
      data: records,
    });
});

exports.getRemunerationById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Invalid remuneration ID.",
      });
    }

    const record = await Remuneration.findById(id).populate(
      "teacherId",
      "userId"
    );

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Remuneration record not found.",
      });
    }

    res.status(200).json({
      success: true,
      data: record,
    });
});

exports.autoGenerateRemuneration = asyncHandler(async (req, res) => {
    const { teacherId, month } = req.body;
    if (!teacherId || !month)
      return res.status(400).json({ message: "Teacher ID and month required" });

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });

    // Prevent duplicate remuneration
    const existing = await Remuneration.findOne({ teacherId, month });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Remuneration for ${month} already exists for this teacher.`,
      });
    }

    const startDate = new Date(`${month}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    // Fetch enrolled (paid) slots only
    const slots = await Slot.find({
      createdBy: teacherId,
      date: { $gte: startDate, $lt: endDate },
      slotType: "enrolled",
    });

    if (!slots.length) {
      return res.status(200).json({
        success: false,
        message: "No enrolled slots found for this month.",
        remuneration: null,
      });
    }

    // Split slots by session type
    const groupSlots = slots.filter((s) => s.sessionType === "standard");
    const individualSlots = slots.filter((s) => s.sessionType === "premium");

    const groupHours = calculateHours(groupSlots);
    const individualHours = calculateHours(individualSlots);

    // Demo slots attended by teacher
    const demoBookings = await DemoBooking.find({
      teacherId,
      date: { $gte: startDate, $lt: endDate },
      demoStatus: "Attended",
    }).populate("slotId", "startTime endTime");

    const demoHours = calculateHours(
      demoBookings.filter((d) => d.slotId).map((d) => d.slotId)
    );

    const totalHours =
      Number(groupHours || 0) +
      Number(individualHours || 0) +
      Number(demoHours || 0);

    // salary logic
    const basic = totalHours * 500;
    const deductions = 10;
    const percentage = 50; 
    const totalEarnings = basic - (basic * deductions) / 100;
    const totalEarningsInWords = toWords(totalEarnings).replace(/\b\w/g, (c) =>
      c.toUpperCase()
    );

    // Students involved in the slots
    const studentIds = [
      ...new Set(
        slots.flatMap((s) => s.students?.map((st) => st.toString()) || [])
      ),
    ];

    const students = await Student.find({ _id: { $in: studentIds } });

    // Track students by session type
    const groupStudentSet = new Set();
    const individualStudentSet = new Set();

    students.forEach((student) => {
      student.payments.forEach((payment) => {
        if (payment.PaymentStatus !== "completed") return;
        const sessionType = payment.sessionType || "standard";
        const paidCourseId = payment.courseId.toString();

        if (slots.some((s) => s.courseId.toString() === paidCourseId)) {
          if (sessionType === "standard")
            groupStudentSet.add(student._id.toString());
          if (sessionType === "premium")
            individualStudentSet.add(student._id.toString());
        }
      });
    });

    const groupStudents = groupStudentSet.size;
    const individualStudents = individualStudentSet.size;
    const demoStudents = demoBookings.filter((d) => d.slotId).length;

    // Missed classes
    const attendedSlotIds = new Set(
      demoBookings.map((d) => d.slotId?._id?.toString())
    );
    const missedClasses = slots.filter(
      (s) => !attendedSlotIds.has(s._id.toString())
    ).length;

    const remuneration = await Remuneration.create({
      teacherId,
      month,
      transactionId: Date.now().toString(),
      workDays: Math.floor(Math.random() * 28) + 20,
      percentage,
      basic,
      deductions,
      totalEarnings,
      totalEarningsInWords,
      totalHours: Number(totalHours) || 0,
      groupHours: Number(groupHours) || 0,
      individualHours: Number(individualHours) || 0,
      missedClasses: Number(missedClasses) || 0,
      groupStudents: Number(groupStudents) || 0,
      individualStudents: Number(individualStudents) || 0,
      demoStudents: Number(demoStudents) || 0,
      payStatus: "Due",
    });

    res.status(201).json({
      success: true,
      message: "Remuneration generated successfully.",
      remuneration,
    });
});
