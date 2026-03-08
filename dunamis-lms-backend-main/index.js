const express = require("express");
const app = express();

const database = require("./config/database");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const fileUpload = require("express-fileupload");
const path = require("path");
const colors = require('colors')

dotenv.config();

const normalizeOrigin = (value) => value?.replace(/\/+$/, "");

const defaultAllowedOrigins = [
  "https://dashboard.dunamisindia.co.in",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:3003",
  "https://dunamisindia.co.in",
  "https://www.dunamisindia.co.in",
  "https://api.dunamisindia.co.in",
];

const envAllowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => normalizeOrigin(origin.trim()))
  .filter(Boolean);

const allowedOrigins = new Set(
  [...defaultAllowedOrigins, ...envAllowedOrigins]
    .map(normalizeOrigin)
    .filter(Boolean)
);

const corsOptions = {
  origin: function (origin, callback) {
    const normalizedOrigin = normalizeOrigin(origin);

    if (!normalizedOrigin || allowedOrigins.has(normalizedOrigin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

const enrollmentRoutes = require("./routes/enrollment.routes");
const studentRoutes = require("./routes/student.routes");
const userRoutes = require("./routes/user.routes");
const adminRoutes = require("./routes/admin.routes");
const teacherApplicationRoutes = require("./routes/teacherApplication.routes");
const categoryRoutes = require("./routes/category.routes");
const subCategoryRoutes = require("./routes/subCategory.routes");
const branchRoutes = require("./routes/branch.routes");
const cityRoutes = require("./routes/city.routes");
const contentRoutes = require("./routes/content.routes");
const zoneRoutes = require("./routes/zone.routes");
const courseRoutes = require("./routes/course.routes");
const teacherRoutes = require("./routes/teachers.routes");
const demoBookingRoutes = require("./routes/demoBooking.route")
const slotRoutes = require("./routes/slot.routes")
const enquiryRoutes = require("./routes/enquiry.routes")
const adminNoticeRoutes = require("./routes/adminNotice.routes");
const feedbackRoutes = require("./routes/feedback.routes");
const remunerationRoutes = require("./routes/remuneration.routes");
const assignmentRoutes = require("./routes/assignment.routes");
const attendanceHomeworkRoutes = require("./routes/attendanceHomework.routes");
const assessmentRoutes = require("./routes/assessment.route")

const PORT = process.env.PORT || 3000;

database.connect();

require("./cronJobs/overdueReminder");
require("./cronJobs/generateWeeklySlots.job");
require("./cronJobs/runAssessmentCycle")
require("./cronJobs/assignment.cron")

app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));

app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
    createParentPath: true,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
    abortOnLimit: true,
    responseOnLimit: "File size limit exceeded",
  })
);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/v1/student", studentRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/teacherApplication", teacherApplicationRoutes);
app.use("/api/v1/category", categoryRoutes);
app.use("/api/v1/subcategory", subCategoryRoutes);
app.use("/api/v1/branch", branchRoutes);
app.use("/api/v1/city", cityRoutes);
app.use("/api/v1/content", contentRoutes);
app.use("/api/v1/zone", zoneRoutes);
app.use("/api/v1/course", courseRoutes);
app.use("/api/v1/teachers", teacherRoutes);
app.use("/api/v1/enrollment", enrollmentRoutes);
app.use("/api/v1/slots", slotRoutes);
app.use("/api/v1/demoBookings", demoBookingRoutes);
app.use("/api/v1/enquiry", enquiryRoutes);
app.use("/api/v1/adminNotice", adminNoticeRoutes);
app.use("/api/v1/feedback", feedbackRoutes);
app.use("/api/v1/remuneration", remunerationRoutes);
app.use("/api/v1/assignment", assignmentRoutes);
app.use("/api/v1/attendance-homework", attendanceHomeworkRoutes);
app.use("/api/v1/assessment", assessmentRoutes);

app.get("/", (req, res) => {
  return res.json({
    success: true,
    message: "your server is up and running...",
  });
});

app.listen(PORT,()=>{
    console.log(`App is running at ${PORT}`.bgBlue);
})
