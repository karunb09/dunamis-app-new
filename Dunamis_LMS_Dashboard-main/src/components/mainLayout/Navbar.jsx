import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FiBell,
  FiCheck,
  FiChevronDown,
  FiClock,
  FiLogOut,
  FiMenu,
  FiSettings,
  FiTrash2,
} from "react-icons/fi";
import BackButton from "../BackButton";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import { getStoredUser } from "../../utils/authSession";
import {
  clearUserDashboardNotices,
  deleteUserDashboardNotice,
  getUserDashboardNotices,
  logoutUser,
  markAllUserDashboardNoticesRead,
  markUserDashboardNoticeRead,
} from "../../redux/authSlice";
import { getAllBookings } from "../../redux/DemoBooking/DemoBookingSlice";
import {
  getTeacherRoleId,
  getUserDisplayName,
  normalizeEntityId,
} from "../../utils/roleIdentity";
import { resolveImageUrl } from "../../utils/resolveImageUrl";

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

const getInitials = (name = "", email = "") => {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return String(email || "U").slice(0, 2).toUpperCase();
};

const getUploadedProfileImage = (user = {}) =>
  [
    user.image,
    user.profilePicture,
    user.teacherDetails?.profilePicture,
    user.teacherDetail?.profilePicture,
    user.teacherApplication?.profilePicture,
    user.adminDetails?.profilePicture,
    user.studentDetails?.profilePicture,
  ].find((value) => typeof value === "string" && value.trim());

const readStoredIds = (key) => {
  try {
    return JSON.parse(window.localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
};

const writeStoredIds = (key, ids) => {
  try {
    window.localStorage.setItem(key, JSON.stringify([...new Set(ids)]));
  } catch {}
};

const Navigation = ({ onMenuClick }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const profileMenuRef = useRef(null);
  const notificationMenuRef = useRef(null);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false);
  const [profileImageFailed, setProfileImageFailed] = useState(false);
  const [readTeacherNotificationIds, setReadTeacherNotificationIds] = useState([]);
  const [deletedTeacherNotificationIds, setDeletedTeacherNotificationIds] =
    useState([]);

  const authUser = useSelector((state) => state.auth?.user);
  const updatedProfileUser = useSelector((state) => state.user?.user);
  const storedUser = getStoredUser() || {};
  const baseUser = authUser || storedUser;
  const user =
    updatedProfileUser &&
    normalizeEntityId(updatedProfileUser) === normalizeEntityId(baseUser)
      ? { ...baseUser, ...updatedProfileUser }
      : baseUser;
  const fullName = getUserDisplayName(user, "User");
  const accountType = user?.accountType || "guest";
  const teacherId = getTeacherRoleId(user);
  const { bookings = [] } = useSelector((state) => state.demoBookings || {});
  const { notices = [] } = useSelector((state) => state.auth || {});

  const uploadedProfileImage = getUploadedProfileImage(user);
  const profileImage = resolveImageUrl(uploadedProfileImage, "");
  const profileInitials = getInitials(fullName, user?.email);
  const shouldShowProfileImage = Boolean(profileImage) && !profileImageFailed;
  const teacherNotificationStorageKey = `teacher-demo-notifications:${
    teacherId || normalizeEntityId(user)
  }`;

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

  const HOME_PATHS = new Set(["/", "/admin", "/teacher"]);
  const showBackButton = !HOME_PATHS.has(location.pathname);

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
        const notificationId = normalizeEntityId(booking?._id || booking?.id);
        if (
          notificationId &&
          deletedTeacherNotificationIds.includes(notificationId)
        ) {
          return false;
        }

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
      })
      .map((booking) => {
        const notificationId = normalizeEntityId(booking?._id || booking?.id);

        return {
          ...booking,
          notificationId,
          isRead:
            Boolean(notificationId) &&
            readTeacherNotificationIds.includes(notificationId),
        };
      });
  }, [
    accountType,
    bookings,
    deletedTeacherNotificationIds,
    readTeacherNotificationIds,
    teacherId,
  ]);

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

  const unreadDashboardCount = dashboardNotifications.filter(
    (notice) => !notice.isRead
  ).length;
  const unreadTeacherCount = teacherNotifications.filter(
    (notice) => !notice.isRead
  ).length;
  const totalNotificationCount =
    unreadDashboardCount + (accountType === "teacher" ? unreadTeacherCount : 0);
  const hasAnyNotifications =
    dashboardNotifications.length > 0 || teacherNotifications.length > 0;

  useEffect(() => {
    setIsProfileMenuOpen(false);
    setIsNotificationMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    setProfileImageFailed(false);
  }, [profileImage]);

  useEffect(() => {
    if (accountType === "guest") {
      return;
    }

    dispatch(getUserDashboardNotices());
  }, [accountType, dispatch]);

  useEffect(() => {
    if (accountType !== "teacher" || !teacherId) {
      return;
    }

    dispatch(getAllBookings({ teacherId }));
  }, [accountType, dispatch, teacherId]);

  useEffect(() => {
    if (accountType !== "teacher") {
      setReadTeacherNotificationIds([]);
      setDeletedTeacherNotificationIds([]);
      return;
    }

    setReadTeacherNotificationIds(
      readStoredIds(`${teacherNotificationStorageKey}:read`)
    );
    setDeletedTeacherNotificationIds(
      readStoredIds(`${teacherNotificationStorageKey}:deleted`)
    );
  }, [accountType, teacherNotificationStorageKey]);

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
    setIsNotificationMenuOpen((open) => !open);
  };

  const handleViewTeacherDemos = () => {
    setIsNotificationMenuOpen(false);
    navigate("/teacher");
  };

  const persistTeacherNotificationIds = (kind, updater) => {
    const key = `${teacherNotificationStorageKey}:${kind}`;
    const current =
      kind === "read"
        ? readTeacherNotificationIds
        : deletedTeacherNotificationIds;
    const next = typeof updater === "function" ? updater(current) : updater;

    writeStoredIds(key, next);

    if (kind === "read") {
      setReadTeacherNotificationIds([...new Set(next)]);
    } else {
      setDeletedTeacherNotificationIds([...new Set(next)]);
    }
  };

  const handleMarkNoticeRead = async (noticeId) => {
    if (!noticeId) return;

    try {
      await dispatch(markUserDashboardNoticeRead(noticeId)).unwrap();
    } catch (err) {
      toast.error(err || "Failed to mark notification as read");
    }
  };

  const handleDeleteNotice = async (noticeId) => {
    if (!noticeId) return;

    try {
      await dispatch(deleteUserDashboardNotice(noticeId)).unwrap();
      toast.success("Notification removed");
    } catch (err) {
      toast.error(err || "Failed to remove notification");
    }
  };

  const handleMarkTeacherNotificationRead = (notificationId) => {
    if (!notificationId) return;

    persistTeacherNotificationIds("read", (ids) => [...ids, notificationId]);
  };

  const handleDeleteTeacherNotification = (notificationId) => {
    if (!notificationId) return;

    persistTeacherNotificationIds("deleted", (ids) => [...ids, notificationId]);
    toast.success("Notification removed");
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      if (dashboardNotifications.length > 0) {
        await dispatch(markAllUserDashboardNoticesRead()).unwrap();
      }

      if (teacherNotifications.length > 0) {
        persistTeacherNotificationIds("read", (ids) => [
          ...ids,
          ...teacherNotifications
            .map((notice) => notice.notificationId)
            .filter(Boolean),
        ]);
      }

      toast.success("Notifications marked as read");
    } catch (err) {
      toast.error(err || "Failed to mark notifications as read");
    }
  };

  const handleClearAllNotifications = async () => {
    try {
      if (dashboardNotifications.length > 0) {
        await dispatch(clearUserDashboardNotices()).unwrap();
      }

      if (teacherNotifications.length > 0) {
        persistTeacherNotificationIds("deleted", (ids) => [
          ...ids,
          ...teacherNotifications
            .map((notice) => notice.notificationId)
            .filter(Boolean),
        ]);
      }

      toast.success("Notifications cleared");
    } catch (err) {
      toast.error(err || "Failed to clear notifications");
    }
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
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl text-slate-700 transition hover:text-orange-500 lg:hidden"
            aria-label="Open sidebar menu"
          >
            <FiMenu className="text-xl" />
          </button>

          {showBackButton && <BackButton />}

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
          <div className="relative" ref={notificationMenuRef}>
            <button
              type="button"
              onClick={handleNotificationsClick}
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-orange-200 hover:text-orange-500"
              aria-label="Notifications"
            >
              <FiBell className="text-lg" />
              {totalNotificationCount > 0 ? (
                <span className="absolute right-2 top-2 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                  {totalNotificationCount > 9 ? "9+" : totalNotificationCount}
                </span>
              ) : null}
            </button>

            {isNotificationMenuOpen ? (
              <div className="fixed inset-x-4 top-[76px] z-30 max-h-[calc(100vh-92px)] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-2 shadow-[0_24px_70px_-36px_rgba(15,23,42,0.55)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-3 sm:w-[340px]">
                <div className="border-b border-slate-100 px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">
                      Notifications
                    </p>
                    {hasAnyNotifications ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                        {totalNotificationCount} unread
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Review updates, reminders, and dashboard alerts.
                  </p>
                  {hasAnyNotifications ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleMarkAllNotificationsRead}
                        disabled={totalNotificationCount === 0}
                        className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Mark all read
                      </button>
                      <button
                        type="button"
                        onClick={handleClearAllNotifications}
                        className="rounded-full border border-rose-100 px-3 py-1 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-50"
                      >
                        Clear all
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="max-h-[360px] overflow-y-auto py-2">
                  {dashboardNotifications.length === 0 &&
                  teacherNotifications.length === 0 ? (
                    <div className="px-3 py-6 text-center text-sm text-slate-500">
                      No notifications right now.
                    </div>
                  ) : (
                    <>
                      {dashboardNotifications.map((notice) => (
                        <div
                          key={notice.id}
                          className={`rounded-2xl px-3 py-3 ${
                            notice.isRead ? "bg-white" : "bg-orange-50/70"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                              <FiBell className="text-sm" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {notice.title}
                              </p>
                              {notice.message && (
                                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                                  {notice.message}
                                </p>
                              )}
                              <div className="mt-2 flex flex-wrap gap-2">
                                {!notice.isRead && (
                                  <button
                                    type="button"
                                    onClick={() => handleMarkNoticeRead(notice.id)}
                                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-white"
                                  >
                                    <FiCheck className="text-xs" />
                                    Mark read
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteNotice(notice.id)}
                                  className="inline-flex items-center gap-1 rounded-full border border-rose-100 px-2 py-1 text-[11px] font-semibold text-rose-600 transition hover:bg-white"
                                >
                                  <FiTrash2 className="text-xs" />
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {teacherNotifications.slice(0, 5).map((booking) => (
                        <div
                          key={booking.notificationId || booking?._id || booking?.id}
                          className={`rounded-2xl px-3 py-3 ${
                            booking.isRead ? "bg-white" : "bg-orange-50/70"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                              <FiBell className="text-sm" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {getBookingStudentName(booking)}
                              </p>
                              <p className="mt-1 truncate text-xs text-slate-500">
                                {(booking?.courseId?.name ||
                                  booking?.slotId?.courseId?.name ||
                                  "Demo session")}{" "}
                                • {formatDateLabel(getBookingDate(booking))}
                              </p>
                              <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
                                <FiClock className="text-[11px]" />
                                {formatTimeLabel(booking)}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {!booking.isRead && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleMarkTeacherNotificationRead(
                                        booking.notificationId
                                      )
                                    }
                                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-white"
                                  >
                                    <FiCheck className="text-xs" />
                                    Mark read
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeleteTeacherNotification(
                                      booking.notificationId
                                    )
                                  }
                                  className="inline-flex items-center gap-1 rounded-full border border-rose-100 px-2 py-1 text-[11px] font-semibold text-rose-600 transition hover:bg-white"
                                >
                                  <FiTrash2 className="text-xs" />
                                  Delete
                                </button>
                                <button
                                  type="button"
                                  onClick={handleViewTeacherDemos}
                                  className="rounded-full border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-white"
                                >
                                  View demo
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                {accountType === "teacher" ? (
                  <div className="border-t border-slate-100 px-3 py-3">
                  <button
                    type="button"
                    onClick={handleViewTeacherDemos}
                    className="w-full rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    View all demo bookings
                  </button>
                  </div>
                ) : null}
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
              {shouldShowProfileImage ? (
                <img
                  src={profileImage}
                  alt={fullName}
                  className="h-10 w-10 rounded-2xl border border-slate-200 object-cover object-top"
                  onError={() => setProfileImageFailed(true)}
                />
              ) : (
                <span
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50 text-sm font-bold text-orange-700"
                  aria-label={`${fullName} initials`}
                >
                  {profileInitials}
                </span>
              )}
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
