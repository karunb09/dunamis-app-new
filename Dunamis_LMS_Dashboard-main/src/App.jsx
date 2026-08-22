import { lazy, Suspense, useEffect, useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";

// Layout
import Sidebar from "./components/mainLayout/Sidebar";
import Navigation from "./components/mainLayout/Navbar";
import SignIn from "./components/signIn";
import TermsAndConditions from "./components/TermsAndConditions";
import SignInNavbar from "./components/signInNavbar";
import { PublicOnlyRoute, RequireAuth } from "./components/auth/AuthGuard";
import { hydrateSession } from "./redux/authSlice";
import { pushPath } from "./utils/navHistory";
import { routeLoaders } from "./routeLoaders";

// Hot Toast
import { Toaster } from "react-hot-toast";
const StudentPortalRedirect = lazy(() => import("./components/auth/StudentPortalRedirect"));

const AdminHomePage = lazy(routeLoaders["/admin"]);
const ContentDetails = lazy(() => import("./page/AdminPages/ContentManagement/ContentDetails"));
const ContentCreate = lazy(() => import("./page/AdminPages/ContentManagement/ContentCreate"));
const CourseManagementPage = lazy(routeLoaders["/admin/course-management"]);
const ContentManagementPage = lazy(routeLoaders["/admin/content-management"]);
const CategoryManagementPage = lazy(routeLoaders["/admin/category-management"]);
const CreateCourseForm = lazy(() => import("./page/AdminPages/AddCoursePage"));
const StudentManagementPage = lazy(routeLoaders["/admin/student-management"]);
const InstructorManagementPage = lazy(routeLoaders["/admin/instructor-management"]);
const AdminManageMentPage = lazy(routeLoaders["/admin/admin-management"]);
const OffilineCentersPage = lazy(routeLoaders["/admin/centers"]);
const UpdatesPage = lazy(routeLoaders["/admin/updates"]);
const FinancialPage = lazy(routeLoaders["/admin/financials"]);
const EnquiriesPage = lazy(routeLoaders["/admin/enquiries"]);
const SiteContentPage = lazy(routeLoaders["/admin/site-content"]);
const StudentProfile = lazy(() => import("./page/AdminPages/UserManagement/Students/EnrolledStudentProfile"));
const EnrolledStudents = lazy(() => import("./page/AdminPages/UserManagement/Students/EnrolledStudents"));
const CourseRequestsPage = lazy(routeLoaders["/admin/course-requests"]);
const ReferralManagementPage = lazy(routeLoaders["/admin/referral-management"]);
const SystemStatus = lazy(routeLoaders["/admin/system-status"]);
const MonthlyReportPage = lazy(routeLoaders["/admin/reports"]);
const DailyAttendanceReportPage = lazy(routeLoaders["/admin/reports/attendance"]);

const Dashboard = lazy(routeLoaders["/teacher"]);
const MyCourses = lazy(routeLoaders["/teacher/courses"]);
const MyStudent = lazy(routeLoaders["/teacher/students"]);
const Assignment = lazy(routeLoaders["/teacher/assignments"]);
const MySchedule = lazy(routeLoaders["/teacher/schedule"]);
const Attendance = lazy(routeLoaders["/teacher/attendance"]);
const Assessment = lazy(routeLoaders["/teacher/assessments"]);
const StudentDetail = lazy(() => import("./page/TeacherPages/TeacherCourses/StudentDetail"));
const Profile = lazy(() => import("./page/TeacherPages/profile"));

const Instructor = lazy(() => import("./page/AdminPages/UserManagement/Instructor/Instructor"));
const AddInstructorForm = lazy(() => import("./page/AdminPages/UserManagement/Instructor/AddInstructorForm"));
const InstructorProfile = lazy(() => import("./page/AdminPages/UserManagement/Instructor/InstructorProfile"));
const AddAdminForm = lazy(() => import("./page/AdminPages/AddAdminForm"));
const AddBranch = lazy(() => import("./page/AdminPages/OfflineCenters/AddBranchForm"));
const AddZone = lazy(() => import("./page/AdminPages/OfflineCenters/AddZoneForm"));
const AddCityForm = lazy(() => import("./page/AdminPages/OfflineCenters/AddCityForm"));
const CreateUpdateForm = lazy(() => import("./page/AdminPages/Updates/CreateUpdateForm"));
const AdminProfile = lazy(() => import("./page/AdminPages/AdminProfile"));
const AddCategory = lazy(() => import("./page/AdminPages/CategoryManagement/AddCategory"));
const CenterDetailsPage = lazy(() => import("./page/AdminPages/OfflineCentersDetail/CenterDetailsPage"));
const ApplicationDetails = lazy(() => import("./page/AdminPages/UserManagement/Instructor/ApplicationDetails"));
const CourseDetails = lazy(() => import("./page/AdminPages/CourseDetails"));

const RouteFallback = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-3 w-24 rounded-full bg-slate-200" />
    <div className="h-8 w-64 rounded-2xl bg-slate-200" />
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-40 rounded-[30px] bg-slate-200/70" />
      ))}
    </div>
  </div>
);



const App = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const dispatch = useDispatch();

  const location = useLocation();

  useEffect(() => {
    dispatch(hydrateSession());
  }, [dispatch]);

  // Track visited routes in localStorage so the shared BackButton can return
  // to the previous screen even after a hard reload.
  useEffect(() => {
    pushPath(`${location.pathname}${location.search}`);
  }, [location.pathname, location.search]);

  if (location.pathname === "/" || location.pathname === "/terms") {
    return (
      <>
        <Toaster />
        <div className="flex flex-col h-screen">
          <SignInNavbar />
          {location.pathname === "/" ? (
            <PublicOnlyRoute>
              <SignIn />
            </PublicOnlyRoute>
          ) : (
            <TermsAndConditions />
          )}
        </div>
      </>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900">
      <Toaster />
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navigation onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 px-4 pb-6 pt-4 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1600px]">
            <Suspense fallback={<RouteFallback />}>
              <Routes>
              {/* Student Routes */}
              <Route path="/home" element={<StudentPortalRedirect />} />
              <Route path="/my-courses" element={<StudentPortalRedirect />} />
              <Route path="/explore-courses" element={<StudentPortalRedirect />} />
              <Route path="/assignments" element={<StudentPortalRedirect />} />
              <Route path="/upload" element={<StudentPortalRedirect />} />
              <Route path="/homework" element={<StudentPortalRedirect />} />
              <Route path="/performance" element={<StudentPortalRedirect />} />
              <Route path="/student/profile" element={<StudentPortalRedirect />} />
              <Route
                path="/explore-course/:id"
                element={<StudentPortalRedirect />}
              />
              <Route path="/payment/confirm" element={<StudentPortalRedirect />} />
              {/* Admin Routes */}
              <Route path="/admin" element={<RequireAuth allowedRoles={["admin", "superadmin"]}><AdminHomePage /></RequireAuth>} />
              <Route
                path="/admin/content-management"
                element={<RequireAuth allowedRoles={["admin", "superadmin"]} requiredPermission="contentManagement"><ContentManagementPage /></RequireAuth>}
              />
              <Route
                path="/admin/content/details/:id"
                element={<RequireAuth allowedRoles={["admin", "superadmin"]} requiredPermission="contentManagement"><ContentDetails /></RequireAuth>}
              />
              <Route path="/admin/content/create" element={<RequireAuth allowedRoles={["admin", "superadmin"]} requiredPermission="contentManagement"><ContentCreate /></RequireAuth>} />
              <Route path="/admin/content/edit/:id" element={<RequireAuth allowedRoles={["admin", "superadmin"]} requiredPermission="contentManagement"><ContentCreate /></RequireAuth>} />
              <Route path="/admin/content/add/:id" element={<RequireAuth allowedRoles={["admin", "superadmin"]} requiredPermission="contentManagement"><ContentCreate /></RequireAuth>} />
              {/* Learning Management */}
              <Route
                path="/admin/course-management"
                element={<RequireAuth allowedRoles={["admin", "superadmin"]} requiredPermission="courseManagement"><CourseManagementPage /></RequireAuth>}
              />
              <Route path="/course/:courseId" element={<RequireAuth allowedRoles={["admin", "superadmin"]} requiredPermission="courseManagement"><CourseDetails /></RequireAuth>} />
              <Route path="/admin/add-course" element={<RequireAuth allowedRoles={["admin", "superadmin"]} requiredPermission="courseManagement"><CreateCourseForm /></RequireAuth>} />
              <Route path="/admin/edit-course/:courseId" element={<RequireAuth allowedRoles={["admin", "superadmin"]} requiredPermission="courseManagement"><CreateCourseForm /></RequireAuth>} />
              <Route path="/admin/course-requests" element={<RequireAuth allowedRoles={["admin", "superadmin"]} requiredPermission="courseManagement"><CourseRequestsPage /></RequireAuth>} />
              <Route
                path="/admin/category-management"
                element={<RequireAuth allowedRoles={["admin", "superadmin"]} requiredPermission="categoryManagement"><CategoryManagementPage /></RequireAuth>}
              />
              <Route path="/admin/add-category" element={<RequireAuth allowedRoles={["admin", "superadmin"]} requiredPermission="categoryManagement"><AddCategory /></RequireAuth>} />
              {/* User Management */}
              <Route
                path="/admin/student-management"
                element={<RequireAuth allowedRoles={["admin", "superadmin"]} requiredPermission="studentManagement"><StudentManagementPage /></RequireAuth>}
              />
              <Route path="/admin/admin-profile" element={<RequireAuth allowedRoles={["admin", "superadmin"]}><AdminProfile /></RequireAuth>} />
              <Route
                path="/admin/student-management/enrolled-student"
                element={<RequireAuth allowedRoles={["admin", "superadmin"]} requiredPermission="studentManagement"><EnrolledStudents /></RequireAuth>}
              />
              <Route
                path="/admin/student-management/students/:id"
                element={<RequireAuth allowedRoles={["admin", "superadmin"]} requiredPermission="studentManagement"><StudentProfile /></RequireAuth>}
              />
              <Route
                path="/admin/instructor-management"
                element={<RequireAuth allowedRoles={["admin", "superadmin"]} requiredPermission="instructorManagement"><InstructorManagementPage /></RequireAuth>}
              />
              <Route path="/applications/:id" element={<RequireAuth allowedRoles={["admin", "superadmin"]} requiredPermission="instructorManagement"><ApplicationDetails /></RequireAuth>} />
              <Route
                path="/admin/instructor-management/instructors"
                element={<RequireAuth allowedRoles={["admin", "superadmin"]} requiredPermission="instructorManagement"><Instructor /></RequireAuth>}
              />
              <Route
                path="/admin/instructor-management/add-instructor"
                element={<RequireAuth allowedRoles={["admin", "superadmin"]} requiredPermission="instructorManagement"><AddInstructorForm /></RequireAuth>}
              />
              <Route
                path="/admin/instructor-management/instructors/:instructorId"
                element={<RequireAuth allowedRoles={["admin", "superadmin"]} requiredPermission="instructorManagement"><InstructorProfile /></RequireAuth>}
              />
              <Route
                path="/admin/admin-management"
                element={<RequireAuth allowedRoles={["admin", "superadmin"]} requiredPermission="adminManagement"><AdminManageMentPage /></RequireAuth>}
              />
              <Route path="/admin/add-admin" element={<RequireAuth allowedRoles={["admin", "superadmin"]} requiredPermission="adminManagement"><AddAdminForm /></RequireAuth>} />
              <Route path="/admin/add-admin/:id" element={<RequireAuth allowedRoles={["admin", "superadmin"]} requiredPermission="adminManagement"><AddAdminForm /></RequireAuth>} />
              {/* Others */}
              <Route path="/admin/centers" element={<RequireAuth allowedRoles={["admin", "superadmin"]} requiredPermission="offlineCenters"><OffilineCentersPage /></RequireAuth>} />
              <Route path="/admin/centers/add-branch" element={<RequireAuth allowedRoles={["admin", "superadmin"]} requiredPermission="offlineCenters"><AddBranch /></RequireAuth>} />
              <Route path="/admin/centers/edit-branch/:id" element={<RequireAuth allowedRoles={["admin", "superadmin"]} requiredPermission="offlineCenters"><AddBranch /></RequireAuth>} />
              <Route path="/admin/centers/add-zone" element={<RequireAuth allowedRoles={["admin", "superadmin"]} requiredPermission="offlineCenters"><AddZone /></RequireAuth>} />
              <Route path="/admin/centers/add-city" element={<RequireAuth allowedRoles={["admin", "superadmin"]} requiredPermission="offlineCenters"><AddCityForm /></RequireAuth>} />
              <Route path="/admin/centers/add-city/:id" element={<RequireAuth allowedRoles={["admin", "superadmin"]} requiredPermission="offlineCenters"><AddCityForm /></RequireAuth>} />
              {/* Detail page of Offline center */}
              <Route
                path="/admin/centers/:id"
                element={<RequireAuth allowedRoles={["admin", "superadmin"]} requiredPermission="offlineCenters"><CenterDetailsPage /></RequireAuth>}
              />
              <Route path="/admin/financials" element={<RequireAuth allowedRoles={["admin", "superadmin"]} requiredPermission="financials"><FinancialPage /></RequireAuth>} />
              <Route path="/admin/reports" element={<RequireAuth allowedRoles={["admin", "superadmin"]} requiredPermission="reports"><MonthlyReportPage /></RequireAuth>} />
              <Route path="/admin/reports/attendance" element={<RequireAuth allowedRoles={["admin", "superadmin"]} requiredPermission="reports"><DailyAttendanceReportPage /></RequireAuth>} />
              <Route path="/admin/enquiries" element={<RequireAuth allowedRoles={["admin", "superadmin"]} requiredPermission="enquiries"><EnquiriesPage /></RequireAuth>} />
              <Route path="/admin/referral-management" element={<RequireAuth allowedRoles={["admin", "superadmin"]} requiredPermission="referralManagement"><ReferralManagementPage /></RequireAuth>} />
              <Route path="/admin/updates" element={<RequireAuth allowedRoles={["admin", "superadmin"]} requiredPermission="updates"><UpdatesPage /></RequireAuth>} />
              <Route path="/admin/site-content" element={<RequireAuth allowedRoles={["admin", "superadmin"]} requiredPermission="contentManagement"><SiteContentPage /></RequireAuth>} />
              <Route path="/admin/system-status" element={<RequireAuth allowedRoles={["admin", "superadmin"]}><SystemStatus /></RequireAuth>} />
              <Route
                path="/admin/updates/create-updates"
                element={<RequireAuth allowedRoles={["admin", "superadmin"]} requiredPermission="updates"><CreateUpdateForm /></RequireAuth>}
              />

              {/* Teacher */}
              <Route path="/teacher" element={<RequireAuth allowedRoles={["teacher"]}><Dashboard /></RequireAuth>} />
              <Route path="/teacher/courses" element={<RequireAuth allowedRoles={["teacher"]}><MyCourses /></RequireAuth>} />
              <Route path="/teacher/students" element={<RequireAuth allowedRoles={["teacher"]}><MyStudent /></RequireAuth>} />
              <Route path="/teacher/assignments" element={<RequireAuth allowedRoles={["teacher"]}><Assignment /></RequireAuth>} />
              <Route path="/teacher/schedule" element={<RequireAuth allowedRoles={["teacher"]}><MySchedule /></RequireAuth>} />
              <Route path="/teacher/attendance" element={<RequireAuth allowedRoles={["teacher"]}><Attendance /></RequireAuth>} />
              <Route path="/teacher/assessments" element={<RequireAuth allowedRoles={["teacher"]}><Assessment /></RequireAuth>} />
              <Route
                path="/teacher/studentDetail/:id"
                element={<RequireAuth allowedRoles={["teacher"]}><StudentDetail /></RequireAuth>}
              />
              <Route path="/teacher/profile" element={<RequireAuth allowedRoles={["teacher"]}><Profile /></RequireAuth>} />
              </Routes>
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
