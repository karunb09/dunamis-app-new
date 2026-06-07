import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { IoSearch } from "react-icons/io5";
import { LuArrowDownUp } from "react-icons/lu";
import { RiFilter3Line } from "react-icons/ri";
import { useNavigate } from "react-router-dom";
import { RiPenNibFill } from "react-icons/ri";
import { getStudentAssignments, clearError } from "../../redux/Assignment/AssignmentSlice";

export default function AssignmentsMain() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");

  // Redux selectors
  const { studentAssignments = [], studentLoading = false, studentError = null } = useSelector(
    (state) => state.assignment || {}
  );

  // Fetch assignments on mount
  useEffect(() => {
    dispatch(getStudentAssignments());
  }, [dispatch]);

  // Clear errors after 5 seconds
  useEffect(() => {
    if (studentError) {
      const timer = setTimeout(() => {
        dispatch(clearError());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [studentError, dispatch]);

  // Transform API data to match UI structure
  const transformedAssignments = studentAssignments.map((a) => ({
    id: a._id,
    course: a.title,
    subject: "General",
    status: a.assignmentStatus === "reviewed" || a.assignmentStatus === "submitted" 
      ? "completed" 
      : "due",
    dueDate: new Date(a.dueDate),
    instructor: a.teacher?.name || "Instructor",
    feedback: a.feedback,
    rating: a.rating,
    submissionUrl: a.submissionUrl,
    isOverdue: a.isOverdue,
  }));

  // Filter and sort
  const filteredAssignments = transformedAssignments
    .filter((a) => 
      a.course.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.instructor.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const dateA = new Date(a.dueDate).getTime();
      const dateB = new Date(b.dueDate).getTime();
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });

  // Calculate statistics
  const total = transformedAssignments.length;
  const completed = transformedAssignments.filter((a) => a.status === "completed").length;
  const pending = transformedAssignments.filter((a) => a.status === "due").length;

  // Format date
  const formatDueDate = (d) => {
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return `11:59 PM, Today`;
    }
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Loading state
  if (studentLoading && transformedAssignments.length === 0) {
    return (
      <main className="flex-1 px-4 sm:px-4 py-7 bg-[#fafafa] mx-auto pl-2 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4" />
          <p className="text-gray-600 text-lg">Loading assignments...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 sm:px-4 py-7 bg-[#fafafa] mx-auto pl-2">
      {/* Error Message */}
      {studentError && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg animate-pulse">
          <p className="font-semibold">Error</p>
          <p>{studentError}</p>
        </div>
      )}

      {/* Assignment Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
        <div className="bg-[#F4E7FD] px-6 sm:px-7 py-5 rounded-xl flex flex-col items-start">
          <div className="text-xs font-medium text-[#7d7d7d] mb-1 normal-text">
            Total Assignments
          </div>
          <div className="bold-title text-black text-xl sm:text-2xl">{total}</div>
        </div>
        <div className="bg-[#F4E7FD] px-6 sm:px-7 py-5 rounded-xl flex flex-col items-start">
          <div className="text-xs font-medium text-[#7d7d7d] mb-1 normal-text">
            Pending Assignments
          </div>
          <div className="bold-title text-black text-xl sm:text-2xl">{pending}</div>
        </div>
        <div className="bg-[#F4E7FD] px-6 sm:px-7 py-5 rounded-xl flex flex-col items-start">
          <div className="text-xs font-medium text-[#7d7d7d] mb-1 normal-text">
            Completed Assignments
          </div>
          <div className="bold-title text-black text-xl sm:text-2xl">{completed}</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between mb-6 flex-col sm:flex-row gap-2 w-full p-3 rounded-lg relative -ml-3">
        <IoSearch className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500 text-lg" />
        <input
          type="text"
          placeholder="Search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border border-gray-300 rounded-full px-10 py-2 text-sm w-full sm:w-72 bg-white focus:outline-none focus:ring-2 focus:ring-[#c2c1c3] transition"
        />
        <button 
          onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          className="flex items-center justify-between px-3 py-2 text-base transition"
          type="button"
        >
          <RiFilter3Line className="w-5 h-5 text-gray-500" />
          <LuArrowDownUp className="w-5 h-5 ml-2 text-gray-500" />
        </button>
      </div>

      {/* Assignments List */}
      <section className="space-y-4">
        {filteredAssignments.length > 0 ? (
          filteredAssignments.map((a) => (
            <div
              key={a.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between border border-[#ECEAEC] bg-white rounded-2xl px-5 py-4 gap-4 sm:gap-0"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center mb-1 flex-wrap gap-2">
                  <span
                    className={`flex items-center justify-center w-7 h-7 rounded-lg shrink-0 ${
                      a.status === "due" ? "bg-[#FF6F61]" : "bg-[#36A37E]"
                    }`}
                  >
                    <RiPenNibFill className="text-white" />
                  </span>
                  <span className="text-[#111827] font-semibold text-lg">
                    {a.status === "due" ? "Assignment Due" : "Assignment Completed"}
                  </span>
                </div>

                <span className="inline-flex items-center gap-2 bg-[#DDF4FA] text-black text-base rounded-full px-4 py-1 w-fit font-normal">
                  {a.subject}
                </span>

                <div className="bold-title text-black mb-1" style={{ fontSize: "16px" }}>
                  {a.course}
                </div>
                <div className="normal-text text-black/40 truncate text-sm">
                  by {a.instructor}
                </div>
              </div>

              <div className="flex flex-col items-end min-w-[130px] flex-shrink-0">
                <span className="text-xs text-black/40 mb-2 whitespace-nowrap">
                  {a.isOverdue && a.status === "due" ? "⚠️ Overdue" : formatDueDate(a.dueDate)}
                </span>

                {a.status === "due" ? (
                  <button
                    onClick={() => navigate("/upload", { state: { assignment: a } })}
                    className="bg-[#262626] text-white rounded-full px-5 py-1 hover:bg-black transition text-sm"
                    type="button"
                  >
                    Upload
                  </button>
                ) : (
                  <button 
                    onClick={() => navigate("/assignment-details", { state: { assignment: a } })}
                    className="border border-black text-black bg-transparent rounded-full px-5 py-1 bold-title flex items-center gap-2 hover:bg-[#f5f5f5] transition text-sm sm:text-base" 
                    style={{ fontSize: "16px" }}
                    type="button"
                  >
                    <svg 
                      width="16" 
                      height="11" 
                      viewBox="0 0 16 11" 
                      fill="none" 
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path 
                        d="M15.4569 5.2975C15.435 5.24813 14.9056 4.07375 13.7287 2.89687C12.1606 1.32875 10.18 0.5 7.99999 0.5C5.81999 0.5 3.83937 1.32875 2.27124 2.89687C1.09437 4.07375 0.562494 5.25 0.543119 5.2975C0.51469 5.36144 0.5 5.43064 0.5 5.50062C0.5 5.5706 0.51469 5.6398 0.543119 5.70375C0.564994 5.75312 1.09437 6.92688 2.27124 8.10375C3.83937 9.67125 5.81999 10.5 7.99999 10.5C10.18 10.5 12.1606 9.67125 13.7287 8.10375C14.9056 6.92688 15.435 5.75312 15.4569 5.70375C15.4853 5.6398 15.5 5.5706 15.5 5.50062C15.5 5.43064 15.4853 5.36144 15.4569 5.2975ZM7.99999 9.5C6.07624 9.5 4.39562 8.80062 3.00437 7.42188C2.43352 6.85418 1.94786 6.20685 1.56249 5.5C1.94776 4.79309 2.43343 4.14574 3.00437 3.57812C4.39562 2.19938 6.07624 1.5 7.99999 1.5C9.92374 1.5 11.6044 2.19938 12.9956 3.57812C13.5676 4.1456 14.0543 4.79295 14.4406 5.5C13.99 6.34125 12.0269 9.5 7.99999 9.5ZM7.99999 2.5C7.40665 2.5 6.82663 2.67595 6.33328 3.00559C5.83994 3.33524 5.45542 3.80377 5.22835 4.35195C5.00129 4.90013 4.94188 5.50333 5.05764 6.08527C5.17339 6.66721 5.45912 7.20176 5.87867 7.62132C6.29823 8.04088 6.83278 8.3266 7.41472 8.44236C7.99667 8.55811 8.59987 8.4987 9.14804 8.27164C9.69622 8.04458 10.1648 7.66006 10.4944 7.16671C10.824 6.67336 11 6.09334 11 5.5C10.9992 4.7046 10.6828 3.94202 10.1204 3.37959C9.55797 2.81716 8.79539 2.50083 7.99999 2.5ZM7.99999 7.5C7.60443 7.5 7.21775 7.3827 6.88885 7.16294C6.55996 6.94318 6.30361 6.63082 6.15223 6.26537C6.00086 5.89991 5.96125 5.49778 6.03842 5.10982C6.11559 4.72186 6.30607 4.36549 6.58578 4.08579C6.86548 3.80608 7.22185 3.6156 7.60981 3.53843C7.99778 3.46126 8.39991 3.50087 8.76536 3.65224C9.13081 3.80362 9.44317 4.05996 9.66293 4.38886C9.8827 4.71776 9.99999 5.10444 9.99999 5.5C9.99999 6.03043 9.78928 6.53914 9.41421 6.91421C9.03913 7.28929 8.53043 7.5 7.99999 7.5Z" 
                        fill="black" 
                      />
                    </svg>
                    View
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500 text-lg mb-2">No assignments found</p>
            <p className="text-gray-400 text-sm">
              {searchTerm ? "Try adjusting your search" : "You don't have any assignments yet"}
            </p>
          </div>
        )}
      </section>

      {/* Loading indicator when refreshing */}
      {studentLoading && transformedAssignments.length > 0 && (
        <div className="fixed bottom-4 right-4 bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
          <span className="text-sm">Updating...</span>
        </div>
      )}
    </main>
  );
}
