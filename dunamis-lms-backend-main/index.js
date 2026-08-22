const express = require("express");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const compression = require("compression");
const app = express();

app.set("trust proxy", 1);

const database = require("./config/database");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const fileUpload = require("express-fileupload");
const path = require("path");
const colors = require('colors')
const { validateEnv } = require("./config/env");
const { errorHandler, notFound } = require("./middleware/errorHandler");

dotenv.config();
// Fail fast on missing/weak secrets before anything else boots.
validateEnv();

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

const allowedOriginPatterns = [
  /^https:\/\/([a-z0-9-]+\.)?dunamisindia\.co\.in$/i,
];

const isAllowedOrigin = (origin) => {
  const normalizedOrigin = normalizeOrigin(origin);

  if (!normalizedOrigin) {
    return true;
  }

  if (allowedOrigins.has(normalizedOrigin)) {
    return true;
  }

  return allowedOriginPatterns.some((pattern) =>
    pattern.test(normalizedOrigin)
  );
};

const corsOptions = {
  origin: function (origin, callback) {
    if (isAllowedOrigin(origin)) {
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
const callbackRequestRoutes = require("./routes/callbackRequest.routes")
const adminNoticeRoutes = require("./routes/adminNotice.routes");
const feedbackRoutes = require("./routes/feedback.routes");
const remunerationRoutes = require("./routes/remuneration.routes");
const assignmentRoutes = require("./routes/assignment.routes");
const attendanceHomeworkRoutes = require("./routes/attendanceHomework.routes");
const assessmentRoutes = require("./routes/assessment.route")
const siteContentRoutes = require("./routes/siteContent.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const courseRequestRoutes = require("./routes/courseRequest.routes");
const referralRoutes = require("./routes/referral.routes");
const opsRoutes = require("./routes/ops.routes");
const insightsRoutes = require("./routes/insights.routes");
const reportsRoutes = require("./routes/reports.routes");
const paymentsRoutes = require("./routes/payments.routes");
const studentPaymentsRoutes = require("./routes/studentPayments.routes");

const PORT = process.env.PORT || 3000;

const isProd = process.env.NODE_ENV === "production";

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 200 : 10000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 20 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts, please try again later." },
});

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later." },
});

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many webhook requests." },
});

database.connect();

require("./cronJobs/overdueReminder");
require("./cronJobs/installmentReminder");
require("./cronJobs/generateWeeklySlots.job");
require("./cronJobs/runAssessmentCycle")
require("./cronJobs/assignment.cron")
require("./cronJobs/attendanceDigest.cron");
require("./cronJobs/missedAttendanceReminder.cron");
require("./cronJobs/classReminder.cron");
require("./cronJobs/monthlyInsights.cron");
require("./cronJobs/paymentReconciler.cron");

// Security headers. CSP is disabled (this is a JSON API, not an HTML origin —
// CSP belongs on the frontends) and CORP is set to cross-origin so the
// frontends on other domains can still load images served from /uploads.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.post(
  "/api/v1/enrollment/cashfree-webhook",
  webhookLimiter,
  express.raw({ type: "application/json" }),
  require("./controller/enrollmentController").handleCashfreeWebhook
);

// Mounted below the Cashfree webhook so that route keeps its raw body.
app.use(compression({ threshold: 1024 }));

// Cap JSON body size to blunt oversized-payload abuse (file uploads use the
// separate express-fileupload pipeline below, not JSON).
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(cors(corsOptions));

// Upload size cap. 300MB is very high for an LMS — kept as the default to avoid
// breaking existing large uploads, but now tunable via MAX_UPLOAD_MB. Lower this
// (e.g. 50) once you confirm the largest legitimate file size.
const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB) || 300;
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
    createParentPath: true,
    limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 },
    abortOnLimit: true,
    responseOnLimit: "File size limit exceeded",
  })
);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/", generalLimiter);
app.use("/api/v1/user/login", authLimiter);
app.use("/api/v1/student/send-otp", authLimiter);
app.use("/api/v1/teacherApplication/send-email-otp", authLimiter);

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
app.use("/api/v1/enrollment", paymentLimiter, enrollmentRoutes);
app.use("/api/v1/slots", slotRoutes);
app.use("/api/v1/demoBookings", demoBookingRoutes);
app.use("/api/v1/enquiry", enquiryRoutes);
app.use("/api/v1/callback-request", callbackRequestRoutes);
app.use("/api/v1/adminNotice", adminNoticeRoutes);
app.use("/api/v1/feedback", feedbackRoutes);
app.use("/api/v1/remuneration", remunerationRoutes);
app.use("/api/v1/assignment", assignmentRoutes);
app.use("/api/v1/attendance-homework", attendanceHomeworkRoutes);
app.use("/api/v1/assessment", assessmentRoutes);
app.use("/api/v1/siteContent", siteContentRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/course-requests", courseRequestRoutes);
app.use("/api/v1/referral", referralRoutes);
app.use("/api/v1/ops", opsRoutes);
app.use("/api/v1/insights", insightsRoutes);
app.use("/api/v1/reports", reportsRoutes);
app.use("/api/v1/payments", paymentsRoutes);
// Only order creation is throttled. The fees page polls /summary and posts
// checkout lifecycle pings, which would otherwise burn the 20-request budget
// and leave the student unable to start the payment itself.
app.use("/api/v1/student-payments/order", paymentLimiter);
app.use("/api/v1/student-payments", studentPaymentsRoutes);

app.get("/", (req, res) => {
  return res.json({
    success: true,
    message: "your server is up and running...",
  });
});

// Root-level so uptime monitors bypass the /api/ rate limiter. 503 on DB loss
// makes external monitors catch Mongo outages, not just process death.
app.get("/health", (req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({
    ok: dbUp,
    db: dbUp ? "connected" : "disconnected",
    uptimeSec: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// 404 for unmatched routes, then the central error handler (must be LAST).
app.use(notFound);
app.use(errorHandler);

app.listen(PORT,()=>{
    console.log(`App is running at ${PORT}`.bgBlue);
})
