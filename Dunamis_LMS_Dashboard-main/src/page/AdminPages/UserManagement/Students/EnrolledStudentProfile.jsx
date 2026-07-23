import { useParams, useLocation } from "react-router-dom";
import { useMemo, useState } from "react";
import { FiBook, FiCheckCircle, FiAward, FiGrid, FiClipboard, FiEdit3, FiCalendar, FiCreditCard, FiCheckSquare } from "react-icons/fi";
import { useStudentById } from "../../../../hooks/useStudents";
import IconTabBar from "../../../../components/IconTabBar";
import PageTabBar from "../../../../components/PageTabBar";

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

  const { data: currentStudent, isLoading: loading, error } = useStudentById(id);
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

  const enrolledCount = Array.isArray(student?.enrolledCourses) ? student.enrolledCourses.length : 0;
  const completedCoursesCount = Array.isArray(student?.enrolledCourses)
    ? student.enrolledCourses.filter(course => course.status === "completed").length
    : 0;
  const assignmentsCount = Array.isArray(student?.assignment) ? student.assignment.length : 0;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm flex flex-wrap justify-between items-start gap-3">
        <div className="flex min-w-0 items-center gap-4">
          {profileImage && (
            <img
              src={profileImage}
              alt={`${firstName} ${lastName}`}
              className="w-16 h-16 shrink-0 rounded-full"
            />
          )}
          <div className="min-w-0">
            <div className="text-xl font-semibold">
              {firstName} {lastName}
            </div>
            <div className="truncate text-gray-600">{email}</div>
            <div className="text-sm text-gray-500">{phone}</div>
          </div>
        </div>
        <span className="bg-blue-100 text-blue-700 px-4 py-1 rounded-full">
          {student?.userId?.accountStatus === "active" ? "Active" : "Enrolled"}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { icon: <FiBook className="shrink-0 text-lg text-blue-500 sm:text-xl" />, label: "Courses Enrolled", value: enrolledCount },
          { icon: <FiCheckCircle className="shrink-0 text-lg text-green-500 sm:text-xl" />, label: "Courses Completed", value: completedCoursesCount },
          { icon: <FiAward className="shrink-0 text-lg text-yellow-500 sm:text-xl" />, label: "Assignments", value: assignmentsCount },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col items-center gap-1 rounded-xl border border-slate-100 bg-white p-3 text-center shadow-sm sm:flex-row sm:gap-3 sm:p-4 sm:text-left"
          >
            {stat.icon}
            <div className="min-w-0">
              <p className="text-lg font-bold text-slate-900 sm:text-xl">{stat.value}</p>
              <p className="text-[11px] leading-tight text-gray-500 sm:text-sm">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
        <div className="md:hidden">
          <PageTabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
        </div>
        <div className="hidden md:block md:shrink-0">
          <IconTabBar orientation="vertical" tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
        </div>

        <div className="min-w-0 flex-1">
          {activeTab === "Overview" && <OverviewTab studentId={id} />}
          {activeTab === "Courses" && <CoursesTab student={student} />}
          {activeTab === "Assessments" && <AssessmentsTab student={student} />}
          {activeTab === "Assignments" && <AssignmentsTab student={student} />}
          {activeTab === "Schedules" && <SchedulesTab student={student} />}
          {activeTab === "AttendanceHomework" && <AttendanceHomeworkTab studentId={id} />}
          {activeTab === "Certifications" && <CertificationsTab student={student} />}
          {activeTab === "Payments" && <PaymentsTab student={student} />}
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;
