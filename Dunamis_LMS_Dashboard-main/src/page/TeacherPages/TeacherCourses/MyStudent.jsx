import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchTeacherById } from "../../../redux/Intructor/teacherSlice";
import toast from "react-hot-toast";
import StudentDetail from "./StudentDetail";
import { FiMusic } from "react-icons/fi";
import { HiMiniUserGroup, HiOutlineBars3 } from "react-icons/hi2";
import { SlCalender } from "react-icons/sl";
import { MdOutlineCheckBox, MdCheckBoxOutlineBlank, MdAccessTime, MdFilterList, MdOutlineGridView } from "react-icons/md";
import { LuArrowDownUp } from "react-icons/lu";
import { IoSearch } from "react-icons/io5";
import { RxCross2 } from "react-icons/rx";
import { FaArrowDown } from "react-icons/fa6";
import DynamicCourseIcon from "../../../components/DynamicCourseIcon";

const MyStudent = () => {
  const dispatch = useDispatch();
  const { selectedTeacher, loading, error } = useSelector((state) => state.teachers);

  const [view, setView] = useState("grid");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState([]);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    const teacherId = user?.roleId;

    if (teacherId) {
      dispatch(fetchTeacherById(teacherId))
        .unwrap()
        .catch((err) => {
          const errorMessage =
            typeof err === "string" ? err : err?.message || "Failed to load student data";
          toast.error(errorMessage);
        });
    } else {
      toast.error("Teacher ID not found");
    }
  }, [dispatch]);

  const teacherData = selectedTeacher || {};
  const apiStudents = teacherData?.students || [];
  const courses = teacherData?.courses || [];

  const getCourseIcon = (category) => {
    return <DynamicCourseIcon category={category} />;
  };

  const students = apiStudents.map((student, index) => {
    const studentName = `${student.name?.firstName || ""} ${student.name?.lastName || ""}`.trim() || `Student ${index + 1}`;

    const enrolledCourse = student.courses?.[0];
    const courseDetails = courses.find(c => c._id === enrolledCourse?.id || c._id === enrolledCourse?._id);
    const courseName = courseDetails?.name || enrolledCourse?.name || "No Course Assigned";
    const courseCategory = courseDetails?.category;

    const classType = courseDetails?.mode === "individual" ? "Individual Class" :
      courseDetails?.mode === "group" ? "Group Class" :
        enrolledCourse?.type || "Group Class";

    const progress = student.progress || 0;
    const completion = student.completion || 0;

    const currentModule = student.currentModule || 0;
    const totalModules = courseDetails?.content?.[0]?.modules?.length || 0;
    const moduleText = totalModules > 0 ? `Module ${currentModule} of ${totalModules}` : "No modules";

    const schedule = student.schedule || enrolledCourse?.schedule || "Schedule not set";

    return {
      id: student.id || student._id || `student-${index}`,
      name: studentName,
      subject: courseName,
      category: courseCategory,
      icon: getCourseIcon(courseCategory),
      type: classType,
      progress: progress,
      completion: completion,
      module: moduleText,
      time: schedule,
      avatar: student.studentDetails?.profilePicture
        ? `${import.meta.env.VITE_IMAGE}${student.studentDetails.profilePicture}`
        : `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(studentName)}`,
      examPreparation: student.examPreparation || false,
      weeksUntilExam: student.weeksUntilExam || null,
    };
  });

  const examStudents = students.filter(s => s.examPreparation && s.weeksUntilExam);

  const uniqueCategories = [...new Set(students.map(s => s.category?.name).filter(Boolean))];

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(search.toLowerCase()) ||
      student.subject.toLowerCase().includes(search.toLowerCase());

    const matchesFilters = activeFilters.length === 0 ||
      activeFilters.some(filter => student.category?.name === filter);

    return matchesSearch && matchesFilters;
  });

  const removeFilter = (filter) => {
    setActiveFilters(prev => prev.filter(f => f !== filter));
  };

  const handleStudentClick = (student) => {
    localStorage.setItem("selectedStudentId", student.id);
    setSelectedStudent(student);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-2 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading students...</p>
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

  return (
    <div className="p-1">
      {selectedStudent ? (
        <StudentDetail onBack={() => setSelectedStudent(null)} />
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <div className="relative w-1/3 min-w-[200px]">
              <IoSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg" />
              <input
                type="text"
                placeholder="Search students..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
            </div>
            <div className="flex gap-3 text-xl text-gray-700">
              <span className="cursor-pointer hover:text-gray-900">
                <HiOutlineBars3 />
              </span>
              <span className="cursor-pointer hover:text-gray-900">
                <LuArrowDownUp />
              </span>
            </div>
          </div>

          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {activeFilters.map((filter, idx) => (
                <span key={idx} className="flex items-center mr-2 gap-1 px-2 py-1 text-[10px] sm:text-xs text-gray-700 border rounded-full bg-gray-50">
                  <MdFilterList className="w-3 h-3" />
                  <span className="hidden sm:inline">{filter}</span>
                  <button
                    onClick={() => removeFilter(filter)}
                    className="ml-1 text-gray-500 hover:text-gray-700 text-xs"
                  >
                    <RxCross2 />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mb-4 relative -top-10">
            <div></div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setView("list")}
                className={`px-3 py-1.5 border rounded-full flex items-center gap-1 text-[10px] sm:text-xs ${view === "list" ? "bg-gray-200 font-medium" : "hover:bg-gray-100"
                  }`}
              >
                <HiOutlineBars3 className="w-4 h-4" />
                <span className="hidden sm:inline">List View</span>
              </button>
              <button
                onClick={() => setView("grid")}
                className={`px-3 py-1.5 border rounded-full flex items-center gap-1 text-[10px] sm:text-xs ${view === "grid" ? "bg-gray-200 font-medium" : "hover:bg-gray-100"
                  }`}
              >
                <MdOutlineGridView className="w-4 h-4" />
                <span className="hidden sm:inline">Grid View</span>
              </button>
            </div>
          </div>

          {students.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No students assigned yet</p>
              <p className="text-gray-400 text-sm mt-2">Students will appear here once they enroll</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No students found</p>
              <p className="text-gray-400 text-sm mt-2">Try adjusting your search or filters</p>
            </div>
          ) : (
            <>
              {view === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative -top-8">
                  {filteredStudents.map((student) => (
                    <div
                      key={student.id}
                      onClick={() => handleStudentClick(student)}
                      className="p-4 bg-white shadow-sm rounded-xl border hover:shadow-md transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <img
                          src={student.avatar}
                          alt={student.name}
                          className="w-12 h-12 rounded-full object-cover object-top"
                        />
                        <div className="flex-1 min-w-0">
                          <h2 className="font-medium truncate">{student.name}</h2>
                          <p className="text-xs text-gray-500 truncate">{student.subject}</p>
                        </div>
                      </div>

                      {student.category && (
                        <button className="flex items-center gap-1 border rounded-full px-2 py-0.5 bg-cyan-50 mb-2 text-xs">
                          <span className="text-black">{student.icon}</span>
                          {student.category.name}
                        </button>
                      )}

                      <div className="flex items-center gap-1 mb-2">
                        <HiMiniUserGroup size={12} className="w-4 h-4" />
                        <p className="text-xs text-gray-500">{student.type}</p>
                      </div>

                      {student.completion > 0 && (
                        <div className="flex items-center justify-end gap-1">
                          <MdOutlineCheckBox className="w-4 h-4" />
                          <span className="text-xs text-gray-500">{student.completion}%</span>
                        </div>
                      )}

                      {student.progress > 0 && (
                        <div className="w-full bg-gray-200 rounded-full h-1 mt-2 mb-3">
                          <div
                            className="bg-black h-1 rounded-full"
                            style={{ width: `${student.progress}%` }}
                          />
                        </div>
                      )}

                      <p className="flex items-center text-sm text-gray-600 gap-2">
                        <MdCheckBoxOutlineBlank className="w-4 h-4" />
                        {student.module}
                      </p>

                      <p className="flex items-center text-sm text-gray-400 gap-2">
                        <SlCalender className="w-4 h-4" />
                        {student.time}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto bg-white shadow rounded-lg relative -top-8">
                  <table className="w-full border-collapse text-[10px] sm:text-sm">
                    <thead className="border-b text-gray-500">
                      <tr>
                        <th className="px-2 py-1 sm:px-4 sm:py-2 text-left">Name</th>
                        <th className="px-2 py-1 sm:px-4 sm:py-2 text-left">Subject</th>
                        <th className="px-2 py-1 sm:px-4 sm:py-2 text-left">Category</th>
                        <th className="px-2 py-1 sm:px-4 sm:py-2 text-left">Type</th>
                        <th className="px-2 py-1 sm:px-4 sm:py-2 text-left">Progress</th>
                        <th className="px-2 py-1 sm:px-4 sm:py-2 text-left">Completion</th>
                        <th className="px-2 py-1 sm:px-4 sm:py-2 text-left">Module</th>
                        <th className="px-2 py-1 sm:px-4 sm:py-2 text-left">Schedule</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((student) => (
                        <tr
                          key={student.id}
                          onClick={() => handleStudentClick(student)}
                          className="border-t hover:bg-gray-50 cursor-pointer"
                        >
                          <td className="px-2 py-1 sm:px-4 sm:py-2">
                            <div className="flex items-center gap-1 sm:gap-2">
                              <img
                                src={student.avatar}
                                alt={student.name}
                                className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover object-top"
                              />
                              <span className="truncate">{student.name}</span>
                            </div>
                          </td>
                          <td className="px-2 py-1 sm:px-4 sm:py-2 truncate">{student.subject}</td>
                          <td className="px-2 py-1 sm:px-4 sm:py-2">
                            {student.category?.name || "N/A"}
                          </td>
                          <td className="px-2 py-1 sm:px-4 sm:py-2">{student.type}</td>
                          <td className="px-2 py-1 sm:px-4 sm:py-2">
                            {student.progress > 0 ? `${student.progress}%` : "0%"}
                          </td>
                          <td className="px-2 py-1 sm:px-4 sm:py-2">
                            {student.completion > 0 ? `${student.completion}%` : "0%"}
                          </td>
                          <td className="px-2 py-1 sm:px-4 sm:py-2 truncate">{student.module}</td>
                          <td className="px-2 py-1 sm:px-4 sm:py-2 truncate">{student.time}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {examStudents.length > 0 && (
                <div className="mt-10 p-4 bg-white shadow-sm rounded-xl border relative -top-10">
                  <h2 className="font-semibold mb-6">Students Preparing for Exams</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {examStudents.map((exam) => (
                      <div
                        key={exam.id}
                        className="flex flex-col justify-between p-4 bg-gray-50 rounded-xl shadow hover:shadow-md transition duration-200 cursor-pointer"
                        onClick={() => handleStudentClick(exam)}
                      >
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <img
                              src={exam.avatar}
                              alt={exam.name}
                              className="w-12 h-12 rounded-full object-cover object-top"
                            />
                            <h3 className="font-medium">{exam.name}</h3>
                          </div>
                          {exam.category && (
                            <button className="flex items-center gap-1 border rounded-full px-2 py-0.5 bg-cyan-50 mb-2 text-xs">
                              <span className="text-black">{exam.icon}</span>
                              {exam.category.name}
                            </button>
                          )}
                          <div className="flex items-center justify-between text-sm text-gray-500 mt-1">
                            <span className="truncate">{exam.subject}</span>
                            <span className="flex items-center text-gray-400 text-xs gap-1 flex-shrink-0 ml-2">
                              <MdAccessTime className="w-4 h-4" />
                              {exam.weeksUntilExam} {exam.weeksUntilExam === 1 ? 'week' : 'weeks'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default MyStudent;
