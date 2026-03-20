import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { RiPenNibFill, RiMusic2Fill } from "react-icons/ri";
import { Clock, Users, Eye } from "react-feather"; 
import { AiOutlineFileDone } from "react-icons/ai";
import { LuMusic } from "react-icons/lu";
import { getStoredUser } from "../../../utils/authSession";
import { getAllBookings } from "../../../redux/DemoBooking/DemoBookingSlice";
import DemoBookingsPanel from "./DemoBookingsPanel";
import {
  getTeacherRoleId,
  getUserDisplayName,
} from "../../../utils/roleIdentity";

const Dashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const authUser = useSelector((state) => state.auth?.user);
  const { bookings, loading: demoLoading, error: demoError } = useSelector(
    (state) => state.demoBookings || {}
  );
  const storedUser = getStoredUser() || {};
  const resolvedUser = authUser || storedUser || {};
  const teacherId = getTeacherRoleId(resolvedUser);
  const teacherName = getUserDisplayName(resolvedUser, "Teacher");

  // Sample classes data
  const initialClasses = [
    {
      id: 1,
      subject: "Keyboard Fundamentals",
      type: "Music",
      level: "Group Class",
      time: "5:00 PM, Today",
      students: [
        { id: 1, name: "Priya Sharma" },
        { id: 2, name: "Lasya Krishnan" },
        { id: 3, name: "Rakesh Kumar" },
      ],
    },
    {
      id: 2,
      subject: "Keyboard Fundamentals",
      type: "Music",
      level: "Individual Class",
      time: "7:00 PM, Today",
      students: [{ id: 4, name: "Saketh Reddy" }],
    },
  ];

  // Attendance state
  const [attendance, setAttendance] = useState(() => {
    const att = {};
    initialClasses.forEach((cls) => {
      cls.students.forEach((s) => {
        att[s.id] = false; // initially absent
      });
    });
    return att;
  });

  const toggleAttendance = (studentId) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  };

  // Pending assignments
  const pendingAssignments = [
    {
      id: 1,
      type: "due",
      subject: "Music",
      title: "Keyboard Fundamentals : Video Submission",
      student: "Pallavi Rajesh",
      dueDate: "11:59 PM, Today",
      action: "Send",
    },
    {
      id: 2,
      type: "due",
      subject: "Music",
      title: "Keyboard Fundamentals : Video Submission",
      student: "Sukumar Kumar",
      dueDate: "11:59 PM, 25 Aug 2025",
      action: "Send",
    },
    {
      id: 3,
      type: "turned-in",
      subject: "Music",
      title: "Keyboard Fundamentals : Video Submission",
      student: "Sukumar Kumar",
      dueDate: "11:59 PM, 25 Aug 2025",
      action: "Review",
    },
  ];

  
  const pendingAssessments = [
    {
      id: 1,
      subject: "Music",
      title: "Keyboard Fundamentals : Quiz 1",
      student: "Amit Verma",
      dueDate: "10:00 AM, Tomorrow",
      action: "Start",
    },
  ];


  const monthSummary = {
    month: "September 2025",
    classesCompleted: { current: 8, total: 12, percentage: 67 },
    teachingHours: 42,
    studentsTaught: 15,
  };

  useEffect(() => {
    dispatch(getAllBookings(teacherId ? { teacherId } : {}));
  }, [dispatch, teacherId]);

  const handleRefreshDemoBookings = () => {
    dispatch(getAllBookings(teacherId ? { teacherId } : {}));
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 p-4 md:p-6 -ml-6">
      {/* Welcome */}
      <div className="mb-6 ml-2">
        <h1 className="text-2xl font-semibold text-gray-800">
          Welcome back, {teacherName}
        </h1>
        <p className="text-gray-500 text-sm">
          Your upcoming demos and class activity are lined up here.
        </p>
      </div>

      <DemoBookingsPanel
        bookings={bookings}
        teacherId={teacherId}
        loading={demoLoading}
        error={demoError}
        onRefresh={handleRefreshDemoBookings}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { title: "Total Students", value: 12, sub: "Across all courses" },
          { title: "Active Courses", value: 2, sub: "+1 from last month" },
          { title: "Group Students", value: 29, sub: "+4 from last month" },
          { title: "Individual Students", value: 6, sub: "+1 from last month" },
        ].map((stat, idx) => (
          <div key={idx} className="bg-cyan-50 rounded-xl p-4 shadow-sm">
            <h2 className="text-gray-600 text-sm">{stat.title}</h2>
            <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
            <p className="text-xs text-gray-500">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Upcoming Classes */}
      <div className="mb-8 ml-2">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Upcoming Classes
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {initialClasses.map((cls) => (
            <div
              key={cls.id}
              className="border rounded-xl p-4 shadow-sm bg-white"
            >
              <div className="flex justify-between items-center mb-2">
                <div className="flex gap-2">
                  <button className="flex items-center gap-1 border rounded-full px-2 py-0.5 bg-cyan-50 text-xs">   
                     <LuMusic className="w-3 h-3" />             
                    {cls.type}
                  </button>

                  <button className="flex items-center gap-1 border rounded-full px-2 py-0.5 bg-gray-100 text-xs text-gray-600">
                    {cls.level}
                  </button>
                </div>
                <span className="text-sm text-gray-500">{cls.time}</span>
              </div>
              <h3 className="font-semibold text-gray-800 mb-1">
                {cls.subject}
              </h3>
              <p className="text-sm text-gray-500 mb-3">
                {cls.students.map((s) => s.name).join(" • ")}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate("/teacher/courses")}
                  className="px-4 py-1 border rounded-full text-sm text-gray-600 hover:bg-gray-50"
                >
                  View Details
                </button>
                <button className="px-4 py-1 bg-emerald-400 text-black rounded-full text-sm hover:bg-emerald-600">
                  Join Class
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Today's Classes */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4 ml-2">
          Today’s Classes
        </h2>

        {initialClasses.map((cls) => (
          <div
            key={cls.id}
            className="bg-white shadow-sm rounded-xl p-4 border mb-6"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex gap-2 mb-1">
                  <button className="flex items-center gap-1 border rounded-full px-2 py-0.5 bg-cyan-50 text-xs">
                   <LuMusic className="w-3 h-3" />
                    {cls.type}
                  </button>
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                    {cls.level}
                  </span>
                </div>
                <h2 className="font-semibold text-gray-800 ml-2">
                  {cls.subject}
                </h2>
              </div>
              <p className="text-xs md:text-sm text-gray-500">{cls.time}</p>
            </div>

            <div className="space-y-3 -mt-2">
              {cls.students.map((student) => (
                <div
                  key={student.id}
                  className="border rounded-lg p-4 bg-gray-50 space-y-3"
                >
                  {/* Student Name */}
                  <div className="font-medium text-gray-800">
                    {student.name}
                  </div>

                  {/* Attendance + Homework + Module */}
                  <div className="flex flex-col md:flex-row gap-4">
                    {/* Attendance */}
                    <div className="flex flex-col w-full md:w-40">
                      <label
                        htmlFor={`att-${student.id}`}
                        className="mb-1 text-sm font-medium text-gray-700"
                      >
                        Attendance *
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

                    {/* Homework */}
                    <div className="flex flex-col flex-1">
                      <label
                        htmlFor={`homework-${student.id}`}
                        className="mb-1 text-sm font-medium text-gray-700"
                      >
                        Homework *
                      </label>
                      <textarea
                        id={`homework-${student.id}`}
                        placeholder="Type today’s homework"
                        className="border rounded-md px-3 py-2 text-sm resize-y w-full"
                        rows="1"
                      />
                    </div>

                    {/* Module */}
                    <div className="flex flex-col w-full md:w-56">
                      <label
                        htmlFor={`module-${student.id}`}
                        className="mb-1 text-sm font-medium text-gray-700"
                      >
                        Module - Lesson - Topic
                      </label>
                      <select
                        id={`module-${student.id}`}
                        className="border rounded-md px-3 py-2 text-sm w-full bg-white"
                      >
                        <option>Today’s Topic</option>
                        <option>Module 1 - Lesson 1</option>
                        <option>Module 2 - Lesson 3</option>
                        <option>Module 3 - Lesson 5</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}

              {/* Action Buttons */}
              <div className="flex justify-end mt-2 gap-3">
                <button className="px-4 py-2 text-sm rounded-full border">
                  Cancel
                </button>
                <button className="px-4 py-2 text-sm rounded-full bg-black text-white">
                  Send
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pending Assignments */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-2 ml-2">
          Pending Assignments
        </h2>
        <div className="space-y-4">
          {pendingAssignments.map((assignment) => (
            <div
              key={assignment.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className={`p-2 rounded-lg ${
                      assignment.type === "turned-in"
                        ? "bg-red-100"
                        : "bg-red-100"
                    }`}
                  >
                    <RiPenNibFill
                      className={`w-5 h-5 ${
                        assignment.type === "turned-in"
                          ? "text-red-600"
                          : "text-red-600"
                      }`}
                    />
                  </div>
                  <h3 className="font-semibold text-gray-800">
                    {assignment.type === "turned-in"
                      ? "Assignment Turned-in"
                      : "Assignment Due"}
                  </h3>
                </div>
                <span className="text-sm text-gray-500">
                  {assignment.dueDate}
                </span>
              </div>

              <div className="flex items-center gap-1 mb-1 ml-1 px-2 py-1 border rounded-full bg-cyan-50 w-fit">
                <LuMusic className="w-3 h-3 text-black-500" />
                <span className="text-xs text-black-500">
                  {assignment.subject}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-900 font-medium mb-1">
                    {assignment.title}
                  </p>
                  <p className="text-sm text-gray-600">{assignment.student}</p>
                </div>

                <button
                  className={`px-4 py-2 text-sm rounded-full transition-colors ${
                    assignment.action === "Review"
                      ? "bg-green-100 text-green-700 hover:bg-green-200"
                      : "bg-red-400 text-white hover:bg-red-500"
                  }`}
                >
                  {assignment.action}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Assessments */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-2 mt-4 ml-2">
          Pending Assessments
        </h2>
        <div className="space-y-4">
          {pendingAssessments.map((assessment) => (
            <div
              key={assessment.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-gray-800">
                    <RiPenNibFill className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-800">
                    Assessment Due
                  </h3>
                </div>
                <span className="text-sm text-gray-500">
                  {assessment.dueDate}
                </span>
              </div>

              <div className="flex items-center gap-1 mb-1 ml-1 px-2 py-1 border rounded-full bg-cyan-50 w-fit">
                <LuMusic className="w-3 h-3 text-black-500" />
                <span className="text-xs text-black-500">
                  {assessment.subject}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-900 font-medium mb-1">
                    {assessment.title}
                  </p>
                  <p className="text-sm text-gray-600">{assessment.student}</p>
                </div>

                <button className="px-4 py-2 rounded-full font-medium bg-gray-800 text-white hover:bg-gray-900 transition-colors">
                  {assessment.action}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column - Summary */}
      <div className="space-y-6 mt-6">
        <h2 className="text-lg font-semibold text-gray-800 ml-2 -mb-4">
          This Month's Summary
        </h2>

        {/* Classes Completed */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-100">
                <AiOutlineFileDone className="w-5 h-5 text-gray-700" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  Classes Completed
                </h3>
                <p className="text-sm text-gray-600">
                  {monthSummary.classesCompleted.current} of{" "}
                  {monthSummary.classesCompleted.total}
                </p>
              </div>
            </div>
            <span className="text-xl font-bold text-cyan-200">
              {monthSummary.classesCompleted.percentage}%
            </span>
          </div>
        </div>

        {/* Total Teaching Hours */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  Total Teaching Hours
                </h3>
                <p className="text-sm text-gray-600">{monthSummary.month}</p>
              </div>
            </div>
            <span className="text-xl font-bold text-yellow-400">
              {monthSummary.teachingHours}h
            </span>
          </div>
        </div>

        {/* Students Taught */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <Users className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Students Taught</h3>
                <p className="text-sm text-gray-600">{monthSummary.month}</p>
              </div>
            </div>
            <span className="text-xl font-bold text-red-400">
              {monthSummary.studentsTaught}
            </span>
          </div>
        </div>

        {/* View Report Button */}
        <button className="w-full bg-white rounded-full shadow-sm border border-gray-200 p-4 flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
          <Eye className="w-5 h-5 text-gray-700" />
          <span className="font-medium text-gray-900">View Report</span>
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
