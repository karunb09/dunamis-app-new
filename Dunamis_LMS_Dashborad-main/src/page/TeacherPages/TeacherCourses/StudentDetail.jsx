import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { HiDotsHorizontal } from "react-icons/hi";
import * as Icons from "react-icons/fa";
import { getAssignmentsByStatus } from "../../../redux/Assignment/AssignmentSlice";

const StudentDetail = ({ onBack }) => {
  const dispatch = useDispatch();
  const { selectedTeacher } = useSelector((state) => state.teachers);

  const [activeTab, setActiveTab] = useState("Courses");
  const [menuOpen, setMenuOpen] = useState(false);

  const studentId = localStorage.getItem("selectedStudentId");

  const teacherData = selectedTeacher || {};
  const courses = teacherData?.courses || [];
  const students = teacherData?.students || [];

  const fullStudentData = students.find((s) => s.id === studentId || s._id === studentId);

  if (!fullStudentData) {
    return (
      <div className="w-full min-h-screen bg-gray-50 p-2 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Student not found</p>
          <button onClick={onBack} className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-full">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const studentName = `${fullStudentData.name?.firstName || ""} ${fullStudentData.name?.lastName || ""}`.trim() || "Student";
  const enrolledCourse = fullStudentData.courses?.[0];
  const courseDetails = courses.find(c => c._id === enrolledCourse?.id || c._id === enrolledCourse?._id);
  const courseName = courseDetails?.name || enrolledCourse?.name || "No Course Assigned";

  const student = {
    id: fullStudentData.id || fullStudentData._id,
    name: studentName,
    subject: courseName,
    avatar: fullStudentData.studentDetails?.profilePicture
      ? `${import.meta.env.VITE_IMAGE}${fullStudentData.studentDetails.profilePicture}`
      : `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(studentName)}`,
    progress: fullStudentData.progress || 0,
    time: fullStudentData.schedule || "Schedule not set",
    type: courseDetails?.mode || "Group Class",
    schedule: fullStudentData.schedule || "Weekly Schedule",
  };

  const enrolledCourseIds = fullStudentData.courses?.map((c) => c.id || c._id) || [];
  const enrolledCourses = courses.filter((course) => enrolledCourseIds.includes(course._id));

  const { assignments, loading, error } = useSelector((state) => state.assignment);

  // Fetch all assignments without status filter
  useEffect(() => {
    dispatch(getAssignmentsByStatus());
  }, [dispatch]);

  // Filter assignments for this specific student from all assignments
  const studentAssignments = Array.isArray(assignments)
    ? assignments.filter((a) => a.students?.some((s) => s._id === studentId))
    : [];

  const tabs = ["Courses", "Feedback & Homework", "Assignments", "Schedules", "Certifications"];

  const getCourseIcon = (category) => {
    const iconValue = category?.icon;
    if (iconValue && iconValue.trim() !== "") {
      if (iconValue.startsWith("Fa") || iconValue.startsWith("Md") || iconValue.startsWith("Io")) {
        const IconComponent = Icons[iconValue];
        if (IconComponent) {
          return <IconComponent className="w-3 h-3 text-black" />;
        }
      }
      if (iconValue.startsWith("http") || iconValue.startsWith("/uploads")) {
        return (
          <img
            src={iconValue.startsWith("http") ? iconValue : `${import.meta.env.VITE_IMAGE}${iconValue}`}
            alt={category?.name || "icon"}
            className="w-3 h-3 object-contain"
          />
        );
      }
      return iconValue;
    }
    const emojiIconMap = {
      Music: "🎵",
      Dance: "💃",
      Language: "🌐",
      Art: "🎨",
      Technology: "💻",
    };
    return emojiIconMap[category?.name] || "📚";
  };

  const renderIcon = (icon) => {
    if (typeof icon === "string") {
      return icon;
    }
    return icon;
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "Courses":
        return (
          <div className="p-4">
            {enrolledCourses && enrolledCourses.length > 0 ? (
              enrolledCourses.map((course, idx) => (
                <div
                  key={course._id || idx}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border rounded-2xl p-4 bg-white shadow-sm mb-4"
                >
                  <img
                    src={
                      course.image?.startsWith("http")
                        ? course.image
                        : `${import.meta.env.VITE_IMAGE}${course.image}`
                    }
                    alt={course.name}
                    className="w-full sm:w-32 h-40 sm:h-24 object-cover rounded-xl"
                    onError={(e) => {
                      e.target.src = "/music.png";
                    }}
                  />
                  <div className="flex-1 w-full">
                    <div className="flex flex-wrap gap-2 mb-2">
                      {course.category && (
                        <button className="flex items-center gap-1 border rounded-full px-2 py-0.5 bg-cyan-50 text-xs">
                          {renderIcon(getCourseIcon(course.category))}
                          {course.category.name}
                        </button>
                      )}
                      <span className="text-xs bg-cyan-50 px-2 py-1 rounded-full capitalize">
                        {course.level || "Beginner"}
                      </span>
                    </div>
                    <h2 className="text-base sm:text-lg font-semibold">{course.name}</h2>
                    <p className="text-xs sm:text-sm text-gray-500">Code: {course.code}</p>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                      {course.description || "No description available"}
                    </p>
                    {course.objectives && course.objectives.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-semibold text-gray-700">Objectives:</p>
                        <ul className="text-xs text-gray-600 list-disc list-inside">
                          {course.objectives.slice(0, 2).map((obj, i) => (
                            <li key={i}>{obj}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {student.progress > 0 && (
                      <>
                        <div className="w-full bg-gray-200 h-1 rounded-full mt-3">
                          <div
                            className="bg-black h-1 rounded-full"
                            style={{ width: `${student.progress}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs text-gray-500">{student.progress}% Complete</span>
                          <button className="text-xs sm:text-sm text-purple-400 font-medium hover:underline">
                            View Details →
                          </button>
                        </div>
                      </>
                    )}
                    {course.price && course.price.length > 0 && (
                      <div className="mt-2 flex gap-2 flex-wrap">
                        {course.price
                          .filter((p) => p.isSelected)
                          .map((p, i) => (
                            <span
                              key={i}
                              className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full"
                            >
                              ₹{p.monthlyFee}/month
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">No courses enrolled</p>
            )}
          </div>
        );

      case "Feedback & Homework":
        return (
          <div className="p-4">
            <h2 className="text-sm font-semibold text-gray-800 mb-4">Assessment Reports</h2>
            <div className="text-center py-8 text-gray-500">
              <p>No assessment reports available</p>
            </div>
          </div>
        );

      case "Assignments":
        return (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Assignments</h2>
            {loading ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : error ? (
              <p className="text-sm text-red-500">{error}</p>
            ) : studentAssignments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No assignments available</p>
              </div>
            ) : (
              studentAssignments.map((assignment, idx) => {
                const studentData = assignment.students?.find(s => s._id === studentId);
                const assignmentStatus = studentData?.status || "pending";

                return (
                  <div
                    key={assignment._id || idx}
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border rounded-2xl p-4 bg-white shadow-sm mb-4"
                  >
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-6 h-6 text-red-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1 w-full">
                      <div className="flex gap-2 mb-1">
                        <span className="font-bold text-gray-800 text-base">Assignment</span>
                        <span className="flex items-center gap-1 border rounded-full px-2 py-0.5 bg-cyan-50 text-xs text-gray-800">
                          <span role="img" aria-label="music">🎵</span> Music
                        </span>
                      </div>
                      <div className="text-gray-800 text-sm mb-1">
                        {assignment.title || "Assignment Title"}
                      </div>
                      <div className="text-gray-500 text-sm">
                        {assignment.description || "No description"}
                      </div>
                    </div>
                    <div className="sm:text-right ml-auto">
                      <div className="text-xs text-gray-500">
                        {assignment.dueDate
                          ? new Date(assignment.dueDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })
                          : "No Due Date"}
                      </div>
                      <div
                        className={`text-base font-semibold capitalize ${assignmentStatus === "reviewed"
                          ? "text-green-600"
                          : assignmentStatus === "reminder"
                            ? "text-yellow-600"
                            : assignmentStatus === "pending"
                              ? "text-orange-600"
                              : "text-gray-600"
                          }`}
                      >
                        {assignmentStatus}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        );
      case "Schedules":
        return (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Schedules</h2>
            {student.time && student.time !== "Schedule not set" ? (
              <div className="border rounded-xl p-4 bg-blue-50">
                <div>
                  <p className="text-sm text-gray-600 font-medium">{student.schedule || "Weekly Schedule"}</p>
                  <p className="text-sm text-gray-500">{student.time}</p>
                  <h3 className="text-lg font-semibold text-gray-800 mt-2">{student.subject}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {enrolledCourses[0]?.description || "Course description not available"}
                  </p>
                  <div className="mt-3">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700 border">
                      {student.type}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No schedule set</p>
              </div>
            )}
          </div>
        );

      case "Certifications":
        return (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Certifications</h2>
            {enrolledCourses && enrolledCourses.some((c) => c.certification === "certification") ? (
              enrolledCourses
                .filter((c) => c.certification === "certification")
                .map((course, idx) => (
                  <div
                    key={idx}
                    className="bg-yellow-50 border border-yellow-100 rounded-xl p-6 text-center shadow-sm mb-4"
                  >
                    <div className="flex justify-center mb-3">
                      <span className="text-3xl">🏅</span>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800">{course.name}</h3>
                    <p className="text-sm text-gray-600 mt-2">
                      This certificate will be awarded to <span className="font-medium">{student.name}</span> upon
                      successful completion of <span className="font-medium">{course.name}</span>.
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Course Duration: {new Date(course.startDate).toLocaleDateString()} -{" "}
                      {new Date(course.endDate).toLocaleDateString()}
                    </p>
                    <p className="text-sm font-semibold text-blue-600 mt-4">DUNAMIS ONLINE LEARNING</p>
                  </div>
                ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No certifications available</p>
              </div>
            )}
          </div>
        );

      default:
        return <div className="p-4 text-sm text-gray-500">{activeTab} content goes here...</div>;
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 p-2">
      <div className="flex items-center justify-between bg-white shadow-md rounded-2xl p-4 mb-6">
        <div className="flex items-center space-x-3">
          <button onClick={onBack} className="text-gray-600 hover:text-gray-900 mr-2 text-2xl">
            ←
          </button>
          <img src={student.avatar} alt={student.name} className="w-12 h-12 rounded-full object-cover" />
          <div>
            <h2 className="text-xl font-semibold text-gray-800">{student.name}</h2>
            <p className="text-sm text-gray-500">{student.subject}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className="inline-block px-3 py-1 text-xs font-medium rounded-full border bg-green-100 text-green-700">
            Enrolled
          </span>
          <div className="relative">
            <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 rounded-full hover:bg-gray-100">
              <HiDotsHorizontal className="w-5 h-5 text-gray-600" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-32 bg-white border rounded-lg shadow-lg z-10">
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                  onClick={() => {
                    alert("Report clicked");
                    setMenuOpen(false);
                  }}
                >
                  Report
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-red-600"
                  onClick={() => {
                    alert("Block clicked");
                    setMenuOpen(false);
                  }}
                >
                  Block
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="w-full bg-white p-4 rounded-xl shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h2>
          <div className="text-center py-8 text-gray-500">
            <p>No recent activity</p>
          </div>
        </div>
        <div className="w-full bg-white p-4 rounded-xl shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Class Schedule</h2>
          {student.time && student.time !== "Schedule not set" ? (
            <div className="p-4 border rounded-xl shadow-sm bg-white">
              <p className="font-semibold flex items-center gap-2">
                <span className="ml-auto text-xs text-gray-400">{student.time}</span>
              </p>
              <p className="mt-2 font-medium">{student.subject}</p>
              <p className="text-sm text-gray-500">{student.type}</p>
              <span
                className={`text-xs font-medium ${enrolledCourses[0]?.mode === "online" ? "text-green-600" : "text-blue-600"
                  }`}
              >
                ●{" "}
                {enrolledCourses[0]?.mode
                  ? enrolledCourses[0].mode.charAt(0).toUpperCase() + enrolledCourses[0].mode.slice(1)
                  : "Online"}
              </span>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No scheduled classes</p>
            </div>
          )}
        </div>
      </div>
      <div className="mt-6 border-b border-gray-200 overflow-x-auto">
        <div className="flex flex-nowrap md:flex-wrap justify-start gap-1 md:gap-3">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-1 px-2 text-[10px] md:text-sm font-medium whitespace-nowrap ${activeTab === tab ? "text-black border-b-2 border-black" : "text-gray-500 hover:text-gray-700"
                }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm mt-4">{renderTabContent()}</div>
    </div>
  );
};

export default StudentDetail;
