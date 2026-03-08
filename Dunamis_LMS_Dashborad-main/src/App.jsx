import React, { useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";

// Layout
import Sidebar from "./components/mainLayout/Sidebar";
import Navigation from "./components/mainLayout/Navbar";
import SignIn from "./components/signIn";
import TermsAndConditions from "./components/TermsAndConditions";
import SignInNavbar from "./components/signInNavbar";
import { PublicOnlyRoute, RequireAuth } from "./components/auth/AuthGuard";

// Student Pages
import HomePage from "./page/StudentPages/StudentHomePage";
import CoursePage from "./page/StudentPages/CoursePage";
import ExploreCourses from "./page/StudentPages/ExploreCourses";
import AssignmentPage from "./page/StudentPages/AssignmentPage";
import HomeworkPage from "./page/StudentPages/HomeworkPage";
import PerformancePage from "./page/StudentPages/PerformancePage";
import ProfilePage from "./page/StudentPages/profile/Profile";
import ExploreCourseDetails from "./page/StudentPages/ExploreCourseDetails";
import PaymentConfirmation from "./page/StudentPages/PaymentConfirm";
import Upload from "./page/StudentPages/upload";

// Admin Pages
import AdminHomePage from "./page/AdminPages/AdminHomePage";
import ContentDetails from "./page/AdminPages/ContentManagement/ContentDetails";
import ContentCreate from "./page/AdminPages/ContentManagement/ContentCreate";
import ContentEdit from "./page/AdminPages/ContentManagement/ContentEdit";
// Learning Management
import CourseManagementPage from "./page/AdminPages/CourseManagementPage";
import ContentManagementPage from "./page/AdminPages/ContentManagementPage";
import CategoryManagementPage from "./page/AdminPages/CategoryManagementPage";
import CreateCourseForm from "./page/AdminPages/AddCoursePage";
// User Management
import StudentManagementPage from "./page/AdminPages/UserManagement/StudentManagementPage";
import InstructorManagementPage from "./page/AdminPages/UserManagement/InstructorManagementPage";
import AdminManageMentPage from "./page/AdminPages/UserManagement/AdminManageMentPage";
// Others
import OffilineCentersPage from "./page/AdminPages/OffilineCentersPage";
import UpdatesPage from "./page/AdminPages/UpdatesPage";
import FinancialPage from "./page/AdminPages/FinancialPage";
import EnquiriesPage from "./page/AdminPages/EnquiriesPage";
// Hot Toast
import { Toaster } from "react-hot-toast";
// Page Import
import StudentProfile from "./page/AdminPages/UserManagement/Students/EnrolledStudentProfile";
import EnrolledStudents from "./page/AdminPages/UserManagement/Students/EnrolledStudents";
// teacher page
import Dashboard from "./page/TeacherPages/TeacherCourses/Home";
import MyCourses from "./page/TeacherPages/TeacherCourses/MyCourses";
import MyStudent from "./page/TeacherPages/TeacherCourses/MyStudent";
import Assignment from "./page/TeacherPages/Assignment";
import MySchedule from "./page/TeacherPages/MySchedule";
import Attendance from "./page/TeacherPages/TeacherCourses/Attendance";
import Report from "./page/TeacherPages/Report";
import Assessment from "./page/TeacherPages/Assessment";
import StudentDetail from "./page/TeacherPages/TeacherCourses/StudentDetail";
import Profile from "./page/TeacherPages/profile";

import Instructor from "./page/AdminPages/UserManagement/Instructor/Instructor";
import AddInstructorForm from "./page/AdminPages/UserManagement/Instructor/AddInstructorForm";
import InstructorProfile from "./page/AdminPages/UserManagement/Instructor/InstructorProfile";
import AddAdminForm from "./page/AdminPages/AddAdminForm";
import AddBranch from "./page/AdminPages/OfflineCenters/AddBranchForm";
import AddZone from "./page/AdminPages/OfflineCenters/AddZoneForm";
import AddCityForm from "./page/AdminPages/OfflineCenters/AddCityForm";
import CreateUpdateForm from "./page/AdminPages/Updates/CreateUpdateForm";
import AdminProfile from "./page/AdminPages/AdminProfile";
import AddCategory from "./page/AdminPages/CategoryManagement/AddCategory";
import CenterDetailsPage from "./page/AdminPages/OfflineCentersDetail/CenterDetailsPage";
import ApplicationDetail from "./page/AdminPages/UserManagement/Instructor/ApplicationDetails";
import ApplicationDetails from "./page/AdminPages/UserManagement/Instructor/ApplicationDetails";
import CourseDetails from "./page/AdminPages/CourseDetails";
import ContentForm from "./page/AdminPages/ContentManagement/ContentCreate";



const App = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const location = useLocation();

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
            <Routes>
            {/* Student Routes */}
            <Route path="/home" element={<RequireAuth allowedRoles={["student"]}><HomePage /></RequireAuth>} />
            <Route path="/my-courses" element={<RequireAuth allowedRoles={["student"]}><CoursePage /></RequireAuth>} />
            <Route path="/explore-courses" element={<RequireAuth allowedRoles={["student"]}><ExploreCourses /></RequireAuth>} />
            <Route path="/assignments" element={<RequireAuth allowedRoles={["student"]}><AssignmentPage /></RequireAuth>} />
            <Route path="/upload" element={<RequireAuth allowedRoles={["student"]}><Upload /></RequireAuth>} />
            <Route path="/homework" element={<RequireAuth allowedRoles={["student"]}><HomeworkPage /></RequireAuth>} />
            <Route path="/performance" element={<RequireAuth allowedRoles={["student"]}><PerformancePage /></RequireAuth>} />
            <Route path="/student/profile" element={<RequireAuth allowedRoles={["student"]}><ProfilePage /></RequireAuth>} />
            <Route
              path="/explore-course/:id"
              element={<RequireAuth allowedRoles={["student"]}><ExploreCourseDetails /></RequireAuth>}
            />
            <Route path="/payment/confirm" element={<RequireAuth allowedRoles={["student"]}><PaymentConfirmation /></RequireAuth>} />
            {/* Admin Routes */}
            <Route path="/admin" element={<RequireAuth allowedRoles={["admin", "superadmin"]}><AdminHomePage /></RequireAuth>} />
            <Route
              path="/admin/content-management"
              element={<RequireAuth allowedRoles={["admin", "superadmin"]}><ContentManagementPage /></RequireAuth>}
            />
            <Route
              path="/admin/content/details/:id"
              element={<RequireAuth allowedRoles={["admin", "superadmin"]}><ContentDetails /></RequireAuth>}
            />
            <Route path="/admin/content/create" element={<RequireAuth allowedRoles={["admin", "superadmin"]}><ContentCreate /></RequireAuth>} />
            <Route path="/admin/content/add/:id" element={<RequireAuth allowedRoles={["admin", "superadmin"]}><ContentForm /></RequireAuth>} />
            {/* Learning Management */}
            <Route
              path="/admin/course-management"
              element={<RequireAuth allowedRoles={["admin", "superadmin"]}><CourseManagementPage /></RequireAuth>}
            />
            <Route path="/course/:courseId" element={<RequireAuth allowedRoles={["admin", "superadmin"]}><CourseDetails /></RequireAuth>} />
            <Route path="/admin/add-course" element={<RequireAuth allowedRoles={["admin", "superadmin"]}><CreateCourseForm /></RequireAuth>} />
            <Route path="/admin/edit-course/:courseId" element={<RequireAuth allowedRoles={["admin", "superadmin"]}><CreateCourseForm /></RequireAuth>} />
            <Route
              path="/admin/category-management"
              element={<RequireAuth allowedRoles={["admin", "superadmin"]}><CategoryManagementPage /></RequireAuth>}
            />
            <Route path="/admin/add-category" element={<RequireAuth allowedRoles={["admin", "superadmin"]}><AddCategory /></RequireAuth>} />
            {/* User Management */}
            <Route
              path="/admin/student-management"
              element={<RequireAuth allowedRoles={["admin", "superadmin"]}><StudentManagementPage /></RequireAuth>}
            />
            <Route path="/admin/admin-profile" element={<RequireAuth allowedRoles={["admin", "superadmin"]}><AdminProfile /></RequireAuth>} />
            <Route
              path="/admin/student-management/enrolled-student"
              element={<RequireAuth allowedRoles={["admin", "superadmin"]}><EnrolledStudents /></RequireAuth>}
            />
            <Route
              path="/admin/student-management/students/:id"
              element={<RequireAuth allowedRoles={["admin", "superadmin"]}><StudentProfile /></RequireAuth>}
            />
            <Route
              path="/admin/instructor-management"
              element={<RequireAuth allowedRoles={["admin", "superadmin"]}><InstructorManagementPage /></RequireAuth>}
            />
            <Route path="/applications/:id" element={<RequireAuth allowedRoles={["admin", "superadmin"]}><ApplicationDetails /></RequireAuth>} />
            <Route
              path="/admin/instructor-management/instructors"
              element={<RequireAuth allowedRoles={["admin", "superadmin"]}><Instructor /></RequireAuth>}
            />
            <Route
              path="/admin/instructor-management/add-instructor"
              element={<RequireAuth allowedRoles={["admin", "superadmin"]}><AddInstructorForm /></RequireAuth>}
            />
            <Route
              path="/admin/instructor-management/instructors/:instructorId"
              element={<RequireAuth allowedRoles={["admin", "superadmin"]}><InstructorProfile /></RequireAuth>}
            />
            <Route
              path="/admin/admin-management"
              element={<RequireAuth allowedRoles={["admin", "superadmin"]}><AdminManageMentPage /></RequireAuth>}
            />
            <Route path="/admin/add-admin" element={<RequireAuth allowedRoles={["admin", "superadmin"]}><AddAdminForm /></RequireAuth>} />
            <Route path="/admin/add-admin/:id" element={<RequireAuth allowedRoles={["admin", "superadmin"]}><AddAdminForm /></RequireAuth>} />
            {/* Others */}
            <Route path="/admin/centers" element={<RequireAuth allowedRoles={["admin", "superadmin"]}><OffilineCentersPage /></RequireAuth>} />
            <Route path="/admin/centers/add-branch" element={<RequireAuth allowedRoles={["admin", "superadmin"]}><AddBranch /></RequireAuth>} />
            <Route path="/admin/centers/edit-branch/:id" element={<RequireAuth allowedRoles={["admin", "superadmin"]}><AddBranch /></RequireAuth>} />
            <Route path="/admin/centers/add-zone" element={<RequireAuth allowedRoles={["admin", "superadmin"]}><AddZone /></RequireAuth>} />
            <Route path="/admin/centers/add-city" element={<RequireAuth allowedRoles={["admin", "superadmin"]}><AddCityForm /></RequireAuth>} />
            <Route path="/admin/centers/add-city/:id" element={<RequireAuth allowedRoles={["admin", "superadmin"]}><AddCityForm /></RequireAuth>} />
            {/* Detail page of Offline center */}
            <Route
              path="/admin/centers/:id"
              element={<RequireAuth allowedRoles={["admin", "superadmin"]}><CenterDetailsPage /></RequireAuth>}
            />
            <Route path="/admin/financials" element={<RequireAuth allowedRoles={["admin", "superadmin"]}><FinancialPage /></RequireAuth>} />
            <Route path="/admin/enquiries" element={<RequireAuth allowedRoles={["admin", "superadmin"]}><EnquiriesPage /></RequireAuth>} />
            <Route path="/admin/updates" element={<RequireAuth allowedRoles={["admin", "superadmin"]}><UpdatesPage /></RequireAuth>} />
            <Route
              path="/admin/updates/create-updates"
              element={<RequireAuth allowedRoles={["admin", "superadmin"]}><CreateUpdateForm /></RequireAuth>}
            />

            {/* Teacher */}
            <Route path="/teacher" element={<RequireAuth allowedRoles={["teacher"]}><Dashboard /></RequireAuth>} />
            <Route path="/teacher/courses" element={<RequireAuth allowedRoles={["teacher"]}><MyCourses /></RequireAuth>} />
            <Route path="/teacher/students" element={<RequireAuth allowedRoles={["teacher"]}><MyStudent /></RequireAuth>} />
            <Route path="/teacher/assignments" element={<RequireAuth allowedRoles={["teacher"]}><Assignment /></RequireAuth>} />
            <Route path="/teacher/schedule" element={<RequireAuth allowedRoles={["teacher"]}><MySchedule /></RequireAuth>} />
            <Route path="/teacher/reports" element={<RequireAuth allowedRoles={["teacher"]}><Report /></RequireAuth>} />
            <Route path="/teacher/attendance" element={<RequireAuth allowedRoles={["teacher"]}><Attendance /></RequireAuth>} />
            <Route path="/teacher/assessments" element={<RequireAuth allowedRoles={["teacher"]}><Assessment /></RequireAuth>} />
            <Route
              path="/teacher/studentDetail/:id"
              element={<RequireAuth allowedRoles={["teacher"]}><StudentDetail /></RequireAuth>}
            />
            <Route path="/teacher/profile" element={<RequireAuth allowedRoles={["teacher"]}><Profile /></RequireAuth>} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
