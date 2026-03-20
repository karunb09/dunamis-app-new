import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FiBell,
  FiChevronDown,
  FiClock,
  FiLogOut,
  FiMenu,
  FiSettings,
} from "react-icons/fi";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import { getStoredUser } from "../../utils/authSession";
import { logoutUser } from "../../redux/authSlice";
import { getAllBookings } from "../../redux/DemoBooking/DemoBookingSlice";
import {
  getTeacherRoleId,
  getUserDisplayName,
  normalizeEntityId,
} from "../../utils/roleIdentity";

const IMAGE = import.meta.env.VITE_IMAGE;

const formatDateLabel = (value) => {
  if (!value) return "Date pending";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Date pending";

  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
};

const formatTimeLabel = (booking) => {
  const start = booking?.slotId?.startTime || booking?.slot?.startTime;
  const end = booking?.slotId?.endTime || booking?.slot?.endTime;
  if (!start && !end) return "Time pending";
  if (start && end) return `${start} - ${end}`;
  return start || end || "Time pending";
};

const getBookingDate = (booking) => {
  const rawDate = booking?.slotId?.date || booking?.slot?.date;
  if (!rawDate) return null;
  const date = new Date(rawDate);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getBookingStudentName = (booking) => {
  const guest = booking?.lead || {};
  const studentUser = booking?.studentId?.userId || booking?.student || {};
  const firstName = guest?.firstName || studentUser?.name?.firstName || "";
  const lastName = guest?.lastName || studentUser?.name?.lastName || "";
  const name = `${firstName} ${lastName}`.trim();
  return name || guest?.email || studentUser?.email || "Guest student";
};

const Navigation = ({ onMenuClick }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const profileMenuRef = useRef(null);
  const notificationMenuRef = useRef(null);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false);

  const user = getStoredUser() || {};
  const fullName = getUserDisplayName(user, "User");
  const accountType = user?.accountType || "guest";
  const teacherId = getTeacherRoleId(user);
  const { bookings = [] } = useSelector((state) => state.demoBookings || {});

  const profileImage = user?.image
    ? user.image.startsWith("http")
      ? user.image
      : `${IMAGE}${user.image}`
    : "https://i.pravatar.cc/300";

  const generateTitle = (path) => {
    const cleanPath = path.replace(/^\/|\/$/g, "").split("/");

    const rolePrefixes = ["admin", "teacher", "student"];
    const filteredPath = cleanPath.filter((segment, index) => {
      if (index === 0 && rolePrefixes.includes(segment.toLowerCase())) {
        return false;
      }

      if (/^[0-9a-f]{24}$/i.test(segment)) {
        return false;
      }

      if (
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          segment
        )
      ) {
        return false;
      }

      if (/^\d+$/.test(segment)) {
        return false;
      }

      return true;
    });

    const capitalizedTitle = filteredPath
      .map((segment) =>
        segment
          .replace(/-/g, " ")
          .replace(/_/g, " ")
          .replace(/\b\w/g, (char) => char.toUpperCase())
      )
      .join(" ");

    return capitalizedTitle || "Dashboard";
  };

  const title = generateTitle(location.pathname);
  const roleLabel =
    accountType === "superadmin"
      ? "Super Admin"
      : accountType === "admin"
        ? "Admin Workspace"
        : accountType === "teacher"
          ? "Teacher Workspace"
          : accountType === "student"
            ? "Student Workspace"
            : "Dashboard";

  const teacherNotifications = useMemo(() => {
    if (accountType !== "teacher") return [];

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    return (Array.isArray(bookings) ? bookings : [])
      .filter((booking) => {
        const assignedTeacherId =
          normalizeEntityId(booking?.teacherId) ||
          normalizeEntityId(booking?.slotId?.createdBy);
        if (!teacherId || assignedTeacherId !== teacherId) return false;

        const status = String(booking?.demoStatus || "").toLowerCase();
        if (status === "cancelled" || status === "missed") return false;

        const bookingDate = getBookingDate(booking);
        if (!bookingDate) return true;

        return bookingDate >= startOfToday;
      })
      .sort((left, right) => {
        const leftDate =
          getBookingDate(left)?.getTime() || Number.MAX_SAFE_INTEGER;
        const rightDate =
          getBookingDate(right)?.getTime() || Number.MAX_SAFE_INTEGER;
        return leftDate - rightDate;
      });
  }, [accountType, bookings, teacherId]);

  useEffect(() => {
    setIsProfileMenuOpen(false);
    setIsNotificationMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (accountType !== "teacher" || !teacherId) {
      return;
    }

    dispatch(getAllBookings({ teacherId }));
  }, [accountType, dispatch, teacherId]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!profileMenuRef.current?.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }

      if (!notificationMenuRef.current?.contains(event.target)) {
        setIsNotificationMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsProfileMenuOpen(false);
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

  const handleProfileClick = () => {
    if (accountType === "admin" || accountType === "superadmin") {
      navigate("/admin/admin-profile");
    } else if (accountType === "student") {
      navigate("/student/profile");
    } else if (accountType === "teacher") {
      navigate("/teacher/profile");
    } else {
      navigate("/login");
    }
  };

  const handleNotificationsClick = () => {
    setIsProfileMenuOpen(false);

    if (accountType !== "teacher") {
      toast("Notifications panel is not wired yet.");
      return;
    }

    setIsNotificationMenuOpen((open) => !open);
  };

  const handleViewTeacherDemos = () => {
    setIsNotificationMenuOpen(false);
    navigate("/teacher");
  };

  const handleLogout = () => {
    setIsProfileMenuOpen(false);
    setIsNotificationMenuOpen(false);
    dispatch(logoutUser()).finally(() => {
      toast.success("Logged out successfully!");
      navigate("/");
    });
  };

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onMenuClick}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-orange-200 hover:text-orange-500 md:hidden"
            aria-label="Open sidebar menu"
          >
            <FiMenu className="text-xl" />
          </button>

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              {roleLabel}
            </p>
            <h1 className="truncate text-lg font-semibold text-slate-900 sm:text-2xl">
              {title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative hidden sm:block" ref={notificationMenuRef}>
            <button
              type="button"
              onClick={handleNotificationsClick}
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-orange-200 hover:text-orange-500"
              aria-label="Notifications"
            >
              <FiBell className="text-lg" />
              {accountType === "teacher" && teacherNotifications.length > 0 ? (
                <span className="absolute right-2 top-2 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                  {teacherNotifications.length > 9 ? "9+" : teacherNotifications.length}
                </span>
              ) : null}
            </button>

            {isNotificationMenuOpen && accountType === "teacher" ? (
              <div className="absolute right-0 top-full z-30 mt-3 w-[340px] overflow-hidden rounded-3xl border border-slate-200 bg-white p-2 shadow-[0_24px_70px_-36px_rgba(15,23,42,0.55)]">
                <div className="border-b border-slate-100 px-3 py-3">
                  <p className="text-sm font-semibold text-slate-900">
                    Demo requests for you
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Learners are assigned automatically when they book one of your
                    demo slots.
                  </p>
                </div>

                <div className="max-h-[360px] overflow-y-auto py-2">
                  {teacherNotifications.length === 0 ? (
                    <div className="px-3 py-6 text-center text-sm text-slate-500">
                      No upcoming demo requests right now.
                    </div>
                  ) : (
                    teacherNotifications.slice(0, 5).map((booking) => (
                      <button
                        key={booking?._id || booking?.id}
                        type="button"
                        onClick={handleViewTeacherDemos}
                        className="flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-slate-50"
                      >
                        <span className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                          <FiBell className="text-sm" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-slate-900">
                            {getBookingStudentName(booking)}
                          </span>
                          <span className="mt-1 block truncate text-xs text-slate-500">
                            {(booking?.courseId?.name ||
                              booking?.slotId?.courseId?.name ||
                              "Demo session")} • {formatDateLabel(getBookingDate(booking))}
                          </span>
                          <span className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
                            <FiClock className="text-[11px]" />
                            {formatTimeLabel(booking)}
                          </span>
                        </span>
                      </button>
                    ))
                  )}
                </div>

                <div className="border-t border-slate-100 px-3 py-3">
                  <button
                    type="button"
                    onClick={handleViewTeacherDemos}
                    className="w-full rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    View all demo bookings
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2 py-2 text-left shadow-sm transition hover:border-orange-200"
              onClick={() => setIsProfileMenuOpen((open) => !open)}
              aria-expanded={isProfileMenuOpen}
              aria-haspopup="menu"
              aria-label="Open profile menu"
            >
              <img
                src={profileImage}
                alt="Profile"
                className="h-10 w-10 rounded-2xl border border-slate-200 object-cover"
                onError={(e) => {
                  e.target.src = "https://i.pravatar.cc/300";
                }}
              />
              <div className="hidden min-w-0 sm:block">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {fullName}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {accountType === "guest" ? "View account" : roleLabel}
                </p>
              </div>
              <FiChevronDown
                className={`hidden text-slate-500 transition-transform sm:block ${
                  isProfileMenuOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isProfileMenuOpen && (
              <div className="absolute right-0 top-full z-30 mt-3 w-60 overflow-hidden rounded-3xl border border-slate-200 bg-white p-2 shadow-[0_24px_70px_-36px_rgba(15,23,42,0.55)]">
                <div className="border-b border-slate-100 px-3 py-3">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {fullName}
                  </p>
                  <p className="truncate text-xs text-slate-500">{roleLabel}</p>
                </div>

                <div className="py-2">
                  <button
                    type="button"
                    onClick={handleNotificationsClick}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:hidden"
                  >
                    <FiBell className="text-base" />
                    Notifications
                  </button>

                  <button
                    type="button"
                    onClick={handleProfileClick}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <FiSettings className="text-base" />
                    Settings
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                  >
                    <FiLogOut className="text-base" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navigation;
