import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getAssignmentsByStatus, createAssignment, reviewSubmission } from "../../redux/Assignment/AssignmentSlice";
import toast from "react-hot-toast";
import { FiMusic } from "react-icons/fi";

const Tabs = ["All", "Pending", "Reviewed", "Overdue", "Reminders"];

function Assignments() {
  const dispatch = useDispatch();
  const { assignments, loading, error } = useSelector((state) => state.assignment);

  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    dispatch(getAssignmentsByStatus("all"));
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const flattenedAssignments = [];
  if (Array.isArray(assignments)) {
    assignments.forEach((assignment) => {
      if (assignment.students && assignment.students.length > 0) {
        assignment.students.forEach((student) => {
          flattenedAssignments.push({
            ...assignment,
            studentData: student,
            studentName: student.name,
            studentEmail: student.email,
            studentStatus: student.status,
            studentFeedback: student.feedback,
            studentRating: student.rating,
            submissionFile: student.submissionFile,
            submissionDate: student.submissionDate,
          });
        });
      }
    });
  }

  const filteredAssignments = flattenedAssignments.filter((item) => {
    if (activeTab !== "All") {
      const statusMap = {
        Pending: "pending",
        Reviewed: "reviewed",
        Overdue: "overdue",
        Reminders: "reminder",
      };
      if (item.studentStatus !== statusMap[activeTab]) {
        return false;
      }
    }

    if (
      search &&
      !item.title?.toLowerCase().includes(search.toLowerCase()) &&
      !item.description?.toLowerCase().includes(search.toLowerCase()) &&
      !item.studentName?.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const handleActionClick = (action, assignment) => {
    setSelectedAssignment(assignment);
    setSelectedStudent(assignment.studentData);

    if (action === "Assign") {
      setModalType("assign");
      setShowModal(true);
    }
    if (action === "Review") {
      setModalType("review");
      setShowModal(true);
    }
    if (action === "View") {
      setModalType("view");
      setShowModal(true);
    }
    if (action === "Send Reminder") {
      setModalType("reminder");
      setShowModal(true);
    }
  };

  const getActionButton = (status) => {
    if (status === "pending") {
      return { action: "Review", color: "bg-green-500" };
    }
    if (status === "overdue") {
      return { action: "Send Reminder", color: "bg-red-500" };
    }
    if (status === "assigned") {
      return { action: "View", color: "bg-indigo-900" };
    }
    if (status === "reviewed") {
      return { action: "View", color: "bg-gray-500" };
    }
    return { action: "View", color: "bg-gray-500" };
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs">● Pending</span>,
      reviewed: <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">● Reviewed</span>,
      overdue: <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">● Overdue</span>,
      assigned: <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs">● Assigned</span>,
    };
    return badges[status] || null;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    if (date.toDateString() === today.toDateString()) {
      return `${timeStr}, Today`;
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `${timeStr}, Tomorrow`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `${timeStr}, Yesterday`;
    } else {
      return date.toLocaleDateString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-white p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading assignments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-white p-4 font-sans">
      <div className="flex justify-between items-center mb-4">
        <div className="relative w-1/3 min-w-[200px]">
          <input
            type="text"
            placeholder="Search assignments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
          />
          <svg
            className="absolute left-2 top-2.5 w-4 h-4 text-gray-600"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <div className="flex gap-3 text-xl text-gray-700">
          <button className="hover:text-gray-900">☰</button>
          <button className="hover:text-gray-900">⇅</button>
        </div>
      </div>

      <div className="flex gap-4 sm:gap-6 mb-6 text-gray-500 text-xs sm:text-sm md:text-base border-b">
        {Tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 ${activeTab === tab
                ? "border-b-2 border-black text-black font-medium"
                : "hover:text-gray-700"
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {filteredAssignments.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No assignments found</p>
          <p className="text-gray-400 text-sm mt-2">
            {activeTab === "All"
              ? "Create your first assignment"
              : `No ${activeTab.toLowerCase()} assignments`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAssignments.map((item) => {
            const { action, color } = getActionButton(item.studentStatus);
            return (
              <div
                key={`${item._id}-${item.studentData?._id || Math.random()}`}
                className="border rounded-lg p-6 flex flex-col gap-3 shadow-md bg-white hover:shadow-lg transition"
              >
                <div className="flex items-center gap-2">
                  <img
                    src={
                      item.studentData?.image ||
                      `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
                        item.studentName || "Student"
                      )}`
                    }
                    alt="profile"
                    className="w-8 h-8 rounded-full"
                  />
                  <span className="text-sm font-medium">
                    {item.studentName || "Student"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">{item.title}</h3>
                  <span className="text-xs text-gray-500">
                    {formatDate(item.dueDate)}
                  </span>
                </div>
                <div className="flex gap-2 text-xs flex-wrap">
                  {item.category && (
                    <span className="flex items-center gap-1 border rounded-full px-2 py-0.5 bg-cyan-50 text-xs">
                      <FiMusic className="w-3 h-3" /> {item.category.name}
                    </span>
                  )}
                  {getStatusBadge(item.studentStatus)}
                </div>
                <p className="text-sm font-medium">
                  {item.course?.name || "Course"}
                </p>
                {item.description && (
                  <p className="text-xs text-gray-500 line-clamp-2">
                    {item.description}
                  </p>
                )}
                {item.submissionDate && (
                  <p className="text-xs text-gray-500">
                    Submitted: {formatDate(item.submissionDate)}
                  </p>
                )}
                <div className="flex justify-end">
                  <button
                    onClick={() => handleActionClick(action, item)}
                    className={`px-4 py-1 rounded-full text-white text-sm ${color} hover:opacity-90 transition`}
                  >
                    {action}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-lg w-full p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-2xl"
            >
              ✕
            </button>
            {modalType === "assign" && (
              <CreateAssignment
                onClose={() => {
                  setShowModal(false);
                  dispatch(getAssignmentsByStatus("all"));
                }}
              />
            )}
            {modalType === "review" && (
              <ReviewAssignment
                assignment={selectedAssignment}
                student={selectedStudent}
                onCancel={() => setShowModal(false)}
                onSubmit={() => {
                  setShowModal(false);
                  dispatch(getAssignmentsByStatus("all"));
                }}
              />
            )}
            {modalType === "view" && (
              <ViewAssignment
                assignment={selectedAssignment}
                student={selectedStudent}
                onClose={() => setShowModal(false)}
              />
            )}
            {modalType === "reminder" && (
              <SendReminderModal
                assignment={selectedAssignment}
                student={selectedStudent}
                onCancel={() => setShowModal(false)}
                onSend={() => {
                  setShowModal(false);
                  toast.success("Reminder sent successfully");
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CreateAssignment({ onClose }) {
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    title: "",
    dueDate: "",
    description: "",
    courseId: "",
    studentIds: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAssign = async () => {
    if (!formData.title || !formData.dueDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      await dispatch(createAssignment(formData)).unwrap();
      toast.success("Assignment created successfully");
      onClose();
    } catch (error) {
      toast.error(error || "Failed to create assignment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-6">Create Assignment</h2>
      <div className="flex items-center gap-4 mb-4">
        <img
          src="https://i.pravatar.cc/40?u=1"
          alt="profile"
          className="w-10 h-10 rounded-full"
        />
        <div>
          <p className="font-medium">Select Student</p>
          <div className="flex gap-2 mt-1 text-sm text-black-500">
            <span className="flex items-center gap-1 border rounded-full px-2 py-0.5 bg-cyan-50 text-xs">
              <FiMusic className="w-3 h-3" />
              Music
            </span>
            <span>Course</span>
          </div>
        </div>
      </div>
      <div className="flex gap-4 mb-4">
        <input
          type="text"
          name="title"
          placeholder="Assignment Title *"
          value={formData.title}
          onChange={handleChange}
          className="flex-1 border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-gray-200"
        />
        <input
          type="datetime-local"
          name="dueDate"
          value={formData.dueDate}
          onChange={handleChange}
          className="flex-1 border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-gray-200"
        />
      </div>
      <textarea
        name="description"
        placeholder="Assignment Description"
        value={formData.description}
        onChange={handleChange}
        className="w-full border rounded-lg p-3 mb-4 focus:outline-none focus:ring-2 focus:ring-gray-200"
        rows={4}
      />
      <div className="flex justify-end gap-4">
        <button
          className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-200"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
          onClick={handleAssign}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating..." : "Create Assignment"}
        </button>
      </div>
    </div>
  );
}

function ReviewAssignment({ assignment, student, onCancel, onSubmit }) {
  const dispatch = useDispatch();
  const [feedback, setFeedback] = useState(student?.feedback || "");
  const [grade, setGrade] = useState(student?.rating || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitReview = async () => {
    if (!feedback) {
      toast.error("Please provide feedback");
      return;
    }

    setIsSubmitting(true);
    try {
      await dispatch(
        reviewSubmission({
          assignmentId: assignment._id,
          studentId: student._id,
          feedback,
          rating: grade ? parseInt(grade) : null,
          status: "reviewed",
        })
      ).unwrap();
      toast.success("Review submitted successfully");
      onSubmit();
    } catch (error) {
      toast.error(error || "Failed to submit review");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Review Assignment</h2>

      <div className="flex items-center gap-3 mb-4">
        <img
          src={
            student?.image ||
            `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
              student?.name || "Student"
            )}`
          }
          alt="User"
          className="w-10 h-10 rounded-full"
        />
        <div>
          <p className="font-medium">{student?.name || "Student"}</p>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 border rounded-full px-2 py-0.5 bg-cyan-50 text-xs">
              <FiMusic className="w-3 h-3" /> {assignment?.category?.name || "Category"}
            </span>
            <span className="text-sm text-gray-600">{assignment?.course?.name || "Course"}</span>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <p className="font-medium">{assignment?.title}</p>
        <p className="text-xs text-gray-500">
          Submitted at{" "}
          {student?.submissionDate
            ? new Date(student.submissionDate).toLocaleString()
            : "N/A"}
        </p>
      </div>

      {student?.submissionFile && student.submissionFile.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Submitted Files:</p>
          {student.submissionFile.map((file, idx) => (
            <a
              key={idx}
              href={`${import.meta.env.VITE_IMAGE}${file}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline block"
            >
              View File {idx + 1}
            </a>
          ))}
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Rating (1-5)
        </label>
        <input
          type="number"
          min="1"
          max="5"
          placeholder="Enter rating (1-5)"
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Feedback *
        </label>
        <textarea
          placeholder="Enter your feedback here..."
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows="4"
        />
      </div>

      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          onClick={handleSubmitReview}
          className="px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-800 disabled:opacity-50"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Submitting..." : "Submit Review"}
        </button>
      </div>
    </div>
  );
}

function ViewAssignment({ assignment, student, onClose }) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-6">View Assignment</h2>

      <div className="flex items-center gap-4 mb-4">
        <img
          src={
            student?.image ||
            `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
              student?.name || "Student"
            )}`
          }
          alt="profile"
          className="w-10 h-10 rounded-full"
        />
        <div>
          <p className="font-medium">{student?.name || "Student"}</p>
          <div className="flex gap-2 mt-1 text-sm">
            <span className="flex items-center gap-1 border rounded-full px-2 py-0.5 bg-cyan-50 text-xs">
              <FiMusic className="w-3 h-3" />
              {assignment?.category?.name || "Category"}
            </span>
            <span className="text-gray-600">{assignment?.course?.name || "Course"}</span>
          </div>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <p className="text-sm text-gray-500 mb-1">Assignment Title</p>
          <p className="font-medium">{assignment?.title}</p>
        </div>

        <div>
          <p className="text-sm text-gray-500 mb-1">Status</p>
          <span
            className={`px-3 py-1 rounded-full text-sm inline-block ${student?.status === "reviewed"
                ? "bg-green-100 text-green-700"
                : student?.status === "overdue"
                  ? "bg-red-100 text-red-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
          >
            ● {student?.status || "N/A"}
          </span>
        </div>

        <div>
          <p className="text-sm text-gray-500 mb-1">Due Date</p>
          <p className="font-medium">
            {assignment?.dueDate
              ? new Date(assignment.dueDate).toLocaleString()
              : "N/A"}
          </p>
        </div>

        {assignment?.description && (
          <div>
            <p className="text-sm text-gray-500 mb-1">Description</p>
            <p className="text-sm text-gray-700">{assignment.description}</p>
          </div>
        )}

        {student?.feedback && (
          <div>
            <p className="text-sm text-gray-500 mb-1">Feedback</p>
            <div className="border rounded-lg p-3 bg-gray-50">
              <p className="text-sm text-gray-700">{student.feedback}</p>
            </div>
          </div>
        )}

        {student?.rating && (
          <div>
            <p className="text-sm text-gray-500 mb-1">Rating</p>
            <p className="font-medium text-lg">{student.rating}/5</p>
          </div>
        )}

        {student?.submissionFile && student.submissionFile.length > 0 && (
          <div>
            <p className="text-sm text-gray-500 mb-2">Submitted Files</p>
            {student.submissionFile.map((file, idx) => (
              <a
                key={idx}
                href={`${import.meta.env.VITE_IMAGE}${file}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline block mb-1"
              >
                View File {idx + 1}
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}

function SendReminderModal({ assignment, student, onCancel, onSend }) {
  const [message, setMessage] = useState(
    `Reminder: Your assignment "${assignment?.title}" is overdue. Please submit it as soon as possible.`
  );

  return (
    <div>
      <h2 className="text-lg font-semibold mb-6">Send Reminder</h2>

      <div className="flex items-center gap-4 mb-4">
        <img
          src={
            student?.image ||
            `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
              student?.name || "Student"
            )}`
          }
          alt="profile"
          className="w-10 h-10 rounded-full"
        />
        <div>
          <p className="font-medium">{student?.name || "Student"}</p>
          <div className="flex gap-2 mt-1 text-sm">
            <span className="flex items-center gap-1 border rounded-full px-2 py-0.5 bg-cyan-50 text-xs">
              <FiMusic className="w-3 h-3" />
              {assignment?.category?.name || "Category"}
            </span>
            <span className="text-gray-600">{assignment?.course?.name || "Course"}</span>
          </div>
        </div>
      </div>

      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
        <p className="font-medium text-sm">{assignment?.title}</p>
        <p className="text-xs text-red-600 mt-1">
          Due:{" "}
          {assignment?.dueDate
            ? new Date(assignment.dueDate).toLocaleString()
            : "N/A"}
        </p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Reminder Message
        </label>
        <textarea
          placeholder="Enter a reminder message for the student..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          rows="4"
        />
      </div>

      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          onClick={onSend}
          className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600"
        >
          Send Reminder
        </button>
      </div>
    </div>
  );
}

export default Assignments;
