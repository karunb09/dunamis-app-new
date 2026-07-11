"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { HiAcademicCap, HiBell, HiCalendar, HiCheck, HiClipboardList, HiHome, HiLogout, HiTrash, HiTrendingUp, HiUpload, HiUserCircle } from "react-icons/hi";
import {
  clearUserDashboardNotices,
  deleteUserDashboardNotice,
  getUserDashboardNotices,
  logoutSession,
  markAllUserDashboardNoticesRead,
  markUserDashboardNoticeRead,
} from "@/store/authSlice";

const navItems = [
  { label: "Overview", href: "/student", icon: HiHome },
  { label: "My Courses", href: "/student/my-courses", icon: HiAcademicCap },
  { label: "Assignments", href: "/student/assignments", icon: HiClipboardList },
  { label: "Homework", href: "/student/homework", icon: HiUpload },
  { label: "Attendance", href: "/student/attendance", icon: HiCalendar },
  { label: "Performance", href: "/student/performance", icon: HiTrendingUp },
  { label: "Profile", href: "/student/profile", icon: HiUserCircle },
];

const getDisplayName = (user) => {
  const name = user?.name;
  if (typeof name === "string") return name;

  const firstName = name?.firstName || user?.firstName || "";
  const lastName = name?.lastName || user?.lastName || "";
  return `${firstName} ${lastName}`.trim() || "Student";
};

const formatNoticeDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
};

export default function StudentShell({ children, title, description }) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();
  const notificationMenuRef = useRef(null);
  const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false);
  const user = useSelector((state) => state.auth?.user);
  const { notices = [], noticesLoading = false } = useSelector((state) => state.auth || {});

  const dashboardNotifications = useMemo(
    () =>
      (Array.isArray(notices) ? notices : []).map((notice) => ({
        id: notice._id || notice.id,
        title: notice.title || "Notification",
        message: notice.message || "",
        isRead: Boolean(notice.isRead),
        createdAt: notice.createdAt,
      })),
    [notices]
  );
  const unreadCount = dashboardNotifications.filter((notice) => !notice.isRead).length;

  useEffect(() => {
    if (user?.accountType === "student") {
      dispatch(getUserDashboardNotices());
    }
  }, [dispatch, user?.accountType]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!notificationMenuRef.current?.contains(event.target)) {
        setIsNotificationMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsNotificationMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    setIsNotificationMenuOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    dispatch(logoutSession());
    router.replace("/login?portal=student");
  };

  const handleMarkNoticeRead = async (noticeId) => {
    if (!noticeId) return;

    try {
      await dispatch(markUserDashboardNoticeRead(noticeId)).unwrap();
    } catch (error) {
      toast.error(error || "Failed to mark notification as read");
    }
  };

  const handleDeleteNotice = async (noticeId) => {
    if (!noticeId) return;

    try {
      await dispatch(deleteUserDashboardNotice(noticeId)).unwrap();
      toast.success("Notification removed");
    } catch (error) {
      toast.error(error || "Failed to remove notification");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await dispatch(markAllUserDashboardNoticesRead()).unwrap();
      toast.success("Notifications marked as read");
    } catch (error) {
      toast.error(error || "Failed to mark notifications as read");
    }
  };

  const handleClearAll = async () => {
    try {
      await dispatch(clearUserDashboardNotices()).unwrap();
      toast.success("Notifications cleared");
    } catch (error) {
      toast.error(error || "Failed to clear notifications");
    }
  };

  return (
    <div className="bg-[#fffaf4] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-[2rem] border border-orange-100 bg-white p-4 shadow-sm lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-[1.5rem] bg-gradient-to-br from-orange-500 to-orange-600 p-5 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">
              Student Portal
            </p>
            <h2 className="mt-3 text-2xl font-bold">{getDisplayName(user)}</h2>
            <p className="mt-1 text-sm text-white/80">{user?.email || "Learning dashboard"}</p>
          </div>

          <nav className="mt-4 grid gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    active
                      ? "bg-orange-50 text-orange-700"
                      : "text-slate-600 hover:bg-stone-50 hover:text-slate-950"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-stone-300 hover:bg-stone-50"
          >
            <HiLogout className="h-5 w-5" />
            Sign out
          </button>
        </aside>

        <section className="min-w-0">
          <div className="mb-6 rounded-[2rem] border border-orange-100 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-500">
                  Dunamis Learning
                </p>
                <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                  {title}
                </h1>
                {description ? (
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
                ) : null}
              </div>

              <div className="relative flex-shrink-0" ref={notificationMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsNotificationMenuOpen((open) => !open)}
                  className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50 text-orange-600 transition hover:border-orange-200 hover:bg-orange-100"
                  aria-label="Notifications"
                >
                  <HiBell className="h-6 w-6" />
                  {unreadCount > 0 ? (
                    <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  ) : null}
                </button>

                {isNotificationMenuOpen ? (
                  <div className="absolute right-0 top-full z-30 mt-3 w-[calc(100vw-2rem)] max-w-[360px] overflow-hidden rounded-3xl border border-orange-100 bg-white p-2 shadow-[0_24px_70px_-36px_rgba(15,23,42,0.55)]">
                    <div className="border-b border-slate-100 px-3 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-950">Notifications</p>
                        {dashboardNotifications.length ? (
                          <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
                            {unreadCount} unread
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Updates and announcements from Dunamis.
                      </p>
                      {dashboardNotifications.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={handleMarkAllRead}
                            disabled={unreadCount === 0}
                            className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Mark all read
                          </button>
                          <button
                            type="button"
                            onClick={handleClearAll}
                            className="rounded-full border border-rose-100 px-3 py-1 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-50"
                          >
                            Clear all
                          </button>
                        </div>
                      ) : null}
                    </div>

                    <div className="max-h-[360px] overflow-y-auto py-2">
                      {noticesLoading && !dashboardNotifications.length ? (
                        <div className="px-3 py-6 text-center text-sm text-slate-500">
                          Loading notifications...
                        </div>
                      ) : dashboardNotifications.length === 0 ? (
                        <div className="px-3 py-6 text-center text-sm text-slate-500">
                          No notifications right now.
                        </div>
                      ) : (
                        dashboardNotifications.map((notice) => (
                          <div
                            key={notice.id}
                            className={`rounded-2xl px-3 py-3 ${
                              notice.isRead ? "bg-white" : "bg-orange-50/70"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <span className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                                <HiBell className="h-4 w-4" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="truncate text-sm font-semibold text-slate-950">
                                    {notice.title}
                                  </p>
                                  {notice.createdAt ? (
                                    <span className="flex-shrink-0 text-[11px] text-slate-400">
                                      {formatNoticeDate(notice.createdAt)}
                                    </span>
                                  ) : null}
                                </div>
                                {notice.message ? (
                                  <p className="mt-1 line-clamp-3 text-xs leading-5 text-slate-500">
                                    {notice.message}
                                  </p>
                                ) : null}
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {!notice.isRead ? (
                                    <button
                                      type="button"
                                      onClick={() => handleMarkNoticeRead(notice.id)}
                                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-white"
                                    >
                                      <HiCheck className="h-3 w-3" />
                                      Mark read
                                    </button>
                                  ) : null}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteNotice(notice.id)}
                                    className="inline-flex items-center gap-1 rounded-full border border-rose-100 px-2 py-1 text-[11px] font-semibold text-rose-600 transition hover:bg-white"
                                  >
                                    <HiTrash className="h-3 w-3" />
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {children}
        </section>
      </div>
    </div>
  );
}
