// Loaders for every sidebar destination, hoisted out of the lazy() calls in
// App.jsx so Sidebar can warm a chunk on hover before the click lands.
export const routeLoaders = {
  "/admin": () => import("./page/AdminPages/AdminHomePage"),
  "/admin/course-management": () => import("./page/AdminPages/CourseManagementPage"),
  "/admin/course-requests": () => import("./page/AdminPages/CourseRequests/CourseRequestsPage"),
  "/admin/content-management": () => import("./page/AdminPages/ContentManagementPage"),
  "/admin/category-management": () => import("./page/AdminPages/CategoryManagementPage"),
  "/admin/student-management": () => import("./page/AdminPages/UserManagement/StudentManagementPage"),
  "/admin/instructor-management": () => import("./page/AdminPages/UserManagement/InstructorManagementPage"),
  "/admin/admin-management": () => import("./page/AdminPages/UserManagement/AdminManageMentPage"),
  "/admin/centers": () => import("./page/AdminPages/OffilineCentersPage"),
  "/admin/financials": () => import("./page/AdminPages/FinancialPage"),
  "/admin/reports": () => import("./page/AdminPages/MonthlyReportPage"),
  "/admin/reports/attendance": () => import("./page/AdminPages/DailyAttendanceReportPage"),
  "/admin/enquiries": () => import("./page/AdminPages/EnquiriesPage"),
  "/admin/referral-management": () => import("./page/AdminPages/ReferralManagement/ReferralManagementPage"),
  "/admin/updates": () => import("./page/AdminPages/UpdatesPage"),
  "/admin/site-content": () => import("./page/AdminPages/SiteContentPage"),
  "/admin/system-status": () => import("./page/AdminPages/SystemStatus"),

  "/teacher": () => import("./page/TeacherPages/TeacherCourses/Home"),
  "/teacher/courses": () => import("./page/TeacherPages/TeacherCourses/MyCourses"),
  "/teacher/students": () => import("./page/TeacherPages/TeacherCourses/MyStudent"),
  "/teacher/schedule": () => import("./page/TeacherPages/MySchedule"),
  "/teacher/assignments": () => import("./page/TeacherPages/Assignment"),
  "/teacher/assessments": () => import("./page/TeacherPages/Assessment"),
  "/teacher/attendance": () => import("./page/TeacherPages/TeacherCourses/Attendance"),
};

// import() is module-cached, so repeated hovers cost nothing after the first.
export const prefetchRoute = (path) => {
  routeLoaders[path]?.();
};
