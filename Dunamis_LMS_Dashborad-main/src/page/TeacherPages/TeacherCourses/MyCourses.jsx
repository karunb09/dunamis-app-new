import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchTeacherById } from "../../../redux/Intructor/teacherSlice";
import CourseOverview from "./CourseOverview";
import StudentTable from "./StudentTable";
import Curriculum from "./Curriculum";
import toast from "react-hot-toast";
import * as Icons from "react-icons/fa";

const MyCourses = () => {
  const dispatch = useDispatch();

  const { selectedTeacher, loading, error } = useSelector((state) => state.teachers);

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [selectedSubcategory, setSelectedSubcategory] = useState("");

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    const teacherId = user?.roleId;

    if (teacherId) {
      dispatch(fetchTeacherById(teacherId))
        .unwrap()
        .then(() => {
          // toast.success("Teacher data loaded successfully");
        })
        .catch((err) => {
          const errorMessage =
            typeof err === "string"
              ? err
              : err?.message || "Failed to load teacher data";
          toast.error(errorMessage);
        });
    } else {
      toast.error("Teacher ID not found");
    }
  }, [dispatch]);

  const teacherData = selectedTeacher || {};
  const courses = teacherData?.courses || [];
  const students = teacherData?.students || [];
  const teacherName = `${teacherData.teacherDetails?.name?.firstName || ""} ${teacherData.teacherDetails?.name?.lastName || ""
    }`.trim();
  const studentCount = teacherData.studentCount || 0;
  const averageRating = teacherData.averageRating || 0;

  const categories = Array.from(
    new Set(courses.map((c) => c.category?.name).filter(Boolean))
  );

  useEffect(() => {
    if (courses.length > 0) {
      setSelectedCourse(courses[0]._id);
    }
  }, [courses]);

  const handleCardClick = (courseId) => {
    setSelectedCourse(courseId);
  };

  const getSelectedMonthlyFee = (priceArr) => {
    if (!Array.isArray(priceArr)) return 0;
    const selectedPrice = priceArr.find((p) => p.isSelected);
    return selectedPrice ? Number(selectedPrice.monthlyFee) : 0;
  };

  const getCourseIcon = (category) => {
    const iconValue = category?.icon;

    if (iconValue && iconValue.trim() !== "") {
      if (
        iconValue.startsWith("Fa") ||
        iconValue.startsWith("Md") ||
        iconValue.startsWith("Io")
      ) {
        const IconComponent = Icons[iconValue];
        if (IconComponent) {
          return <IconComponent className="w-3 h-3 text-black" />;
        }
      }

      if (iconValue.startsWith("http") || iconValue.startsWith("/uploads")) {
        return (
          <img
            src={
              iconValue.startsWith("http")
                ? iconValue
                : `${import.meta.env.VITE_IMAGE}${iconValue}`
            }
            alt={category?.name || "icon"}
            className="w-3 h-3 object-contain"
          />
        );
      }

      return iconValue;
    }
    return emojiIconMap[category?.name] || "📚";
  };

  // Render icon (either React Icon component, image, or emoji string)
  const renderIcon = (icon) => {
    if (typeof icon === "string") {
      return icon;
    }
    return icon;
  };

  const getStudentsForCourse = (courseId) => {
    if (!Array.isArray(students)) return [];

    const enrolledStudents = students.filter((student) =>
      student.courses?.some((c) => c.id === courseId || c._id === courseId)
    );

    return enrolledStudents.map((student, index) => {
      // Handle nested name object structure
      const studentName = `${student.name?.firstName || ""} ${student.name?.lastName || ""}`.trim();

      return {
        id: student.id || student._id || `student-${index}`, // Keep ID for React key, but won't display
        avatar: student.studentDetails?.profilePicture
          ? `${import.meta.env.VITE_IMAGE}${student.studentDetails.profilePicture}`
          : `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(studentName)}`,
        name: studentName || "Unknown Student",
        course: courses.find((c) => c._id === courseId)?.name || "",
        progress: "0%",
        modules: "0 of 0",
        schedule: "N/A",
      };
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-2 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading teacher data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-2 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <button
            onClick={() => {
              const user = JSON.parse(localStorage.getItem("user"));
              const teacherId = user?.roleId;
              if (teacherId) dispatch(fetchTeacherById(teacherId));
            }}
            className="bg-gray-900 text-white px-4 py-2 rounded-full hover:bg-gray-800 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const selectedCourseData = courses.find((c) => c._id === selectedCourse);

  return (
    <div className="container mx-auto p-2 min-h-screen">
      {/* {teacherName && (
        <div className="mb-6 bg-white rounded-lg p-4 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">{teacherName}</h1>
          <div className="flex gap-4 mt-2 text-sm text-gray-600">
            <span>
              Total Students: <strong>{studentCount}</strong>
            </span>
            <span>
              Average Rating: <strong>{averageRating.toFixed(1)}</strong>
            </span>
            <span>
              Total Courses: <strong>{courses.length}</strong>
            </span>
          </div>
        </div>
      )} */}

      <div className="flex justify-end mb-6">
        <button
          className="bg-gray-900 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-800 transition"
          onClick={() => setIsPopupOpen(true)}
        >
          + Request new course
        </button>
      </div>

      {courses.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No courses assigned yet</p>
          <p className="text-gray-400 text-sm mt-2">
            Request a new course to get started
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
            {courses.map((course) => (
              <div
                key={course._id}
                className={`relative rounded-lg overflow-hidden shadow-sm cursor-pointer flex flex-col sm:flex-row transition h-auto sm:h-32 border-2 ${selectedCourse === course._id
                  ? "border-cyan-600"
                  : "border-transparent hover:border-gray-300"
                  }`}
                onClick={() => handleCardClick(course._id)}
              >
                <img
                  src={
                    course.image?.startsWith("http")
                      ? course.image
                      : `${import.meta.env.VITE_IMAGE}${course.image}`
                  }
                  alt={course.name}
                  className="w-full sm:w-1/2 h-28 sm:h-32 object-cover"
                  onError={(e) => {
                    e.target.src = "/music.png";
                  }}
                />

                <div className="w-full sm:w-1/2 p-3 sm:p-4">
                  <div className="flex gap-2 mb-2 flex-wrap">
                    <span className="flex items-center gap-1 border border-gray-200 rounded-full px-2 py-0.5 bg-cyan-50 text-[10px] sm:text-xs">
                      {renderIcon(getCourseIcon(course.category))}{" "}
                      {course.category?.name || "Course"}
                    </span>
                    <span className="flex items-center gap-1 rounded-full px-2 py-0.5 bg-gray-200 text-[10px] sm:text-xs capitalize">
                      {course.level || "Beginner"}
                    </span>
                    {/* <span
                      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] sm:text-xs ${course.isPublished
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                        }`}
                    >
                      {course.isPublished ? "Published" : "Draft"}
                    </span> */}
                  </div>
                  <h3 className="text-xs sm:text-lg font-semibold text-gray-900 line-clamp-1">
                    {course.name}
                  </h3>
                  <p className="mt-1 text-[11px] sm:text-sm text-gray-500 line-clamp-2">
                    {course.description || "No description available"}
                  </p>
                  <p className="mt-1 text-[10px] sm:text-xs text-gray-600">
                    ₹{getSelectedMonthlyFee(course.price)}/month
                  </p>
                </div>
              </div>
            ))}
          </div>

          {selectedCourseData && (
            <div className="mb-6">
              <div className="flex gap-2 mb-2 flex-wrap">
                <span className="flex items-center gap-1 border rounded-full px-2 py-0.5 bg-cyan-50 text-xs">
                  {renderIcon(getCourseIcon(selectedCourseData.category))}{" "}
                  {selectedCourseData.category?.name || "Course"}
                </span>
                <span className="flex items-center gap-1 rounded-full px-2 py-0.5 bg-gray-200 text-xs capitalize">
                  {selectedCourseData.level || "Beginner"}
                </span>
                <span className="flex items-center gap-1 rounded-full px-2 py-0.5 bg-gray-200 text-xs capitalize">
                  {selectedCourseData.mode || "Online"}
                </span>
              </div>

              <h2 className="text-xl font-semibold text-gray-900 mt-2">
                {selectedCourseData.name}
              </h2>
              <p className="text-sm text-gray-500 mt-2">
                {selectedCourseData.description || "No description available"}
              </p>

              {selectedCourseData.code && (
                <div className="flex gap-4 mt-3 text-sm text-gray-600 flex-wrap">
                  <span>
                    <strong>Code:</strong> {selectedCourseData.code}
                  </span>
                  {selectedCourseData.startDate && selectedCourseData.endDate && (
                    <span>
                      <strong>Duration:</strong>{" "}
                      {new Date(selectedCourseData.startDate).toLocaleDateString()}{" "}
                      - {new Date(selectedCourseData.endDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              )}

              {selectedCourseData.objectives?.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    Learning Objectives
                  </h3>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    {selectedCourseData.objectives.map((obj, index) => (
                      <li key={index}>{obj}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="bg-gray-100 rounded-lg p-3 shadow-sm mb-6 mt-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4 text-left">
                  Course Overview
                </h3>

                <div className="flex flex-nowrap overflow-x-auto text-sm gap-4">
                  {[
                    {
                      label: "Total Students",
                      value: getStudentsForCourse(selectedCourseData._id).length,
                    },
                    {
                      label: "Course Fee",
                      value: `₹${getSelectedMonthlyFee(selectedCourseData.price)}`,
                    },
                    {
                      label: "Modules",
                      value: selectedCourseData.content?.[0]?.modules?.length || 0,
                    },
                    {
                      label: "Certification",
                      value:
                        selectedCourseData.certification === "certification"
                          ? "Yes"
                          : "No",
                    },
                  ].map((item, index) => (
                    <div
                      key={index}
                      className={`flex-shrink-0 p-2 flex flex-col items-start ${index !== 0 ? "border-l border-gray-200" : ""
                        }`}
                    >
                      <p className="text-gray-600 text-xs sm:text-sm whitespace-nowrap">
                        {item.label}
                      </p>
                      <p className="text-base font-semibold text-gray-900">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <StudentTable
                groupStudents={getStudentsForCourse(selectedCourseData._id)}
                individualStudents={[]}
              />

              <Curriculum modules={selectedCourseData.content?.[0]?.modules || []} />
            </div>
          )}
        </>
      )}

      {isPopupOpen && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center z-50 px-2">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
              Request New Course
            </h2>

            <div className="mb-4">
              <label
                htmlFor="category"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Select Category
              </label>
              <select
                id="category"
                value={selectedSubcategory}
                onChange={(e) => setSelectedSubcategory(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {selectedSubcategory && (
              <div className="mb-4 p-3 bg-blue-50 rounded-md">
                <p className="text-sm text-gray-700">
                  You are requesting a new course in{" "}
                  <strong>{selectedSubcategory}</strong> category. An admin will
                  review your request.
                </p>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <button
                className="flex-1 bg-gray-100 text-gray-800 px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-200 transition"
                onClick={() => {
                  setIsPopupOpen(false);
                  setSelectedSubcategory("");
                }}
              >
                Cancel
              </button>
              <button
                className={`flex-1 px-4 py-2 rounded-full text-sm font-medium text-white transition ${selectedSubcategory
                  ? "bg-gray-900 hover:bg-gray-800"
                  : "bg-gray-300 cursor-not-allowed"
                  }`}
                onClick={() => {
                  if (selectedSubcategory) {
                    toast.success(`Request sent for ${selectedSubcategory} course`);
                    setIsPopupOpen(false);
                    setSelectedSubcategory("");
                  }
                }}
                disabled={!selectedSubcategory}
              >
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyCourses;
