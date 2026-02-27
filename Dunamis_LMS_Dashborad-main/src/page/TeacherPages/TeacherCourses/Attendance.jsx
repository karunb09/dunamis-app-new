import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  submitAttendanceHomework,
  getTeacherHomeworkHistory,
} from "../../../redux/AttendanceHomework/AttendanceHomeworkSlice";
import toast from "react-hot-toast";
import { MdFilterList } from "react-icons/md";
import { RxCross2 } from "react-icons/rx";
import { IoSearch } from "react-icons/io5";
import { Music } from "react-feather";
import { LuArrowDownUp } from "react-icons/lu";
import { HiOutlineBars3 } from "react-icons/hi2";
import { FaArrowDown } from "react-icons/fa6";
import { FiPlay, FiImage, FiX, FiEye } from "react-icons/fi";

const Attendance = () => {
  const dispatch = useDispatch();
  const { homeworkHistory, loading, error, submitLoading } = useSelector(
    (state) => state.attendanceHomework
  );

  const [activeTab, setActiveTab] = useState("pending");
  const [search, setSearch] = useState("");
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [showHomeworkViewer, setShowHomeworkViewer] = useState(false);
  const [selectedHomework, setSelectedHomework] = useState(null);
  const [feedbackForm, setFeedbackForm] = useState({
    rating: 0,
    description: "",
  });

  const classes = [
    {
      id: 1,
      type: "Group Class",
      subject: "Keyboard Fundamentals",
      time: "5:00 PM, Today",
      students: [
        { id: 1, name: "Priya Sharma" },
        { id: 2, name: "Lasya Krishnan" },
        { id: 3, name: "Rakesh Kumar" },
      ],
    },
    {
      id: 2,
      type: "Individual Class",
      subject: "Keyboard Fundamentals",
      time: "7:00 PM, Today",
      students: [{ id: 4, name: "Saketh Reddy" }],
    },
  ];

  const [attendance, setAttendance] = useState(() => {
    const att = {};
    classes.forEach((cls) => {
      cls.students.forEach((s) => {
        att[s.id] = false;
      });
    });
    return att;
  });

  const [homeworkText, setHomeworkText] = useState({});
  const [selectedModule, setSelectedModule] = useState({});

  useEffect(() => {
    dispatch(getTeacherHomeworkHistory());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const toggleAttendance = (studentId) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  };

  const handleHomeworkChange = (studentId, value) => {
    setHomeworkText((prev) => ({
      ...prev,
      [studentId]: value,
    }));
  };

  const handleModuleChange = (studentId, value) => {
    setSelectedModule((prev) => ({
      ...prev,
      [studentId]: value,
    }));
  };

  const handleSubmitAttendance = async (classData) => {
    const attendanceData = {
      classId: classData.id,
      students: classData.students.map((student) => ({
        studentId: student.id,
        attendance: attendance[student.id] ? "present" : "absent",
        homework: homeworkText[student.id] || "",
        module: selectedModule[student.id] || "",
      })),
    };

    try {
      await dispatch(submitAttendanceHomework(attendanceData)).unwrap();
      toast.success("Attendance and homework submitted successfully");
      setHomeworkText({});
      setSelectedModule({});
      dispatch(getTeacherHomeworkHistory());
    } catch (err) {
      toast.error(err || "Failed to submit attendance");
    }
  };

  const handleFeedbackClick = (assignment) => {
    setSelectedAssignment(assignment);
    setShowFeedbackForm(true);
    setFeedbackForm({ rating: 0, description: "" });
  };

  const handleRatingClick = (rating) => {
    setFeedbackForm((prev) => ({ ...prev, rating }));
  };

  const handleDescriptionChange = (e) => {
    setFeedbackForm((prev) => ({ ...prev, description: e.target.value }));
  };

  const handleSubmitFeedback = () => {
    if (feedbackForm.rating === 0 || !feedbackForm.description.trim()) {
      toast.error("Please provide both a rating and feedback description");
      return;
    }

    setShowFeedbackForm(false);
    setSelectedAssignment(null);
    setFeedbackForm({ rating: 0, description: "" });
    toast.success("Feedback submitted successfully!");
  };

  const handleCloseFeedbackForm = () => {
    setShowFeedbackForm(false);
    setSelectedAssignment(null);
    setFeedbackForm({ rating: 0, description: "" });
  };

  const handleViewHomework = (homework) => {
    setSelectedHomework(homework);
    setShowHomeworkViewer(true);
  };

  const homeworkForFeedback = [];
  const completedHomeworkFeedback = [];

  return (
    <div>
      <div className="w-full min-h-screen bg-white p-4 md:p-6">
        <div className="flex gap-6 border-b mb-6 w-full max-w-6xl ml-2">
          <button
            onClick={() => setActiveTab("pending")}
            className={`pb-2 text-sm font-medium ${activeTab === "pending"
                ? "border-b-2 border-black text-black"
                : "text-gray-500"
              }`}
          >
            Pending
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`pb-2 text-sm font-medium ${activeTab === "history"
                ? "border-b-2 border-black text-black"
                : "text-gray-500"
              }`}
          >
            History
          </button>
          <button
            onClick={() => setActiveTab("homework")}
            className={`pb-2 text-sm font-medium ${activeTab === "homework"
                ? "border-b-2 border-black text-black"
                : "text-gray-500"
              }`}
          >
            Homework
          </button>
        </div>

        {activeTab === "pending" && (
          <div className="space-y-6 ml-2">
            {classes.map((cls) => (
              <div key={cls.id} className="bg-gray-50 rounded-xl p-4 border">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h1>Backend APIs Under Development</h1>
                    <div className="flex gap-2 mb-1">
                      <button className="flex items-center gap-1 border rounded-full px-2 py-0.5 bg-cyan-50 mb-2 text-xs">
                        <Music size={12} className="text-black" />
                        Music
                      </button>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 mb-2 text-xs rounded-full">
                        {cls.type}
                      </span>
                    </div>
                    <h2 className="text-base md:text-lg font-semibold">
                      {cls.subject}
                    </h2>
                  </div>
                  <p className="text-xs md:text-sm text-gray-500">{cls.time}</p>
                </div>

                <div className="space-y-3">
                  {cls.students.map((student) => (
                    <div
                      key={student.id}
                      className="border rounded-lg p-4 bg-white space-y-3"
                    >
                      <div className="font-medium text-gray-800">
                        {student.name}
                      </div>

                      <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex flex-col w-full md:w-40">
                          <label
                            htmlFor={`att-${student.id}`}
                            className="mb-1 text-sm font-medium text-gray-700"
                          >
                            Attendance
                          </label>
                          <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-white">
                            <input
                              type="checkbox"
                              id={`att-${student.id}`}
                              className="w-4 h-4"
                              checked={attendance[student.id]}
                              onChange={() => toggleAttendance(student.id)}
                            />
                            <label
                              htmlFor={`att-${student.id}`}
                              className="text-sm text-gray-600"
                            >
                              {attendance[student.id] ? "Present" : "Absent"}
                            </label>
                          </div>
                        </div>

                        <div className="flex flex-col flex-1">
                          <label
                            htmlFor={`homework-${student.id}`}
                            className="mb-1 text-sm font-medium text-gray-700"
                          >
                            Homework
                          </label>
                          <textarea
                            id={`homework-${student.id}`}
                            placeholder="Type today's homework"
                            value={homeworkText[student.id] || ""}
                            onChange={(e) =>
                              handleHomeworkChange(student.id, e.target.value)
                            }
                            className="border rounded-md px-3 py-2 text-sm resize-y w-full"
                            rows="1"
                          />
                        </div>

                        <div className="flex flex-col w-full md:w-56">
                          <label
                            htmlFor={`module-${student.id}`}
                            className="mb-1 text-sm font-medium text-gray-700"
                          >
                            Module - Lesson - Topic
                          </label>
                          <select
                            id={`module-${student.id}`}
                            value={selectedModule[student.id] || ""}
                            onChange={(e) =>
                              handleModuleChange(student.id, e.target.value)
                            }
                            className="border rounded-md px-3 py-2 text-sm w-full bg-white"
                          >
                            <option value="">Select Module</option>
                            <option value="module1-lesson1">
                              Module 1 - Lesson 1
                            </option>
                            <option value="module2-lesson3">
                              Module 2 - Lesson 3
                            </option>
                            <option value="module3-lesson5">
                              Module 3 - Lesson 5
                            </option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-end mt-4 gap-3">
                    <button className="px-4 py-2 text-sm rounded-full border">
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSubmitAttendance(cls)}
                      disabled={submitLoading}
                      className="px-4 py-2 text-sm rounded-full bg-black text-white disabled:opacity-50"
                    >
                      {submitLoading ? "Sending..." : "Send"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "history" && (
          <div className="w-full bg-white p-2 md:p-4 border rounded-lg">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
              <div className="flex justify-between items-center w-full md:w-auto">
                <div className="relative w-1/3 min-w-[200px]">
                  <IoSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg" />
                  <input
                    type="text"
                    placeholder="Search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border rounded-full text-sm focus:outline-none"
                  />
                </div>

                <div className="flex gap-2 text-base md:text-xl text-gray-700 ml-2">
                  <span className="cursor-pointer">
                    <HiOutlineBars3 />
                  </span>
                  <span className="cursor-pointer">
                    <LuArrowDownUp />
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap text-xs md:text-sm">
                <span className="flex items-center mr-2 gap-1 px-2 py-1 text-[10px] sm:text-xs text-gray-700 border rounded-full bg-gray-50">
                  <MdFilterList className="w-3 h-3" />
                  <span className="hidden sm:inline">Music</span>
                  <button className="ml-1 text-gray-500 hover:text-gray-700 text-xs">
                    <RxCross2 />
                  </button>
                </span>

                <span className="flex items-center mr-2 gap-1 px-2 py-1 text-[10px] sm:text-xs text-gray-700 border rounded-full bg-gray-50">
                  <FaArrowDown className="w-2 h-2 text-gray-500" />
                  <span className="hidden sm:inline">Attendance</span>
                  <button className="ml-1 text-gray-500 hover:text-gray-700 text-xs">
                    <RxCross2 />
                  </button>
                </span>
                <button className="text-gray-400 hover:text-gray-600">
                  Reset
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading history...</p>
              </div>
            ) : homeworkHistory.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No history found</p>
              </div>
            ) : (
              <div className="overflow-x-auto text-[10px] sm:text-sm">
                <table className="min-w-full text-[10px] sm:text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b text-gray-500">
                      <th className="py-2 px-3 font-medium">User</th>
                      <th className="py-2 px-3 font-medium">Course Category</th>
                      <th className="py-2 px-3 font-medium">Course Name</th>
                      <th className="py-2 px-3 font-medium">Slot</th>
                      <th className="py-2 px-3 font-medium">Date of Joining</th>
                      <th className="py-2 px-3 font-medium">Session Type</th>
                      <th className="py-2 px-3 font-medium">Attendance</th>
                      <th className="py-2 px-3 font-medium">Homework</th>
                    </tr>
                  </thead>
                  <tbody>
                    {homeworkHistory.map((row, i) => (
                      <tr key={row._id || i} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-3 flex items-center gap-2">
                          <img
                            src={row.studentProfile}
                            alt={`${row.studentName.firstName} ${row.studentName.lastName}`}
                            className="w-8 h-8 rounded-full"
                          />
                          {`${row.studentName.firstName} ${row.studentName.lastName}`}
                        </td>
                        <td className="py-2 px-3">
                          <button className="flex items-center gap-1 border rounded-full px-2 py-0.5 bg-cyan-50 text-xs">
                            <span className="text-sm">{row.categoryIcon}</span>
                            {row.categoryName}
                          </button>
                        </td>
                        <td className="py-2 px-3">{row.courseName}</td>
                        <td className="py-2 px-3">
                          <div className="text-xs">
                            <div>{row.slotDetails.day.join(", ")}</div>
                            <div className="text-gray-500">
                              {row.slotDetails.startTime} - {row.slotDetails.endTime}
                            </div>
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          {new Date(row.createdAt).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${row.sessionType === 'premium'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-gray-100 text-gray-700'
                            }`}>
                            {row.sessionType}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`flex items-center gap-1 text-sm capitalize ${row.attendanceStatus.toLowerCase() === "present"
                                ? "text-green-600"
                                : "text-red-500"
                              }`}
                          >
                            <span className="w-2 h-2 rounded-full bg-current"></span>
                            {row.attendanceStatus}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-gray-500 max-w-xs truncate">
                          {row.homework}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}


        {activeTab === "homework" && (
          <div className="space-y-6 ml-2">
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {homeworkForFeedback.length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <p className="text-gray-500">No homework pending feedback</p>
                  </div>
                ) : (
                  homeworkForFeedback.map((homework) => (
                    <div
                      key={homework.id}
                      onClick={() => handleViewHomework(homework)}
                      className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <img
                          src={homework.avatar}
                          alt={homework.studentName}
                          className="w-10 h-10 rounded-full"
                        />
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {homework.studentName}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {homework.course}
                          </p>
                        </div>
                      </div>

                      <div className="mb-3">
                        <h4 className="font-medium text-gray-800 mb-1">
                          {homework.homework}
                        </h4>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {homework.description}
                        </p>
                      </div>

                      {homework.uploadedFile && (
                        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg mb-3">
                          {homework.uploadedFile.type.startsWith("image/") ? (
                            <FiImage className="w-4 h-4 text-gray-600" />
                          ) : homework.uploadedFile.type.startsWith("video/") ? (
                            <FiPlay className="w-4 h-4 text-gray-600" />
                          ) : (
                            <FiEye className="w-4 h-4 text-gray-600" />
                          )}
                          <span className="text-xs text-gray-700">
                            {homework.uploadedFile.name} (
                            {homework.uploadedFile.size})
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {homework.submittedDate}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Completed Homework
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedHomeworkFeedback.length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <p className="text-gray-500">No completed homework</p>
                  </div>
                ) : (
                  completedHomeworkFeedback.map((homework) => (
                    <div
                      key={homework.id}
                      onClick={() => handleViewHomework(homework)}
                      className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <img
                          src={homework.avatar}
                          alt={homework.studentName}
                          className="w-10 h-10 rounded-full"
                        />
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {homework.studentName}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {homework.course}
                          </p>
                        </div>
                      </div>

                      <div className="mb-3">
                        <h4 className="font-medium text-gray-800 mb-1">
                          {homework.homework}
                        </h4>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {homework.description}
                        </p>
                      </div>

                      {homework.uploadedFile && (
                        <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg mb-3">
                          {homework.uploadedFile.type.startsWith("image/") ? (
                            <FiImage className="w-4 h-4 text-green-600" />
                          ) : homework.uploadedFile.type.startsWith("video/") ? (
                            <FiPlay className="w-4 h-4 text-green-600" />
                          ) : (
                            <FiEye className="w-4 h-4 text-green-600" />
                          )}
                          <span className="text-xs text-green-700">
                            {homework.uploadedFile.name} (
                            {homework.uploadedFile.size})
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <svg
                              key={i}
                              className={`w-4 h-4 ${i < homework.rating
                                  ? "text-yellow-400"
                                  : "text-gray-300"
                                }`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                        <span className="text-xs text-gray-500">
                          {homework.submittedDate}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {showFeedbackForm && selectedAssignment && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/20">
            <div className="bg-white rounded-2xl border border-[#e4e0e8] shadow-xl p-8 w-full max-w-md">
              <div className="flex items-center gap-3 mb-4">
                <img
                  src={selectedAssignment.avatar}
                  alt={selectedAssignment.studentName}
                  className="w-12 h-12 rounded-full"
                />
                <div>
                  <h2 className="text-lg font-bold">
                    Provide Homework Feedback
                  </h2>
                  <p className="text-sm text-gray-500">
                    {selectedAssignment.studentName} -{" "}
                    {selectedAssignment.course}
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="font-semibold text-gray-800 mb-2">
                  {selectedAssignment.homework ||
                    selectedAssignment.assignment}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {selectedAssignment.description}
                </p>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rating <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        onClick={() => handleRatingClick(rating)}
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${rating <= feedbackForm.rating
                            ? "border-yellow-400 bg-yellow-400 text-white"
                            : "border-gray-300 text-gray-400 hover:border-yellow-300"
                          }`}
                      >
                        <svg
                          className="w-4 h-4"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </button>
                    ))}
                    <span className="text-sm text-gray-600 ml-2">
                      {feedbackForm.rating > 0
                        ? `${feedbackForm.rating}/5`
                        : "Select rating"}
                    </span>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Homework Feedback <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={feedbackForm.description}
                    onChange={handleDescriptionChange}
                    placeholder="Provide detailed feedback for this homework..."
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="4"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={handleCloseFeedbackForm}
                  className="px-4 py-2 text-sm rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitFeedback}
                  className="px-4 py-2 text-sm rounded-full bg-black text-white hover:bg-gray-800 transition"
                >
                  Submit Feedback
                </button>
              </div>
            </div>
          </div>
        )}

        {showHomeworkViewer && selectedHomework && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/20">
            <div className="bg-white rounded-2xl border border-[#e4e0e8] shadow-xl p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center gap-3 mb-4">
                <img
                  src={selectedHomework.avatar}
                  alt={selectedHomework.studentName}
                  className="w-12 h-12 rounded-full"
                />
                <div>
                  <h2 className="text-lg font-bold">
                    {selectedHomework.studentName}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {selectedHomework.course}
                  </p>
                </div>
                <button
                  onClick={() => setShowHomeworkViewer(false)}
                  className="ml-auto text-gray-500 hover:text-gray-700"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4">
                <h3 className="font-semibold text-gray-800 mb-2">
                  {selectedHomework.homework}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {selectedHomework.description}
                </p>

                {selectedHomework.uploadedFile && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Student Upload
                    </h4>
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center gap-3 mb-3">
                        {selectedHomework.uploadedFile.type.startsWith(
                          "image/"
                        ) ? (
                          <FiImage className="w-8 h-8 text-gray-600" />
                        ) : selectedHomework.uploadedFile.type.startsWith(
                          "video/"
                        ) ? (
                          <FiPlay className="w-8 h-8 text-gray-600" />
                        ) : (
                          <FiEye className="w-8 h-8 text-gray-600" />
                        )}
                        <div>
                          <p className="font-medium text-gray-700">
                            {selectedHomework.uploadedFile.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {selectedHomework.uploadedFile.size}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedHomework.feedback && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Your Feedback
                    </h4>
                    <div className="border rounded-lg p-3 bg-blue-50">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          Rating:
                        </span>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <svg
                              key={i}
                              className={`w-4 h-4 ${i < selectedHomework.rating
                                  ? "text-yellow-400"
                                  : "text-gray-300"
                                }`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                          <span className="text-sm text-gray-600 ml-1">
                            ({selectedHomework.rating}/5)
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700">
                        {selectedHomework.feedback}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowHomeworkViewer(false)}
                  className="px-4 py-2 text-sm rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
                >
                  Close
                </button>
                {!selectedHomework.feedback && (
                  <button
                    onClick={() => {
                      setShowHomeworkViewer(false);
                      handleFeedbackClick(selectedHomework);
                    }}
                    className="px-4 py-2 text-sm rounded-full bg-black text-white hover:bg-gray-800 transition"
                  >
                    Provide Feedback
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Attendance;
