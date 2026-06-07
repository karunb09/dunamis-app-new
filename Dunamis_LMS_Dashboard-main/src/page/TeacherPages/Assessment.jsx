import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchTeacherAssessments,
  submitAssessment,
} from "../../redux/Assesment/AssesmentSlice";

const formatDate = (isoString) => {
  if (!isoString) return "N/A";
  const options = { year: "numeric", month: "short", day: "numeric" };
  return new Date(isoString).toLocaleDateString(undefined, options);
};

const InitialsAvatar = ({ firstName, lastName }) => {
  const initials = `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`;
  return (
    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-semibold text-lg select-none">
      {initials.toUpperCase()}
    </div>
  );
};

const Assessment = () => {
  const [activeTab, setActiveTab] = useState("pending");
  const [view, setView] = useState("list");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [formData, setFormData] = useState({
    homework: "",
    practice: "",
    speed: "",
    performance: "",
    feedback: "",
    total: "",
  });
  const [completedData, setCompletedData] = useState([]);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const {
    teacherAssessments,
    loading,
    error,
    submitLoading,
    submitError,
  } = useSelector((state) => state.assessment);

  useEffect(() => {
    dispatch(fetchTeacherAssessments());
  }, [dispatch]);

  const pendingStudents = teacherAssessments?.data?.pending || [];
  const completedStudents = teacherAssessments?.data?.completed || [];

  const handleChange = (e) => {
    const { name, value } = e.target;
    let updatedData = { ...formData, [name]: value };

    if (
      updatedData.homework &&
      updatedData.practice &&
      updatedData.speed &&
      updatedData.performance
    ) {
      const total =
        Number(updatedData.homework) +
        Number(updatedData.practice) +
        Number(updatedData.speed) +
        Number(updatedData.performance);
      updatedData.total = `${total}/20`;
    } else {
      updatedData.total = "";
    }

    setFormData(updatedData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return;

    const submissionData = {
      homework: Number(formData.homework),
      practice: Number(formData.practice),
      speed: Number(formData.speed),
      performance: Number(formData.performance),
      trainerFeedback: formData.feedback,
      totalScore:
        Number(formData.homework) +
        Number(formData.practice) +
        Number(formData.speed) +
        Number(formData.performance),
    };

    try {
      await dispatch(
        submitAssessment({
          assessmentId: selectedStudent._id,
          submissionData,
        })
      ).unwrap();

      dispatch(fetchTeacherAssessments());

      setFormData({
        homework: "",
        practice: "",
        speed: "",
        performance: "",
        feedback: "",
        total: "",
      });
      setSelectedStudent(null);
      setView("list");
      setActiveTab("completed");
    } catch (err) {
      console.error("Submission failed:", err);
    }
  };

  const handleCancel = () => {
    setView("list");
    setSelectedStudent(null);
  };

  return (
    <div className="w-full min-h-screen bg-white p-4 md:p-6 flex justify-center">
      <div className="w-full max-w-6xl">
        <div className="flex gap-6 border-b mb-6">
          <button
            onClick={() => {
              setActiveTab("pending");
              setView("list");
            }}
            className={`pb-2 text-sm font-medium ${activeTab === "pending"
              ? "border-b-2 border-black text-black"
              : "text-gray-500"
              }`}
          >
            Pending
          </button>
          <button
            onClick={() => {
              setActiveTab("completed");
              setView("list");
            }}
            className={`pb-2 text-sm font-medium ${activeTab === "completed"
              ? "border-b-2 border-black text-black"
              : "text-gray-500"
              }`}
          >
            Completed
          </button>
        </div>

        {loading && <p>Loading assessments...</p>}
        {error && <p className="text-red-500">Error: {error}</p>}

        {activeTab === "pending" && view === "list" && !loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pendingStudents.length === 0 && <p>No pending assessments</p>}
            {pendingStudents.map((item) => {
              const student = item.studentName || {};
              const dueDateFormatted = formatDate(item.dueDate);
              return (
                <div
                  key={item._id}
                  className="border rounded-2xl shadow-sm p-6 bg-gray-50"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <InitialsAvatar
                      firstName={student.firstName}
                      lastName={student.lastName}
                    />
                    <div>
                      <p className="font-medium text-gray-800">
                        {student.firstName} {student.lastName}
                      </p>
                      <p className="text-sm text-gray-500">
                        Due: {dueDateFormatted}
                      </p>
                    </div>
                    <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-600">
                      {item.status}
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => navigate("/teacher/students")}
                      className="border rounded-full px-4 py-1 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      View Progress
                    </button>
                    <button
                      onClick={() => {
                        setSelectedStudent(item);
                        setView("form");
                      }}
                      className="bg-gray-800 text-white rounded-full px-4 py-1 text-sm hover:bg-black"
                    >
                      Assess
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "pending" && view === "form" && selectedStudent && (
          <div className="bg-gray-50 border rounded-2xl p-6 md:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
              <div className="flex items-center gap-3">
                <InitialsAvatar
                  firstName={selectedStudent.studentName.firstName}
                  lastName={selectedStudent.studentName.lastName}
                />
                <div>
                  <p className="font-medium text-gray-800 text-sm sm:text-base">
                    {selectedStudent.studentName.firstName}{" "}
                    {selectedStudent.studentName.lastName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:ml-auto">
                <span className="text-xs sm:text-sm px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-600">
                  {selectedStudent.status}
                </span>
                <p className="text-xs sm:text-sm text-red-500">
                  Due: {formatDate(selectedStudent.dueDate)}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-600 text-sm mb-1">
                    Homework
                  </label>
                  <input
                    type="number"
                    name="homework"
                    min="0"
                    max="5"
                    value={formData.homework}
                    onChange={handleChange}
                    placeholder="0/5"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 text-sm mb-1">
                    Practice
                  </label>
                  <input
                    type="number"
                    name="practice"
                    min="0"
                    max="5"
                    value={formData.practice}
                    onChange={handleChange}
                    placeholder="0/5"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-600 text-sm mb-1">Speed</label>
                  <input
                    type="number"
                    name="speed"
                    min="0"
                    max="5"
                    value={formData.speed}
                    onChange={handleChange}
                    placeholder="0/5"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 text-sm mb-1">
                    Performance
                  </label>
                  <input
                    type="number"
                    name="performance"
                    min="0"
                    max="5"
                    value={formData.performance}
                    onChange={handleChange}
                    placeholder="0/5"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-600 text-sm mb-1">Total Score</label>
                <input
                  type="text"
                  name="total"
                  value={formData.total}
                  readOnly
                  placeholder="00/20"
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-100 focus:outline-none"
                />
              </div>

              {submitLoading && (
                <p className="text-sm text-gray-600">Submitting assessment...</p>
              )}
              {submitError && (
                <p className="text-sm text-red-500">Submit error: {submitError}</p>
              )}

              <div className="flex justify-between items-center pt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="border rounded-full px-4 py-2 text-center text-gray-700 font-medium text-sm sm:text-base hover:bg-gray-100"
                >
                  Cancel
                </button>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => navigate("/teacher/students")}
                    className="border rounded-full px-4 py-2 text-center text-gray-700 font-medium text-sm sm:text-base hover:bg-gray-100"
                  >
                    View Profile
                  </button>
                  <button
                    type="submit"
                    disabled={
                      submitLoading ||
                      !formData.homework ||
                      !formData.practice ||
                      !formData.speed ||
                      !formData.performance
                    }
                    className={`rounded-full px-4 py-2 font-medium text-sm sm:text-base ${formData.homework &&
                      formData.practice &&
                      formData.speed &&
                      formData.performance &&
                      !submitLoading
                      ? "bg-black text-white hover:bg-gray-900"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                      }`}
                  >
                    {submitLoading ? "Submitting..." : "Submit"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {activeTab === "completed" && view === "list" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {completedStudents.length === 0 && <p>No completed assessments</p>}
            {completedStudents.map((item) => {
              const student = item.studentName || {};
              return (
                <div
                  key={item._id}
                  className="border rounded-2xl shadow-sm bg-white overflow-hidden"
                >
                  <div className="flex items-center gap-3 p-4 sm:p-6">
                    <InitialsAvatar
                      firstName={student.firstName}
                      lastName={student.lastName}
                    />
                    <div>
                      <p className="font-medium text-gray-800 text-sm sm:text-base">
                        {student.firstName} {student.lastName}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500">Assessment</p>
                      <p className="text-[10px] sm:text-xs text-gray-400">
                        Submitted on {formatDate(item.assessmentDate)}
                      </p>
                    </div>
                    <span className="ml-auto bg-green-100 text-green-600 text-[10px] sm:text-xs px-2 py-0.5 rounded-full">
                      Completed
                    </span>
                  </div>

                  <div className="bg-gray-50 border-t px-4 sm:px-6 py-3 sm:py-4">
                    <div className="flex flex-wrap items-center justify-between text-xs sm:text-sm text-gray-700 gap-x-3 gap-y-2 mb-3">
                      <div className="flex divide-x divide-gray-300 gap-10">
                        <div>
                          <p className="text-gray-500">Homework *</p>
                          <p className="text-lg font-semibold">{item.homework || 0}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Practice *</p>
                          <p className="text-lg font-semibold">{item.practice || 0}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Speed *</p>
                          <p className="text-lg font-semibold">{item.speed || 0}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Performance *</p>
                          <p className="text-lg font-semibold">{item.performance || 0}</p>
                        </div>
                      </div>
                    </div>

                    {item.trainerFeedback && (
                      <div className="mb-3">
                        <p className="text-[10px] sm:text-xs text-gray-400">Feedback (opt)</p>
                        <p className="text-xs sm:text-sm text-gray-600">{item.trainerFeedback}</p>
                      </div>
                    )}

                    <p className="text-xs text-gray-500">Total Score *</p>
                    <p className="text-lg font-semibold">{item.totalScore || 0}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Assessment;
