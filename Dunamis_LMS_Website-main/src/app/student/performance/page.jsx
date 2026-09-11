"use client";

import { useEffect, useState } from "react";
import { HiChartBar } from "react-icons/hi";
import StudentShell from "@/components/student/StudentShell";
import { getWebsiteToken } from "@/lib/authSession";
import { API_BASE } from "@/lib/apiBase";

// Authenticated calls go through the BFF proxy (JWT injected from httpOnly cookie).
const BASE_URL = API_BASE;

const RATINGS = [
  ["Homework", "homework"],
  ["Practice", "practice"],
  ["Learning speed", "learningSpeed"],
  ["Performance", "performanceSkills"],
];

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

const Bar = ({ value, max, tone = "bg-orange-500" }) => (
  <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
    <div className={`h-full rounded-full ${tone}`} style={{ width: `${max ? Math.min(100, (value / max) * 100) : 0}%` }} />
  </div>
);

export default function StudentPerformancePage() {
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const token = getWebsiteToken();
        const response = await fetch(`${BASE_URL}/v1/student/me/dashboard`, {
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await response.json();
        if (!response.ok || data.success === false) {
          throw new Error(data.message || "Unable to load your performance.");
        }
        setPerformance(data.performance);
      } catch (err) {
        setError(err.message || "Unable to load your performance.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const attendance = performance?.attendance;
  const assessments = performance?.assessments || [];
  const assignments = performance?.assignments;
  const hasAnything = attendance?.total || assessments.length || assignments?.reviewed;

  return (
    <StudentShell
      title="My Performance"
      description="Your attendance, instructor assessments and assignment ratings, all from what your instructors have recorded."
    >
      {error ? (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      {loading ? (
        <div className="h-64 animate-pulse rounded-[2rem] bg-white" />
      ) : !hasAnything ? (
        <div className="rounded-[2rem] border border-orange-100 bg-white p-10 text-center">
          <HiChartBar className="mx-auto h-8 w-8 text-orange-400" />
          <h2 className="mt-3 text-lg font-bold text-slate-950">Nothing recorded yet</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
            Your performance builds up here as your instructor marks attendance, reviews assignments and completes your assessments.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Summary label="Attendance" value={attendance?.rate != null ? `${attendance.rate}%` : "—"} hint={`${attendance?.present || 0} of ${attendance?.total || 0} classes`} />
            <Summary
              label="Latest assessment"
              value={assessments.length ? `${assessments[assessments.length - 1].totalScore ?? "—"}/20` : "—"}
              hint={assessments.length ? formatDate(assessments[assessments.length - 1].assessedOn) : "not assessed yet"}
            />
            <Summary
              label="Assignment rating"
              value={assignments?.averageRating != null ? `${assignments.averageRating}/5` : "—"}
              hint={`${assignments?.reviewed || 0} reviewed`}
            />
          </div>

          {attendance?.byCourse?.length ? (
            <Panel title="Attendance by course">
              <div className="space-y-4">
                {attendance.byCourse.map((row) => (
                  <div key={row.courseName}>
                    <div className="mb-1.5 flex justify-between text-sm">
                      <span className="font-semibold text-slate-800">{row.courseName}</span>
                      <span className="text-slate-500">
                        {row.present}/{row.total} · {row.rate ?? 0}%
                      </span>
                    </div>
                    <Bar value={row.present} max={row.total} tone={row.rate >= 75 ? "bg-emerald-500" : "bg-amber-500"} />
                  </div>
                ))}
              </div>
            </Panel>
          ) : null}

          {assessments.length ? (
            <Panel title="Assessments over time">
              <div className="space-y-5">
                {assessments.map((a) => (
                  <div key={a._id} className="rounded-2xl border border-stone-100 p-4">
                    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-semibold text-slate-900">{a.courseName}</p>
                      <p className="text-sm text-slate-500">
                        {formatDate(a.assessedOn)} · <span className="font-bold text-orange-600">{a.totalScore ?? "—"}/20</span>
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {RATINGS.map(([label, key]) => (
                        <div key={key}>
                          <div className="mb-1 flex justify-between text-xs text-slate-500">
                            <span>{label}</span>
                            <span>{a[key] ?? "—"}/5</span>
                          </div>
                          <Bar value={a[key] || 0} max={5} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          ) : null}
        </div>
      )}
    </StudentShell>
  );
}

const Summary = ({ label, value, hint }) => (
  <div className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm">
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
    <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
    <p className="mt-1 text-xs text-slate-500">{hint}</p>
  </div>
);

const Panel = ({ title, children }) => (
  <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
    <h2 className="mb-5 text-base font-bold text-slate-950">{title}</h2>
    {children}
  </div>
);
