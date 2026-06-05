"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { IoSearch } from "react-icons/io5";
import { LuArrowDownUp } from "react-icons/lu";
import { RiFilter3Line, RiPenNibFill } from "react-icons/ri";
import StudentShell from "@/components/student/StudentShell";
import { getWebsiteToken } from "@/lib/authSession";
import { API_BASE } from "@/lib/apiBase";

// Authenticated calls go through the BFF proxy (JWT injected from httpOnly cookie).
const BASE_URL = API_BASE;

const formatDueDate = (value) => {
  const dueDate = value ? new Date(value) : null;
  if (!dueDate || Number.isNaN(dueDate.getTime())) return "No due date";

  const today = new Date();
  if (dueDate.toDateString() === today.toDateString()) return "11:59 PM, Today";

  return dueDate.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const normalizeAssignment = (assignment) => {
  const status = assignment.assignmentStatus || "assigned";
  return {
    id: assignment._id,
    course: assignment.title || assignment.course?.title || "Assignment",
    subject: assignment.course?.title || assignment.course?.name || "General",
    status,
    dueDate: assignment.dueDate,
    instructor: assignment.teacher?.name || "Instructor not assigned",
    feedback: assignment.feedback,
    rating: assignment.rating,
    submissionUrl: Array.isArray(assignment.submissionUrl)
      ? assignment.submissionUrl[0]
      : assignment.submissionUrl,
    isOverdue: assignment.isOverdue || status === "overdue",
  };
};

export default function StudentAssignmentsPage() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");

  const loadAssignments = async () => {
    setLoading(true);
    setError("");

    try {
      const token = getWebsiteToken();
      const response = await fetch(`${BASE_URL}/v1/assignment/student`, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Failed to fetch student assignments");
      }

      const list = Array.isArray(data.data?.all)
        ? data.data.all
        : Array.isArray(data.data)
          ? data.data
          : [];
      setAssignments(list.map(normalizeAssignment));
    } catch (err) {
      setError(err.message || "Failed to fetch student assignments");
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignments();
  }, []);

  const filteredAssignments = useMemo(() => {
    return assignments
      .filter((assignment) => {
        const search = searchTerm.toLowerCase();
        return (
          assignment.course.toLowerCase().includes(search) ||
          assignment.subject.toLowerCase().includes(search) ||
          assignment.instructor.toLowerCase().includes(search)
        );
      })
      .sort((a, b) => {
        const aDate = new Date(a.dueDate).getTime() || 0;
        const bDate = new Date(b.dueDate).getTime() || 0;
        return sortOrder === "asc" ? aDate - bDate : bDate - aDate;
      });
  }, [assignments, searchTerm, sortOrder]);

  const completed = assignments.filter((item) => ["pending", "reviewed", "submitted"].includes(item.status)).length;
  const pending = assignments.length - completed;

  return (
    <StudentShell
      title="Assignments"
      description="Dashboard-style assignment tracking, now protected inside the website student portal."
    >
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <p className="font-semibold">Error</p>
          <p>{error}</p>
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
        {[
          ["Total Assignments", assignments.length],
          ["Pending Assignments", pending],
          ["Completed Assignments", completed],
        ].map(([label, value]) => (
          <div key={label} className="flex flex-col items-start rounded-xl bg-[#F4E7FD] px-7 py-5">
            <div className="mb-1 text-xs font-medium text-[#7d7d7d]">{label}</div>
            <div className="text-2xl font-bold text-black">{value}</div>
          </div>
        ))}
      </div>

      <div className="relative mb-6 flex w-full flex-col items-center justify-between gap-2 rounded-lg p-3 sm:flex-row">
        <IoSearch className="absolute left-6 top-1/2 -translate-y-1/2 text-lg text-gray-500" />
        <input
          type="text"
          placeholder="Search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="w-full rounded-full border border-gray-300 bg-white px-10 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-[#c2c1c3] sm:w-72"
        />
        <button
          onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          className="flex items-center justify-between px-3 py-2 text-base transition"
          type="button"
        >
          <RiFilter3Line className="h-5 w-5 text-gray-500" />
          <LuArrowDownUp className="ml-2 h-5 w-5 text-gray-500" />
        </button>
      </div>

      <section className="space-y-4">
        {loading ? (
          <div className="rounded-2xl bg-white p-10 text-center text-gray-500">Loading assignments...</div>
        ) : filteredAssignments.length > 0 ? (
          filteredAssignments.map((assignment) => {
            const done = ["pending", "reviewed", "submitted"].includes(assignment.status);
            return (
              <div
                key={assignment.id}
                className="flex flex-col justify-between gap-4 rounded-2xl border border-[#ECEAEC] bg-white px-5 py-4 sm:flex-row sm:items-center sm:gap-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${done ? "bg-[#36A37E]" : "bg-[#FF6F61]"}`}>
                      <RiPenNibFill className="text-white" />
                    </span>
                    <span className="text-lg font-semibold text-[#111827]">
                      {done ? "Assignment Completed" : "Assignment Due"}
                    </span>
                  </div>
                  <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#DDF4FA] px-4 py-1 text-base font-normal text-black">
                    {assignment.subject}
                  </span>
                  <div className="mb-1 mt-2 text-base font-bold text-black">{assignment.course}</div>
                  <div className="truncate text-sm text-black/40">by {assignment.instructor}</div>
                  {assignment.feedback ? <p className="mt-2 text-sm text-gray-500">Feedback: {assignment.feedback}</p> : null}
                </div>

                <div className="flex min-w-[130px] flex-shrink-0 flex-col items-end">
                  <span className="mb-2 whitespace-nowrap text-xs text-black/40">
                    {assignment.isOverdue && !done ? "Overdue" : formatDueDate(assignment.dueDate)}
                  </span>
                  {!done ? (
                    <Link
                      href={`/student/upload?assignmentId=${encodeURIComponent(assignment.id)}&title=${encodeURIComponent(assignment.course)}`}
                      className="rounded-full bg-[#262626] px-5 py-1 text-sm text-white transition hover:bg-black"
                    >
                      Upload
                    </Link>
                  ) : assignment.submissionUrl ? (
                    <a
                      href={assignment.submissionUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-black bg-transparent px-5 py-1 text-sm font-bold text-black transition hover:bg-[#f5f5f5]"
                    >
                      View
                    </a>
                  ) : (
                    <span className="rounded-full border border-black/10 px-5 py-1 text-sm text-black/50">Submitted</span>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white py-12 text-center">
            <p className="mb-2 text-lg text-gray-500">No assignments found</p>
            <p className="text-sm text-gray-400">
              {searchTerm ? "Try adjusting your search" : "You do not have any assignments yet"}
            </p>
          </div>
        )}
      </section>
    </StudentShell>
  );
}
