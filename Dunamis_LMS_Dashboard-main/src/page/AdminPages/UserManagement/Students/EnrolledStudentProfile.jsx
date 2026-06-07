import { useParams, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FiBook, FiCheckCircle, FiAward } from "react-icons/fi";
import { getStudentById } from "../../../../redux/Student/StudentSlice";

import CoursesTab from "./EnrolledStudentsDetailTabs/CourseTab";
import AssessmentsTab from "./EnrolledStudentsDetailTabs/AssesmentTab";
import AssignmentsTab from "./EnrolledStudentsDetailTabs/AssignmentsTab";
import SchedulesTab from "./EnrolledStudentsDetailTabs/SchedulesTab";
import CertificationsTab from "./EnrolledStudentsDetailTabs/CertificationsTab";
import PaymentsTab from "./EnrolledStudentsDetailTabs/PaymentsTab";

const StudentProfile = () => {
  const { id } = useParams();
  const location = useLocation();
  const dispatch = useDispatch();

  const [activeTab, setActiveTab] = useState("Courses");
  const tabs = useMemo(
    () => ["Courses", "Assessments", "Assignments", "Schedules", "Certifications", "Payments"],
    []
  );

  const { loading, error, currentStudent } = useSelector((state) => state.student);
  const studentFromState = location.state?.student;
  const student = currentStudent || studentFromState;

  useEffect(() => {
    if (id) {
      dispatch(getStudentById(id));
    }
  }, [dispatch, id]);

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
    <div className="p-6 space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm flex justify-between items-start">
        <div className="flex items-center gap-4">
          {profileImage && (
            <img
              src={profileImage}
              alt={`${firstName} ${lastName}`}
              className="w-16 h-16 rounded-full"
            />
          )}
          <div>
            <div className="text-xl font-semibold">
              {firstName} {lastName}
            </div>
            <div className="text-gray-600">{email}</div>
            <div className="text-sm text-gray-500">{phone}</div>
          </div>
        </div>
        <span className="bg-blue-100 text-blue-700 px-4 py-1 rounded-full">
          {student?.userId?.accountStatus === "active" ? "Active" : "Enrolled"}
        </span>
      </div>

      {/* Stats */}
      <div className="flex gap-4 flex-col md:flex-row">
        <div className="flex-1 bg-white p-4 rounded-xl shadow-sm flex items-center gap-3">
          <FiBook className="text-blue-500 text-xl" />
          <div>
            <p className="text-sm text-gray-500">Courses Enrolled</p>
            <p className="text-xl font-bold">{enrolledCount}</p>
          </div>
        </div>
        <div className="flex-1 bg-white p-4 rounded-xl shadow-sm flex items-center gap-3">
          <FiCheckCircle className="text-green-500 text-xl" />
          <div>
            <p className="text-sm text-gray-500">Courses Completed</p>
            <p className="text-xl font-bold">{completedCoursesCount}</p>
          </div>
        </div>
        <div className="flex-1 bg-white p-4 rounded-xl shadow-sm flex items-center gap-3">
          <FiAward className="text-yellow-500 text-xl" />
          <div>
            <p className="text-sm text-gray-500">Assignments</p>
            <p className="text-xl font-bold">{assignmentsCount}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-4 space-x-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 text-sm whitespace-nowrap ${activeTab === tab ? "border-b-2 border-black font-semibold" : "text-gray-500 hover:text-black"
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "Courses" && <CoursesTab student={student} />}
      {activeTab === "Assessments" && <AssessmentsTab student={student} />}
      {activeTab === "Assignments" && <AssignmentsTab student={student} />}
      {activeTab === "Schedules" && <SchedulesTab student={student} />}
      {activeTab === "Certifications" && <CertificationsTab student={student} />}
      {activeTab === "Payments" && <PaymentsTab student={student} />}
    </div>
  );
};

export default StudentProfile;
