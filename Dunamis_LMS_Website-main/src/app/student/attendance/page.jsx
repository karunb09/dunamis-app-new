"use client";

import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { HiRefresh, HiCheckCircle, HiXCircle, HiCalendar } from "react-icons/hi";
import { MdOutlineLibraryBooks } from "react-icons/md";
import StudentShell from "@/components/student/StudentShell";
import { getWebsiteToken } from "@/lib/authSession";
import { API_BASE } from "@/lib/apiBase";

const formatDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const StatTile = ({ label, value, accent }) => (
  <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
    <p className={`mt-2 text-3xl font-bold ${accent || "text-slate-950"}`}>{value}</p>
  </div>
);

export default function StudentAttendancePage() {
  const authToken = useSelector((state) => state.auth?.token);
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({ total: 0, present: 0, absent: 0, attendanceRate: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("All");

  const fetchAttendance = async () => {
    setLoading(true);
    setError("");
    try {
      const token = authToken || getWebsiteToken();
      const res = await fetch(`${API_BASE}/v1/attendance-homework/student/attendance`, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.message || "Failed to load attendance.");
      setRecords(Array.isArray(data.data) ? data.data : []);
      setSummary(data.summary || { total: 0, present: 0, absent: 0, attendanceRate: 0 });
    } catch (err) {
      setError(err.message || "Unable to load attendance.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAttendance(); }, []);

  const courses = useMemo(() => {
    const names = new Set(records.map((r) => r.courseName || "Unknown Course"));
    return ["All", ...Array.from(names)];
  }, [records]);

  const visibleRecords = useMemo(() => {
    if (selectedCourse === "All") return records;
    return records.filter((r) => (r.courseName || "Unknown Course") === selectedCourse);
  }, [records, selectedCourse]);

  return (
    <StudentShell
      title="Attendance"
      description="Track your class attendance recorded by your instructors across all courses."
    >
      {loading ? (
        <div className="mt-6 grid gap-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-white shadow-sm" />
            ))}
          </div>
          {[0, 1].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-white shadow-sm" />
          ))}
        </div>
      ) : error ? (
        <div className="mt-6 rounded-[2rem] border border-red-100 bg-red-50 p-6 text-red-700">
          <p className="font-semibold">Unable to load attendance</p>
          <p className="mt-2 text-sm">{error}</p>
          <button
            type="button"
            onClick={fetchAttendance}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
          >
            <HiRefresh className="h-4 w-4" /> Retry
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary tiles */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatTile label="Total Classes" value={summary.total} />
            <StatTile label="Present" value={summary.present} accent="text-emerald-600" />
            <StatTile label="Absent" value={summary.absent} accent="text-rose-500" />
            <StatTile label="Attendance" value={`${summary.attendanceRate}%`} accent="text-orange-600" />
          </div>

          {/* Course filter + refresh */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {courses.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setSelectedCourse(name)}
                  className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                    selectedCourse === name
                      ? "border-orange-500 bg-orange-50 text-orange-700"
                      : "border-stone-200 bg-white text-slate-600 hover:bg-stone-50"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={fetchAttendance}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-stone-50 disabled:opacity-60"
            >
              <HiRefresh className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>

          {/* Records */}
          {visibleRecords.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-orange-200 bg-white p-8 text-center shadow-sm">
              <HiCalendar className="mx-auto h-10 w-10 text-orange-400" />
              <h2 className="mt-4 text-lg font-bold text-slate-950">No attendance yet</h2>
              <p className="mt-2 text-sm text-slate-500">
                Attendance marked by your instructor will appear here after each class.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
              <ul className="divide-y divide-stone-100">
                {visibleRecords.map((r) => {
                  const present = r.attendanceStatus === "Present";
                  return (
                    <li key={r._id} className="flex items-center justify-between gap-4 px-5 py-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#21305D] text-white">
                          <MdOutlineLibraryBooks className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{r.courseName}</p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span>{formatDate(r.date)}</span>
                            {r.sessionType && (
                              <span className="capitalize">· {r.sessionType === "premium" ? "1:1" : "Group"}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                          present
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-600"
                        }`}
                      >
                        {present ? <HiCheckCircle className="h-4 w-4" /> : <HiXCircle className="h-4 w-4" />}
                        {r.attendanceStatus}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </StudentShell>
  );
}
