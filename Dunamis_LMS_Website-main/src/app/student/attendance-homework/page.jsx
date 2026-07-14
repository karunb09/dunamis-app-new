"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { IoSearch } from "react-icons/io5";
import { LuArrowDownUp } from "react-icons/lu";
import { MdOutlineLibraryBooks } from "react-icons/md";
import { RiFilter3Line, RiPenNibFill } from "react-icons/ri";
import { HiBookOpen, HiRefresh, HiOutlineCalendar } from "react-icons/hi";
import { useSelector } from "react-redux";
import StudentShell from "@/components/student/StudentShell";
import { getWebsiteToken } from "@/lib/authSession";
import { API_BASE } from "@/lib/apiBase";

const formatDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const contentPath = (item) =>
  [item.module, item.lesson, item.topic].filter(Boolean).join(" › ");

const AttendancePill = ({ status }) => {
  const present = String(status || "").toLowerCase() === "present";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
        present ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {present ? "Present" : "Absent"}
    </span>
  );
};

export default function StudentAttendanceHomeworkPage() {
  const authToken = useSelector((state) => state.auth?.token);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sessionExpired, setSessionExpired] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortDesc, setSortDesc] = useState(false);

  const fetchRecords = async () => {
    setLoading(true);
    setError("");
    setSessionExpired(false);
    try {
      const token = authToken || getWebsiteToken();
      const res = await fetch(`${API_BASE}/v1/attendance-homework/student/homework`, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.status === 401 || res.status === 403) {
        setSessionExpired(true);
        throw new Error("Your session has expired — please log in again.");
      }
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.message || "Failed to load your class records.");
      setRecords(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      setError(err.message || "Unable to load your class records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRecords(); }, []);

  const courseGroups = useMemo(() => {
    const map = {};
    for (const record of records) {
      const name = record.courseName || "Unknown Course";
      if (!map[name]) map[name] = [];
      map[name].push(record);
    }
    return Object.entries(map).map(([name, items]) => {
      const present = items.filter(
        (r) => String(r.attendanceStatus || "").toLowerCase() === "present"
      ).length;
      const homeworkCount = items.filter(
        (r) => r.homework && r.homework !== "No homework assigned"
      ).length;
      return {
        name,
        classCount: items.length,
        present,
        presentRate: items.length ? Math.round((present / items.length) * 100) : 0,
        homeworkCount,
      };
    });
  }, [records]);

  const courseRecords = useMemo(() => {
    if (!selectedCourse) return [];
    const list = records.filter(
      (r) => (r.courseName || "Unknown Course") === selectedCourse
    );
    const q = searchTerm.toLowerCase();
    const filtered = q
      ? list.filter((item) =>
          [item.homework, item.module, item.lesson, item.topic]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q)
        )
      : list;
    return sortDesc ? [...filtered].reverse() : filtered;
  }, [records, selectedCourse, searchTerm, sortDesc]);

  return (
    <StudentShell
      title="Attendance & Homework"
      description="Class-by-class record of your attendance, homework, and what was covered."
    >
      {loading ? (
        <div className="mt-6 grid gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-[2rem] bg-white shadow-sm" />
          ))}
        </div>
      ) : error ? (
        <div className="mt-6 rounded-[2rem] border border-red-100 bg-red-50 p-6 text-red-700">
          <p className="font-semibold">Unable to load your class records</p>
          <p className="mt-2 text-sm">{error}</p>
          {sessionExpired ? (
            <Link
              href="/login"
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
            >
              Log in again
            </Link>
          ) : (
            <button
              type="button"
              onClick={fetchRecords}
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
            >
              <HiRefresh className="h-4 w-4" /> Retry
            </button>
          )}
        </div>
      ) : !selectedCourse ? (
        <div className="bg-[#fafafa] px-6 py-6 md:px-4">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[12px] text-black/60 md:text-sm">
              Select a course to see your class records
            </p>
            <button
              type="button"
              onClick={fetchRecords}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-stone-50 disabled:opacity-60"
            >
              <HiRefresh className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>

          {courseGroups.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-orange-200 bg-white p-8 text-center shadow-sm">
              <HiBookOpen className="mx-auto h-10 w-10 text-orange-400" />
              <h2 className="mt-4 text-lg font-bold text-slate-950">No classes recorded yet</h2>
              <p className="mt-2 text-sm text-slate-500">
                Once your instructor records a class, your attendance and homework appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {courseGroups.map((course) => (
                <button
                  key={course.name}
                  type="button"
                  onClick={() => setSelectedCourse(course.name)}
                  className="group flex w-full items-center gap-4 rounded-2xl border border-[#EDECF9] bg-white p-5 text-left shadow-sm transition hover:shadow-md"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#21305D] text-white">
                    <MdOutlineLibraryBooks className="h-6 w-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-semibold text-gray-900">{course.name}</div>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
                      <span>{course.classCount} class{course.classCount !== 1 ? "es" : ""}</span>
                      <span className="text-emerald-600">{course.presentRate}% attendance</span>
                      <span>{course.homeworkCount} homework</span>
                    </div>
                  </div>
                  <span className="text-gray-400">›</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <main className="bg-[#fafafa] px-6 py-6 md:px-4">
          <button
            type="button"
            onClick={() => { setSelectedCourse(null); setSearchTerm(""); }}
            className="mb-5 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            ← Back to courses
          </button>

          <div className="relative mb-6 flex w-full flex-col items-center justify-between gap-2 sm:flex-row">
            <div className="relative w-full sm:w-72">
              <IoSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-lg text-gray-500" />
              <input
                type="text"
                placeholder="Search homework or topic"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-full border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm transition focus:outline-none focus:ring-2 focus:ring-[#c2c1c3]"
              />
            </div>
            <button
              type="button"
              onClick={() => setSortDesc((v) => !v)}
              className="flex items-center gap-2 px-3 py-2 text-base transition"
            >
              <RiFilter3Line className="h-5 w-5 text-gray-500" />
              <LuArrowDownUp className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {courseRecords.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-stone-200 bg-white p-8 text-center shadow-sm">
              <p className="text-sm text-slate-500">
                {searchTerm ? "No records match your search." : "No classes recorded yet for this course."}
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {courseRecords.map((item) => (
                <div key={item._id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#21305D] text-white">
                        <RiPenNibFill className="text-lg" />
                      </span>
                      <div>
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-black">
                          <HiOutlineCalendar className="h-4 w-4 text-gray-400" />
                          {formatDate(item.date)}
                        </span>
                        {item.categoryName && (
                          <span className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                            <MdOutlineLibraryBooks className="h-3 w-3" />
                            {item.categoryName}
                          </span>
                        )}
                      </div>
                    </div>
                    <AttendancePill status={item.attendanceStatus} />
                  </div>

                  {contentPath(item) && (
                    <p className="mb-2 text-xs font-medium text-orange-600">{contentPath(item)}</p>
                  )}
                  <p className="text-sm text-gray-700">
                    {item.homework && item.homework !== "No homework assigned"
                      ? item.homework
                      : "No homework for this class."}
                  </p>
                </div>
              ))}
            </div>
          )}
        </main>
      )}
    </StudentShell>
  );
}
