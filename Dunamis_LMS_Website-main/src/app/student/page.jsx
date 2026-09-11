"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  HiArrowRight,
  HiBadgeCheck,
  HiBookOpen,
  HiClipboardCheck,
  HiClipboardList,
  HiTrendingUp,
  HiVideoCamera,
} from "react-icons/hi";
import StudentShell from "@/components/student/StudentShell";
import { getWebsiteToken } from "@/lib/authSession";
import { API_BASE } from "@/lib/apiBase";

// Authenticated calls go through the BFF proxy (JWT injected from httpOnly cookie).
const BASE_URL = API_BASE;

const classDay = (value) => {
  if (!value) return "";
  const date = new Date(value);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return date.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });
};

const shortDate = (value) =>
  value ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "";

export default function StudentHomePage() {
  const [dashboard, setDashboard] = useState(null);
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
          throw new Error(data.message || "Unable to load your dashboard.");
        }
        setDashboard(data);
      } catch (err) {
        setError(err.message || "Unable to load your dashboard.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const next = dashboard?.nextClass;
  const performance = dashboard?.performance;
  const latestAssessment = performance?.assessments?.[performance.assessments.length - 1];

  return (
    <StudentShell title="Student Dashboard" description="Your next class, what is due, and how you are progressing.">
      {error ? (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      {/* Join the Class — the thing a learner opens the portal for, so it leads. */}
      <div className="rounded-[2rem] bg-gradient-to-br from-orange-500 to-orange-600 p-6 text-white shadow-lg sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">Next class</p>
            {loading ? (
              <div className="mt-3 h-8 w-64 animate-pulse rounded-xl bg-white/20" />
            ) : next ? (
              <>
                <h2 className="mt-2 truncate text-2xl font-bold sm:text-3xl">{next.courseName}</h2>
                <p className="mt-1 text-sm text-white/85">
                  {classDay(next.date)} · {next.startTime}–{next.endTime} · {next.instructorName}
                </p>
              </>
            ) : (
              <>
                <h2 className="mt-2 text-2xl font-bold">No class scheduled</h2>
                <p className="mt-1 text-sm text-white/85">Your upcoming classes will show here.</p>
              </>
            )}
          </div>
          {next?.meetingLink ? (
            <a
              href={next.meetingLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-base font-bold text-orange-600 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <HiVideoCamera className="h-6 w-6" />
              Join the Class
            </a>
          ) : next ? (
            <p className="shrink-0 rounded-full bg-white/15 px-5 py-3 text-sm font-semibold">
              Join link appears before class
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card
          icon={HiBookOpen}
          label="Homework"
          href="/student/attendance-homework"
          loading={loading}
          body={
            dashboard?.latestHomework ? (
              <>
                <p className="text-sm font-semibold text-slate-900">{dashboard.latestHomework.homework}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {dashboard.latestHomework.courseName} · set {shortDate(dashboard.latestHomework.date)}
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-500">No homework set yet.</p>
            )
          }
        />

        <Card
          icon={HiClipboardList}
          label="Assignment"
          href="/student/assignments"
          loading={loading}
          body={
            dashboard?.openAssignment ? (
              <>
                <p className="text-sm font-semibold text-slate-900">{dashboard.openAssignment.title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {dashboard.openAssignment.courseName}
                  {dashboard.openAssignment.dueDate ? ` · due ${shortDate(dashboard.openAssignment.dueDate)}` : ""}
                </p>
                <Link
                  href={`/student/upload?assignmentId=${encodeURIComponent(dashboard.openAssignment._id)}&title=${encodeURIComponent(dashboard.openAssignment.title)}`}
                  className="mt-3 inline-flex rounded-full bg-orange-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-700"
                >
                  Submit video link
                </Link>
              </>
            ) : (
              <p className="text-sm text-slate-500">Nothing to submit right now.</p>
            )
          }
        />

        <Card
          icon={HiClipboardCheck}
          label="Assessment"
          href="/student/assessments"
          loading={loading}
          body={
            dashboard?.openAssessment ? (
              <>
                <p className="text-sm font-semibold text-slate-900">{dashboard.openAssessment.title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {dashboard.openAssessment.courseName} · waiting for your answers
                </p>
                <Link
                  href="/student/assessments"
                  className="mt-3 inline-flex rounded-full bg-orange-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-700"
                >
                  Answer now
                </Link>
              </>
            ) : (
              <p className="text-sm text-slate-500">Nothing to answer right now.</p>
            )
          }
        />

        <Card
          icon={HiTrendingUp}
          label="Performance"
          href="/student/performance"
          loading={loading}
          body={
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Attendance" value={performance?.attendance?.rate != null ? `${performance.attendance.rate}%` : "—"} />
              <Stat label="Last score" value={latestAssessment?.totalScore != null ? `${latestAssessment.totalScore}/20` : "—"} />
              <Stat
                label="Certificates"
                value={
                  <span className="inline-flex items-center gap-1">
                    {dashboard?.certificateCount ?? 0}
                    {dashboard?.certificateCount ? <HiBadgeCheck className="h-4 w-4 text-emerald-600" /> : null}
                  </span>
                }
              />
            </div>
          }
        />
      </div>
    </StudentShell>
  );
}

const Card = ({ icon: Icon, label, href, body, loading }) => (
  <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
          <Icon className="h-5 w-5" />
        </span>
        <h3 className="text-base font-bold text-slate-950">{label}</h3>
      </div>
      <Link href={href} className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700">
        View all <HiArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
    <div className="mt-4">{loading ? <div className="h-12 animate-pulse rounded-xl bg-stone-100" /> : body}</div>
  </div>
);

const Stat = ({ label, value }) => (
  <div className="rounded-2xl bg-stone-50 px-3 py-2">
    <p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p>
    <p className="text-sm font-bold text-slate-900">{value}</p>
  </div>
);
