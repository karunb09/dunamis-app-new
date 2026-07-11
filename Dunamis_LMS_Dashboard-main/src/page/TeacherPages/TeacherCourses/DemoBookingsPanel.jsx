import React from "react";
import {
  FiCalendar,
  FiClock,
  FiMail,
  FiMapPin,
  FiPhone,
  FiRefreshCw,
  FiUser,
  FiVideo,
} from "react-icons/fi";

const normalizeId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return String(value._id || value.id || value.roleId || value.userId || "");
};

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

const formatTimeLabel = (slot) => {
  const start = slot?.startTime || slot?.slot?.startTime || slot?.slotId?.startTime;
  const end = slot?.endTime || slot?.slot?.endTime || slot?.slotId?.endTime;
  if (!start && !end) return "Time pending";
  if (start && end) return `${start} - ${end}`;
  return start || end || "Time pending";
};

const getBookingTeacherId = (booking) =>
  normalizeId(booking?.teacherId) ||
  normalizeId(booking?.slotId?.createdBy) ||
  normalizeId(booking?.instructorId) ||
  normalizeId(booking?.teacher);

const getBookingDate = (booking) => {
  const rawDate = booking?.slotId?.date || booking?.slot?.date;
  if (!rawDate) return null;
  const date = new Date(rawDate);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getStudentMeta = (booking) => {
  const guest = booking?.lead || booking?.guest || {};
  const studentUser = booking?.studentId?.userId || booking?.student || {};
  const firstName =
    guest?.firstName ||
    studentUser?.name?.firstName ||
    booking?.studentName?.firstName ||
    "";
  const lastName =
    guest?.lastName ||
    studentUser?.name?.lastName ||
    booking?.studentName?.lastName ||
    "";
  const name = `${firstName} ${lastName}`.trim();
  const email = guest?.email || studentUser?.email || booking?.studentEmail || "";
  const phone =
    guest?.phone || studentUser?.mobileNo || booking?.studentPhone || "";

  return {
    name: name || email || "Guest student",
    email,
    phone,
  };
};

const getBookingMode = (booking) =>
  (booking?.deliveryMode || booking?.course?.mode || booking?.mode || "online")
    .toString()
    .toLowerCase();

const isNewBooking = (booking) => {
  const createdAt = booking?.createdAt;
  if (!createdAt) return false;

  const createdDate = new Date(createdAt);
  if (Number.isNaN(createdDate.getTime())) return false;

  return Date.now() - createdDate.getTime() <= 48 * 60 * 60 * 1000;
};

const DemoBookingsPanel = ({
  bookings = [],
  teacherId = "",
  loading = false,
  error = null,
  onRefresh,
}) => {
  const now = new Date();
  const normalizedTeacherId = normalizeId(teacherId);

  const visibleBookings = Array.isArray(bookings)
    ? bookings
        .filter((booking) => {
          if (!normalizedTeacherId) return true;
          const bookingTeacherId = getBookingTeacherId(booking);
          const slotTeacherId = normalizeId(booking?.slotId?.createdBy);
          const slotCreatorUserId = normalizeId(
            booking?.slotId?.createdBy?.userId
          );
          const teacherUserId = normalizeId(booking?.teacherId?.userId);

          return [
            bookingTeacherId,
            slotTeacherId,
            slotCreatorUserId,
            teacherUserId,
          ].includes(normalizedTeacherId);
        })
        .filter((booking) => {
          const status = (booking?.demoStatus || "").toString().toLowerCase();
          if (status === "cancelled" || status === "missed") return false;

          const bookingDate = getBookingDate(booking);
          if (!bookingDate) return true;

          const startOfToday = new Date(now);
          startOfToday.setHours(0, 0, 0, 0);
          return bookingDate >= startOfToday;
        })
        .sort((a, b) => {
          const aDate = getBookingDate(a)?.getTime() || Number.MAX_SAFE_INTEGER;
          const bDate = getBookingDate(b)?.getTime() || Number.MAX_SAFE_INTEGER;
          return aDate - bDate;
        })
    : [];

  const summary = visibleBookings.reduce(
    (acc, booking) => {
      const mode = getBookingMode(booking);
      acc.total += 1;
      if (mode === "offline") acc.offline += 1;
      else acc.online += 1;
      return acc;
    },
    { total: 0, online: 0, offline: 0 }
  );

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-500">
            Teacher Visibility
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">
            Upcoming Demo Bookings
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            These requests are already assigned to you when a learner books one
            of your demo slots.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
        >
          <FiRefreshCw className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          { label: "Visible", value: summary.total },
          { label: "Online", value: summary.online },
          { label: "Offline", value: summary.offline },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100"
          >
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
              {item.label}
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {error ? (
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {typeof error === "string" ? error : error?.message || "Failed to load demo bookings"}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
          Loading demo bookings...
        </div>
      ) : visibleBookings.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
          <FiVideo className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-3 font-medium text-slate-900">
            No upcoming demo bookings yet.
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Once a learner selects your slot, the booking will appear here and in
            your notification bell.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {visibleBookings.slice(0, 4).map((booking) => {
            const student = getStudentMeta(booking);
            const bookingDate = getBookingDate(booking);
            const mode = getBookingMode(booking);
            const branchName =
              booking?.slotId?.branchId?.branchName ||
              booking?.branch?.branchName ||
              booking?.branchName ||
              "";
            const courseName =
              booking?.courseId?.name ||
              booking?.course?.name ||
              booking?.courseName ||
              "Course";
            const instructorName =
              booking?.teacherId?.userId?.name
                ? `${booking.teacherId.userId.name.firstName || ""} ${
                    booking.teacherId.userId.name.lastName || ""
                  }`.trim()
                : booking?.teacherId?.teacherDetail?.name
                  ? `${booking.teacherId.teacherDetail.name.firstName || ""} ${
                      booking.teacherId.teacherDetail.name.lastName || ""
                    }`.trim()
                  : "Instructor";

            return (
              <article
                key={booking?._id || booking?.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-orange-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {courseName}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {booking?.demoStatus || "Booked"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {isNewBooking(booking) ? (
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        New
                      </span>
                    ) : null}
                    <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600">
                      {mode}
                    </span>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <FiCalendar className="h-4 w-4 text-slate-400" />
                    <span>{formatDateLabel(bookingDate)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiClock className="h-4 w-4 text-slate-400" />
                    <span>{formatTimeLabel(booking)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiUser className="h-4 w-4 text-slate-400" />
                    <span>{student.name}</span>
                  </div>
                  {student.email ? (
                    <div className="flex items-center gap-2">
                      <FiMail className="h-4 w-4 text-slate-400" />
                      <span className="truncate">{student.email}</span>
                    </div>
                  ) : null}
                  {student.phone ? (
                    <div className="flex items-center gap-2">
                      <FiPhone className="h-4 w-4 text-slate-400" />
                      <span>{student.phone}</span>
                    </div>
                  ) : null}
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-slate-300" />
                    <span>{instructorName}</span>
                  </div>
                  {branchName ? (
                    <div className="flex items-center gap-2">
                      <FiMapPin className="h-4 w-4 text-slate-400" />
                      <span>{branchName}</span>
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default DemoBookingsPanel;
