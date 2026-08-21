"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSelector } from "react-redux";
import {
  HiCalendar,
  HiClock,
  HiExternalLink,
  HiLocationMarker,
  HiRefresh,
  HiUser,
  HiVideoCamera,
} from "react-icons/hi";
import StudentShell from "@/components/student/StudentShell";
import { getWebsiteToken } from "@/lib/authSession";
import { API_BASE } from "@/lib/apiBase";

const STATUS_STYLES = {
  Booked: "bg-sky-50 text-sky-700",
  Attended: "bg-emerald-50 text-emerald-700",
  Missed: "bg-rose-50 text-rose-600",
  Rescheduled: "bg-amber-50 text-amber-700",
  Cancelled: "bg-slate-100 text-slate-500",
};

const formatDate = (value) => {
  if (!value) return "Date to be confirmed";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date to be confirmed";
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getSlotDate = (booking) => {
  const raw = booking?.slotId?.date;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getInstructorName = (booking) => {
  const name = booking?.teacherId?.userId?.name;
  const full = `${name?.firstName || ""} ${name?.lastName || ""}`.trim();
  return full || "Instructor";
};

const getBranch = (booking) => booking?.branchId || booking?.slotId?.branchId || null;

const isOffline = (booking) =>
  String(booking?.deliveryMode || booking?.courseId?.mode || "online").toLowerCase() ===
  "offline";

const DemoCard = ({ booking, past }) => {
  const branch = getBranch(booking);
  const offline = isOffline(booking);
  const link = booking?.meetingLink || "";
  const cityName = branch?.city?.cityName || "";

  return (
    <article className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm transition hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold text-slate-950">
            {booking?.courseId?.name || "Demo class"}
          </h3>
          <p className="mt-1 text-sm capitalize text-slate-500">
            {offline ? "In-person demo" : "Online demo"}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            STATUS_STYLES[booking?.demoStatus] || "bg-slate-100 text-slate-600"
          }`}
        >
          {booking?.demoStatus || "Booked"}
        </span>
      </div>

      <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
        <p className="flex items-center gap-2">
          <HiCalendar className="h-4 w-4 text-orange-500" />
          {formatDate(booking?.slotId?.date)}
        </p>
        <p className="flex items-center gap-2">
          <HiClock className="h-4 w-4 text-orange-500" />
          {booking?.slotId?.startTime || "?"} – {booking?.slotId?.endTime || "?"}
        </p>
        <p className="flex items-center gap-2">
          <HiUser className="h-4 w-4 text-orange-500" />
          {getInstructorName(booking)}
        </p>
        {offline && branch ? (
          <p className="flex items-start gap-2">
            <HiLocationMarker className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
            <span>
              {branch.branchName}
              {cityName ? `, ${cityName}` : ""}
              {branch.location ? <span className="block text-xs text-slate-500">{branch.location}</span> : null}
            </span>
          </p>
        ) : null}
      </div>

      {offline ? null : (
        <div className="mt-5 border-t border-stone-100 pt-4">
          {link ? (
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700"
            >
              <HiExternalLink className="h-4 w-4" />
              {past ? "Open class link" : "Join demo class"}
            </a>
          ) : (
            <p className="text-sm text-slate-500">
              {past
                ? "No class link was shared for this session."
                : "Your instructor will share the join link before the class. You'll get it by email too."}
            </p>
          )}
        </div>
      )}
    </article>
  );
};

export default function StudentDemoClassesPage() {
  const authToken = useSelector((state) => state.auth?.token);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sessionExpired, setSessionExpired] = useState(false);
  const [tab, setTab] = useState("upcoming");

  const fetchBookings = async () => {
    setLoading(true);
    setError("");
    setSessionExpired(false);
    try {
      const token = authToken || getWebsiteToken();
      const res = await fetch(`${API_BASE}/v1/demoBookings/my`, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.status === 401 || res.status === 403) {
        setSessionExpired(true);
        throw new Error("Your session has expired — please log in again.");
      }
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.message || "Failed to load your demo classes.");
      }
      setBookings(Array.isArray(data.bookings) ? data.bookings : []);
    } catch (err) {
      setError(err.message || "Unable to load your demo classes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const { upcoming, past } = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const upcomingList = [];
    const pastList = [];

    bookings.forEach((booking) => {
      const date = getSlotDate(booking);
      const cancelled = booking?.demoStatus === "Cancelled";
      if (!cancelled && date && date >= startOfToday) upcomingList.push(booking);
      else pastList.push(booking);
    });

    upcomingList.sort((a, b) => (getSlotDate(a)?.getTime() || 0) - (getSlotDate(b)?.getTime() || 0));
    pastList.sort((a, b) => (getSlotDate(b)?.getTime() || 0) - (getSlotDate(a)?.getTime() || 0));

    return { upcoming: upcomingList, past: pastList };
  }, [bookings]);

  const visible = tab === "upcoming" ? upcoming : past;

  return (
    <StudentShell
      title="My Demo Classes"
      description="Your booked demo sessions, join links, and past demo history."
    >
      {loading ? (
        <div className="mt-6 grid gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-[2rem] bg-white shadow-sm" />
          ))}
        </div>
      ) : error ? (
        <div className="mt-6 rounded-[2rem] border border-red-100 bg-red-50 p-6 text-red-700">
          <p className="font-semibold">Unable to load your demo classes</p>
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
              onClick={fetchBookings}
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
            >
              <HiRefresh className="h-4 w-4" /> Retry
            </button>
          )}
        </div>
      ) : (
        <div className="mt-2">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-full border border-stone-200 bg-white p-1">
              {[
                { key: "upcoming", label: `Upcoming (${upcoming.length})` },
                { key: "past", label: `Past (${past.length})` },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTab(item.key)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    tab === item.key
                      ? "bg-orange-600 text-white"
                      : "text-slate-600 hover:text-orange-600"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={fetchBookings}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-stone-50 disabled:opacity-60"
            >
              <HiRefresh className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>

          {visible.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-orange-200 bg-white p-8 text-center shadow-sm">
              <HiVideoCamera className="mx-auto h-10 w-10 text-orange-400" />
              <h2 className="mt-4 text-lg font-bold text-slate-950">
                {tab === "upcoming" ? "No upcoming demo classes" : "No past demo classes"}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {tab === "upcoming"
                  ? "Book a free demo from any course page to try a class before enrolling."
                  : "Your completed demo sessions will be listed here."}
              </p>
              {tab === "upcoming" ? (
                <Link
                  href="/courses"
                  className="mt-5 inline-flex items-center justify-center rounded-full bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700"
                >
                  Browse Courses
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {visible.map((booking) => (
                <DemoCard key={booking._id} booking={booking} past={tab === "past"} />
              ))}
            </div>
          )}
        </div>
      )}
    </StudentShell>
  );
}
