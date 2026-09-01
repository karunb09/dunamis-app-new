import { useParams, useLocation } from "react-router-dom";
import { useMemo, useState } from "react";
import { FiBook, FiCheckCircle, FiAward, FiGrid, FiClipboard, FiEdit3, FiCalendar, FiCreditCard, FiCheckSquare } from "react-icons/fi";
import { useStudentById } from "../../../../hooks/useStudents";
import IconTabBar from "../../../../components/IconTabBar";

import OverviewTab from "./EnrolledStudentsDetailTabs/OverviewTab";
import CoursesTab from "./EnrolledStudentsDetailTabs/CourseTab";
import AssessmentsTab from "./EnrolledStudentsDetailTabs/AssesmentTab";
import AssignmentsTab from "./EnrolledStudentsDetailTabs/AssignmentsTab";
import SchedulesTab from "./EnrolledStudentsDetailTabs/SchedulesTab";
import CertificationsTab from "./EnrolledStudentsDetailTabs/CertificationsTab";
import PaymentsTab from "./EnrolledStudentsDetailTabs/PaymentsTab";
import AttendanceHomeworkTab from "./EnrolledStudentsDetailTabs/AttendanceHomeworkTab";

const StudentProfile = () => {
  const { id } = useParams();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState("Overview");
  const tabs = useMemo(
    () => [
      { id: "Overview", label: "Overview", icon: FiGrid },
      { id: "Courses", label: "Courses", icon: FiBook },
      { id: "Assessments", label: "Assessments", icon: FiClipboard },
      { id: "Assignments", label: "Assignments", icon: FiEdit3 },
      { id: "Schedules", label: "Schedules", icon: FiCalendar },
      { id: "AttendanceHomework", label: "Attendance & Homework", icon: FiCheckSquare },
      { id: "Certifications", label: "Certifications", icon: FiAward },
      { id: "Payments", label: "Payments", icon: FiCreditCard },
    ],
    []
  );

  const { data: currentStudent, isLoading: loading, error, refetch } = useStudentById(id);
  const studentFromState = location.state?.student;
  const student = currentStudent || studentFromState;

  if (loading) {
    return <p className="p-6 text-gray-500">Loading student details...</p>;
  }

  if (error) {
    return (
      <p className="p-6 text-red-500">
        {typeof error === "string" ? error : error?.message || "Failed to load student."}
      </p>
    );
  }

  if (!student) {
    return <p className="p-6 text-red-500">Student data not found.</p>;
  }

  const firstName = student?.userId?.name?.firstName || "";
  const lastName = student?.userId?.name?.lastName || "";
  const email = student?.userId?.email || "-";
  const phone = student?.userId?.mobileNo || "-";
  const profileImage = student?.userId?.image || "";
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "?";

  const activeEnrolledCourses = Array.isArray(student?.enrolledCourses)
    ? student.enrolledCourses.filter((course) => course.active !== false)
    : [];
  const enrolledCount = activeEnrolledCourses.length;
  const completedCoursesCount = activeEnrolledCourses.filter(course => course.status === "completed").length;
  const assignmentsCount = Array.isArray(student?.assignment) ? student.assignment.length : 0;

  return (
    <div className="min-w-0 space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex min-w-0 items-center gap-4">
          {profileImage ? (
            <img
              src={profileImage}
              alt={`${firstName} ${lastName}`}
              className="h-14 w-14 shrink-0 rounded-full object-cover sm:h-16 sm:w-16"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FFD9C7] to-[#FFF1EB] text-lg font-semibold text-[#FF6B35] sm:h-16 sm:w-16">
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">Student</p>
            <h1 className="truncate text-lg font-semibold text-slate-900 sm:text-xl">
              {firstName} {lastName}
            </h1>
            <p className="truncate text-sm text-slate-600">{email}</p>
            <p className="text-sm text-slate-500">{phone}</p>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ring-1 ${
            student?.userId?.accountStatus === "active"
              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
              : "bg-sky-50 text-sky-700 ring-sky-200"
          }`}
        >
          {student?.userId?.accountStatus === "active" ? "Active" : "Enrolled"}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        {[
          { icon: FiBook, tone: "bg-sky-50 text-sky-600", label: "Courses Enrolled", value: enrolledCount },
          { icon: FiCheckCircle, tone: "bg-emerald-50 text-emerald-600", label: "Courses Completed", value: completedCoursesCount },
          { icon: FiAward, tone: "bg-amber-50 text-amber-600", label: "Assignments", value: assignmentsCount },
        ].map(({ icon: Icon, tone, label, value }) => (
          <div
            key={label}
            className="flex min-w-0 flex-col items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm sm:flex-row sm:gap-3 sm:p-4 sm:text-left"
          >
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}>
              <Icon className="text-base sm:text-lg" />
            </span>
            <div className="min-w-0">
              <p className="text-lg font-bold leading-none text-slate-900 sm:text-xl">{value}</p>
              <p className="mt-1 text-[11px] leading-tight text-slate-500 sm:text-sm">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
        {/* Already responsive: a scrolling icon row on mobile, a side rail from md up. */}
        <IconTabBar orientation="vertical" tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        <div className="min-w-0 flex-1">
          {activeTab === "Overview" && <OverviewTab studentId={id} />}
          {activeTab === "Courses" && <CoursesTab student={student} onRefresh={refetch} />}
          {activeTab === "Assessments" && <AssessmentsTab student={student} />}
          {activeTab === "Assignments" && <AssignmentsTab student={student} />}
          {activeTab === "Schedules" && <SchedulesTab student={student} />}
          {activeTab === "AttendanceHomework" && <AttendanceHomeworkTab studentId={id} />}
          {activeTab === "Certifications" && <CertificationsTab student={student} />}
          {activeTab === "Payments" && <PaymentsTab student={student} onRefresh={refetch} />}
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;
