import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  getTeacherHomeworkHistory,
  submitAttendanceHomework,
  getTeacherPastClasses,
  getTeacherUpcomingClasses,
} from "../../../redux/AttendanceHomework/AttendanceHomeworkSlice";
import toast from "react-hot-toast";
import { IoSearch, IoClose } from "react-icons/io5";
import { HiOutlineCalendar, HiOutlineClock, HiOutlineUsers } from "react-icons/hi";

const tabs = [
  { id: "pending", label: "Pending" },
  { id: "history", label: "History" },
  { id: "homework", label: "Homework" },
];

// ─── helpers ────────────────────────────────────────────────────────────────

const getStudentName = (row) => {
  const firstName = row?.studentName?.firstName || "";
  const lastName = row?.studentName?.lastName || "";
  return `${firstName} ${lastName}`.trim() || row?.studentName || "Student";
};

const getInitials = (name) =>
  String(name || "S")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "S";

const getSlotText = (row) => {
  const days = Array.isArray(row?.slotDetails?.day)
    ? row.slotDetails.day.join(", ")
    : row?.slotDetails?.day || "";
  const start = row?.slotDetails?.startTime;
  const end = row?.slotDetails?.endTime;
  if (days && start && end) return `${days}, ${start} - ${end}`;
  if (start && end) return `${start} - ${end}`;
  return "Not available";
};

const formatDate = (value) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatTime = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (/\b(AM|PM)\b/i.test(raw)) return raw.toUpperCase();
  const clean = raw.replace(/\D/g, "");
  if (clean.length < 3) return raw;
  const hours = Number(clean.slice(0, clean.length - 2));
  const minutes = Number(clean.slice(-2));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return raw;
  const hour12 = ((hours + 11) % 12) + 1;
  const ampm = hours < 12 ? "AM" : "PM";
  return `${hour12}:${String(minutes).padStart(2, "0")} ${ampm}`;
};

// ─── shared UI ──────────────────────────────────────────────────────────────

const Avatar = ({ name, src }) => {
  if (src)
    return (
      <img src={src} alt={name} className="h-9 w-9 rounded-full object-cover object-top" />
    );
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-700">
      {getInitials(name)}
    </span>
  );
};

const EmptyState = ({ title, description }) => (
  <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
    <h3 className="text-base font-semibold text-gray-900">{title}</h3>
    <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-gray-600">{description}</p>
  </div>
);

const Spinner = () => (
  <div className="py-12 text-center">
    <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-gray-900" />
    <p className="mt-4 text-gray-600">Loading...</p>
  </div>
);

const CoverageStatusBadge = ({ status }) => {
  const styles = {
    Full: "bg-green-50 text-green-700 border-green-200",
    Partial: "bg-yellow-50 text-yellow-700 border-yellow-200",
    Missing: "bg-red-50 text-red-600 border-red-200",
  };
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[status] || styles.Missing}`}>
      {status}
    </span>
  );
};

// ─── slot card (pending tab) ─────────────────────────────────────────────────

const SlotCard = ({ slot, onTakeAttendance, readOnly = false }) => (
  <div className="mb-3 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-start gap-3">
      <div className="mt-0.5 rounded-lg bg-gray-100 p-2">
        <HiOutlineCalendar className="h-5 w-5 text-gray-600" />
      </div>
      <div>
        <p className="font-medium text-gray-900">{slot.courseName}</p>
        <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <HiOutlineClock className="h-3.5 w-3.5" />
            {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
          </span>
          <span className="flex items-center gap-1">
            <HiOutlineUsers className="h-3.5 w-3.5" />
            {slot.studentCount} student{slot.studentCount !== 1 ? "s" : ""}
          </span>
          <span className="capitalize">{slot.sessionType}</span>
        </div>
      </div>
    </div>
    {!readOnly && (
      <button
        type="button"
        onClick={() => onTakeAttendance(slot)}
        className="self-start shrink-0 rounded-full bg-gray-900 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-gray-700 sm:ml-4 sm:self-auto"
      >
        Take Attendance
      </button>
    )}
    {readOnly && (
      <span className="self-start shrink-0 rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-500 sm:ml-4 sm:self-auto">
        Upcoming
      </span>
    )}
  </div>
);

// ─── attendance slide-over ────────────────────────────────────────────────────

const ATTENDANCE_STATUS = ["Present", "Absent"];

const AttendanceSlideOver = ({ slot, onClose, onSuccess }) => {
  const dispatch = useDispatch();
  const { submitLoading, submitError } = useSelector(
    (state) => state.attendanceHomework || {}
  );

  const [studentAttendance, setStudentAttendance] = useState(() =>
    (slot.students || []).map((s) => ({
      studentId: s._id,
      name: s.name,
      image: s.image,
      attendanceStatus: "Present",
      homework: "",
    }))
  );

  useEffect(() => {
    if (submitError) toast.error(submitError);
  }, [submitError]);

  const updateStudent = (index, field, value) => {
    setStudentAttendance((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      slotId: slot.slotId,
      courseId: slot.courseId,
      sessionType: slot.sessionType,
    };

    if (slot.sessionType === "premium") {
      const s = studentAttendance[0];
      payload.studentId = s.studentId;
      payload.attendanceStatus = s.attendanceStatus;
      payload.homework = s.homework;
    } else {
      payload.students = studentAttendance.map((s) => ({
        studentId: s.studentId,
        attendanceStatus: s.attendanceStatus,
        homework: s.homework,
      }));
    }

    const result = await dispatch(submitAttendanceHomework(payload));
    if (!result.error) {
      toast.success("Attendance submitted successfully.");
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* panel */}
      <div className="relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-xl">
        {/* header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Take Attendance</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              {slot.courseName} · {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-gray-100">
            <IoClose className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* student list */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {studentAttendance.length === 0 ? (
              <p className="text-sm text-gray-500">No students enrolled in this slot.</p>
            ) : (
              studentAttendance.map((s, index) => (
                <div key={s.studentId} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar name={s.name} src={s.image} />
                    <span className="min-w-0 truncate font-medium text-gray-900 text-sm">{s.name}</span>
                    <div className="ml-auto flex shrink-0 gap-2">
                      {ATTENDANCE_STATUS.map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => updateStudent(index, "attendanceStatus", status)}
                          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                            s.attendanceStatus === status
                              ? status === "Present"
                                ? "bg-green-600 text-white"
                                : "bg-red-500 text-white"
                              : "border border-gray-300 text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    placeholder="Homework (optional)"
                    value={s.homework}
                    onChange={(e) => updateStudent(index, "homework", e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 resize-none"
                  />
                </div>
              ))
            )}
          </div>

          {/* footer */}
          <div className="border-t px-5 py-4">
            <div className="mb-3 flex gap-2 text-xs text-gray-500">
              <span className="text-green-600 font-medium">
                {studentAttendance.filter((s) => s.attendanceStatus === "Present").length} Present
              </span>
              <span>·</span>
              <span className="text-red-500 font-medium">
                {studentAttendance.filter((s) => s.attendanceStatus === "Absent").length} Absent
              </span>
            </div>
            <button
              type="submit"
              disabled={submitLoading || studentAttendance.length === 0}
              className="w-full rounded-full bg-gray-900 py-2.5 text-sm font-medium text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitLoading ? "Submitting..." : "Submit Attendance"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── main component ──────────────────────────────────────────────────────────

const Attendance = () => {
  const dispatch = useDispatch();
  const {
    homeworkHistory = [],
    pastClasses = [],
    upcomingClasses = { today: [], upcoming: [] },
    loading,
    classesLoading,
    error,
    classesError,
  } = useSelector((state) => state.attendanceHomework || {});

  const [activeTab, setActiveTab] = useState("pending");
  const [historyView, setHistoryView] = useState("records");
  const [search, setSearch] = useState("");
  const [attendanceSlot, setAttendanceSlot] = useState(null);

  // Fetch data lazily per tab
  useEffect(() => {
    if (activeTab === "pending") dispatch(getTeacherUpcomingClasses());
  }, [dispatch, activeTab]);

  useEffect(() => {
    if (activeTab === "history" && historyView === "records") dispatch(getTeacherHomeworkHistory());
  }, [dispatch, activeTab, historyView]);

  useEffect(() => {
    if (activeTab === "history" && historyView === "classes") dispatch(getTeacherPastClasses());
  }, [dispatch, activeTab, historyView]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  useEffect(() => {
    if (classesError) toast.error(classesError);
  }, [classesError]);

  const rows = Array.isArray(homeworkHistory) ? homeworkHistory : [];

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => {
      const searchable = [
        getStudentName(row),
        row?.categoryName,
        row?.courseName,
        row?.sessionType,
        row?.attendanceStatus,
        row?.homework,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return searchable.includes(term);
    });
  }, [rows, search]);

  const filteredPastClasses = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return pastClasses;
    return pastClasses.filter((c) =>
      [c.courseName, c.coverageStatus, c.sessionType]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [pastClasses, search]);

  const homeworkRows = filteredRows.filter((row) => row?.homework);

  const handleAttendanceSuccess = () => {
    setAttendanceSlot(null);
    dispatch(getTeacherUpcomingClasses());
  };

  const handleRefresh = () => {
    if (activeTab === "pending") dispatch(getTeacherUpcomingClasses());
    else if (activeTab === "history" && historyView === "records") dispatch(getTeacherHomeworkHistory());
    else if (activeTab === "history" && historyView === "classes") dispatch(getTeacherPastClasses());
  };

  return (
    <div className="min-h-screen w-full bg-white p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Attendance & Homework</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
          Track class attendance, view upcoming and past sessions, and manage homework assignments.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-6 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-2 text-sm font-medium ${
              activeTab === tab.id
                ? "border-b-2 border-black text-black"
                : "text-gray-500"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search + Refresh toolbar (history tabs) */}
      {activeTab !== "pending" && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <IoSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-lg text-gray-500" />
            <input
              type="text"
              placeholder="Search records"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-full border py-2 pl-10 pr-3 text-sm focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
      )}

      {/* ── Pending Tab ─────────────────────────────────────────── */}
      {activeTab === "pending" && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {upcomingClasses.today.length + upcomingClasses.upcoming.length} class(es) scheduled
            </span>
            <button
              type="button"
              onClick={() => dispatch(getTeacherUpcomingClasses())}
              className="rounded-full border border-gray-300 px-4 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>

          {classesLoading ? (
            <Spinner />
          ) : (
            <>
              {/* Today */}
              <section className="mb-6">
                <h2 className="mb-3 text-sm font-semibold text-gray-800 uppercase tracking-wide">
                  Today&apos;s Classes
                </h2>
                {upcomingClasses.today.length === 0 ? (
                  <EmptyState
                    title="No classes today"
                    description="No enrolled slots are scheduled for today."
                  />
                ) : (
                  upcomingClasses.today.map((slot) => (
                    <SlotCard
                      key={slot.slotId}
                      slot={slot}
                      onTakeAttendance={setAttendanceSlot}
                    />
                  ))
                )}
              </section>

              {/* Upcoming */}
              <section>
                <h2 className="mb-3 text-sm font-semibold text-gray-800 uppercase tracking-wide">
                  Upcoming Classes
                </h2>
                {upcomingClasses.upcoming.length === 0 ? (
                  <EmptyState
                    title="No upcoming classes"
                    description="Future enrolled slots will appear here."
                  />
                ) : (
                  upcomingClasses.upcoming.map((slot) => (
                    <SlotCard key={slot.slotId} slot={slot} readOnly />
                  ))
                )}
              </section>
            </>
          )}
        </div>
      )}

      {/* ── History Tab ─────────────────────────────────────────── */}
      {activeTab === "history" && (
        <div>
          {/* sub-tab toggle */}
          <div className="mb-4 flex gap-2">
            <button
              type="button"
              onClick={() => setHistoryView("records")}
              className={`rounded-full border px-4 py-1.5 text-xs font-medium transition ${
                historyView === "records"
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              Attendance Records
            </button>
            <button
              type="button"
              onClick={() => setHistoryView("classes")}
              className={`rounded-full border px-4 py-1.5 text-xs font-medium transition ${
                historyView === "classes"
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              Past Classes
            </button>
          </div>

          {/* Attendance Records view */}
          {historyView === "records" && (
            <div className="rounded-lg border bg-white p-2 md:p-4">
              {loading ? (
                <Spinner />
              ) : filteredRows.length === 0 ? (
                <EmptyState
                  title="No Records Found"
                  description="Attendance and homework submissions will appear here."
                />
              ) : (
                <div className="overflow-x-auto text-sm">
                  <table className="min-w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b text-gray-500">
                        <th className="px-3 py-2 font-medium">Student</th>
                        <th className="px-3 py-2 font-medium">Course Category</th>
                        <th className="px-3 py-2 font-medium">Course Name</th>
                        <th className="px-3 py-2 font-medium">Slot</th>
                        <th className="px-3 py-2 font-medium">Date</th>
                        <th className="px-3 py-2 font-medium">Session Type</th>
                        <th className="px-3 py-2 font-medium">Attendance</th>
                        <th className="px-3 py-2 font-medium">Homework</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((row, index) => {
                        const studentName = getStudentName(row);
                        const present =
                          String(row?.attendanceStatus || "").toLowerCase() === "present";
                        return (
                          <tr key={row?._id || index} className="border-b hover:bg-gray-50">
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <Avatar name={studentName} src={row?.studentProfile} />
                                <span>{studentName}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2">{row?.categoryName || "N/A"}</td>
                            <td className="px-3 py-2">{row?.courseName || "N/A"}</td>
                            <td className="px-3 py-2">{getSlotText(row)}</td>
                            <td className="px-3 py-2">{formatDate(row?.createdAt)}</td>
                            <td className="px-3 py-2">{row?.sessionType || "N/A"}</td>
                            <td className="px-3 py-2">
                              <span
                                className={`inline-flex items-center gap-1 text-sm capitalize ${
                                  present ? "text-green-600" : "text-red-500"
                                }`}
                              >
                                <span className="h-2 w-2 rounded-full bg-current" />
                                {row?.attendanceStatus || "N/A"}
                              </span>
                            </td>
                            <td className="max-w-xs truncate px-3 py-2 text-gray-500">
                              {row?.homework || "No homework"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Past Classes view */}
          {historyView === "classes" && (
            <div className="rounded-lg border bg-white p-2 md:p-4">
              {classesLoading ? (
                <Spinner />
              ) : filteredPastClasses.length === 0 ? (
                <EmptyState
                  title="No Past Classes Found"
                  description="Past enrolled class slots will appear here with attendance coverage status."
                />
              ) : (
                <div className="overflow-x-auto text-sm">
                  <table className="min-w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b text-gray-500">
                        <th className="px-3 py-2 font-medium">Date</th>
                        <th className="px-3 py-2 font-medium">Course</th>
                        <th className="px-3 py-2 font-medium">Time</th>
                        <th className="px-3 py-2 font-medium">Session</th>
                        <th className="px-3 py-2 font-medium">Students</th>
                        <th className="px-3 py-2 font-medium">Submitted</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPastClasses.map((cls, index) => (
                        <tr key={cls.slotId || index} className="border-b hover:bg-gray-50">
                          <td className="px-3 py-2">{formatDate(cls.date)}</td>
                          <td className="px-3 py-2 font-medium">{cls.courseName}</td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {formatTime(cls.startTime)} – {formatTime(cls.endTime)}
                          </td>
                          <td className="px-3 py-2 capitalize">{cls.sessionType}</td>
                          <td className="px-3 py-2">{cls.studentCount}</td>
                          <td className="px-3 py-2">{cls.submittedCount}</td>
                          <td className="px-3 py-2">
                            <CoverageStatusBadge status={cls.coverageStatus} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Homework Tab ─────────────────────────────────────────── */}
      {activeTab === "homework" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            <div className="col-span-full">
              <Spinner />
            </div>
          ) : homeworkRows.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                title="No Homework Found"
                description="Homework created from live attendance submissions will appear here."
              />
            </div>
          ) : (
            homeworkRows.map((row, index) => {
              const studentName = getStudentName(row);
              return (
                <article
                  key={row?._id || index}
                  className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="mb-3 flex items-center gap-3">
                    <Avatar name={studentName} src={row?.studentProfile} />
                    <div>
                      <h3 className="font-semibold text-gray-900">{studentName}</h3>
                      <p className="text-sm text-gray-500">{row?.courseName || "Course not available"}</p>
                    </div>
                  </div>
                  <p className="text-sm leading-6 text-gray-700">{row.homework}</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-500">
                    <span>{formatDate(row?.createdAt)}</span>
                    <span>{row?.sessionType || "Session not available"}</span>
                  </div>
                </article>
              );
            })
          )}
        </div>
      )}

      {/* Attendance Slide-over */}
      {attendanceSlot && (
        <AttendanceSlideOver
          slot={attendanceSlot}
          onClose={() => setAttendanceSlot(null)}
          onSuccess={handleAttendanceSuccess}
        />
      )}
    </div>
  );
};

export default Attendance;
