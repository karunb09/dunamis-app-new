import React, { useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";

// Layout
import Sidebar from "./components/mainLayout/Sidebar";
import Navigation from "./components/mainLayout/Navbar";
import SignIn from "./components/signIn";
import TermsAndConditions from "./components/TermsAndConditions";
import SignInNavbar from "./components/signInNavbar";

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
  const user_role = "admin"; // change this to 'teacher' or 'admin' to test and also from Sidebar.jsx

  const location = useLocation();

  // Map routes to titles
  const pageTitleMap = {
    "/home": "Home",
    "/my-courses": "My Courses",
    "/explore-courses": "Explore Courses",
    "/assignments": "Assignments",
    "/homework": "Homework",
    "/performance": "Performance",
    "/admin/content-management": "Content Management",
  };

  const currentTitle = pageTitleMap[location.pathname] || "Dashboard";

  // signIn and Terms page layout
  if (location.pathname === "/" || location.pathname === "/terms") {
    return (
      <div className="flex flex-col h-screen">
        <SignInNavbar />
        {location.pathname === "/" ? <SignIn /> : <TermsAndConditions />}
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Toaster />
      <Sidebar
        user_role={user_role}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex flex-col flex-1 overflow-auto">
        <Navigation
          onMenuClick={() => setSidebarOpen(true)}
          title={currentTitle}
          userRole={user_role}
        />
        <main className="p-6 bg-gray-50 flex-1">
          <Routes>
            {/* Student Routes */}
            <Route path="/home" element={<HomePage />} />
            <Route path="/my-courses" element={<CoursePage />} />
            <Route path="/explore-courses" element={<ExploreCourses />} />
            <Route path="/assignments" element={<AssignmentPage />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/homework" element={<HomeworkPage />} />
            <Route path="/performance" element={<PerformancePage />} />
            <Route path="/student/profile" element={<ProfilePage />} />
            <Route
              path="/explore-course/:id"
              element={<ExploreCourseDetails />}
            />
            <Route path="/payment/confirm" element={<PaymentConfirmation />} />
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminHomePage />} />
            <Route
              path="/admin/content-management"
              element={<ContentManagementPage />}
            />
            <Route
              path="/admin/content/details/:id"
              element={<ContentDetails />}
            />
            <Route path="/admin/content/create" element={<ContentCreate />} />
            <Route path="/admin/content/add/:id" element={<ContentForm />} />
            {/* Learning Management */}
            <Route
              path="/admin/course-management"
              element={<CourseManagementPage />}
            />
            <Route path="/course/:courseId" element={<CourseDetails />} />
            <Route path="/admin/add-course" element={<CreateCourseForm />} />
            <Route path="/admin/edit-course/:courseId" element={<CreateCourseForm />} />
            <Route
              path="/admin/category-management"
              element={<CategoryManagementPage />}
            />
            <Route path="/admin/add-category" element={<AddCategory />} />
            {/* User Management */}
            <Route
              path="/admin/student-management"
              element={<StudentManagementPage />}
            />
            <Route path="/admin/admin-profile" element={<AdminProfile />} />
            <Route
              path="/admin/student-management/enrolled-student"
              element={<EnrolledStudents />}
            />
            <Route
              path="/admin/student-management/students/:id"
              element={<StudentProfile />}
            />
            <Route
              path="/admin/instructor-management"
              element={<InstructorManagementPage />}
            />
            <Route path="/applications/:id" element={<ApplicationDetails />} />
            <Route
              path="/admin/instructor-management/instructors"
              element={<Instructor />}
            />
            <Route
              path="/admin/instructor-management/instructors/:instructorId"
              element={<InstructorProfile />}
            />
            <Route
              path="/admin/admin-management"
              element={<AdminManageMentPage />}
            />
            <Route path="/admin/add-admin" element={<AddAdminForm />} />
            <Route path="/admin/add-admin/:id" element={<AddAdminForm />} />
            {/* Others */}
            <Route path="/admin/centers" element={<OffilineCentersPage />} />
            <Route path="/admin/centers/add-branch" element={<AddBranch />} />
            <Route path="/admin/centers/add-zone" element={<AddZone />} />
            <Route path="/admin/centers/add-city" element={<AddCityForm />} />
            {/* Detail page of Offline center */}
            <Route
              path="/admin/centers/:id"
              element={<CenterDetailsPage />}
            />
            <Route path="/admin/financials" element={<FinancialPage />} />
            <Route path="/admin/enquiries" element={<EnquiriesPage />} />
            <Route path="/admin/updates" element={<UpdatesPage />} />
            <Route
              path="/admin/updates/create-updates"
              element={<CreateUpdateForm />}
            />

            {/* Teacher */}
            <Route path="/teacher" element={<Dashboard />} />
            <Route path="/teacher/courses" element={<MyCourses />} />
            <Route path="/teacher/students" element={<MyStudent />} />
            <Route path="/teacher/assignments" element={<Assignment />} />
            <Route path="/teacher/schedule" element={<MySchedule />} />
            <Route path="/teacher/reports" element={<Report />} />
            <Route path="/teacher/attendance" element={<Attendance />} />
            <Route path="/teacher/assessments" element={<Assessment />} />
            <Route
              path="/teacher/studentDetail/:id"
              element={<StudentDetail />}
            />
            <Route path="/teacher/profile" element={<Profile />} />

          </Routes>
        </main>
      </div>
    </div>
  );
};

export default App;
