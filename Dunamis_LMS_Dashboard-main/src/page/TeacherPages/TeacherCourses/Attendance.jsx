import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  getTeacherHomeworkHistory,
  submitAttendanceHomework,
  getTeacherPastClasses,
  getTeacherCourseClasses,
  getTeacherClassAttendance,
  updateAttendanceHomework,
  clearClassDetail,
} from "../../../redux/AttendanceHomework/AttendanceHomeworkSlice";
import { useCourseDetailsQuery } from "../../../hooks/useCourses";
import toast from "react-hot-toast";
import { IoSearch, IoClose } from "react-icons/io5";
import { HiOutlineCalendar, HiOutlineClock, HiOutlineUsers } from "react-icons/hi";

const HOMEWORK_WORD_LIMIT = 500;

const countWords = (text) =>
  String(text || "").trim().split(/\s+/).filter(Boolean).length;

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

const getContentPath = (row) =>
  [row?.module, row?.lesson, row?.topic].filter(Boolean).join(" › ");

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
      <img src={src} alt={name} loading="lazy" decoding="async" className="h-9 w-9 rounded-full object-cover object-top" />
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

// ─── course card (pending tab) ────────────────────────────────────────────────

const formatDays = (days) =>
  (Array.isArray(days) ? days : [])
    .map((d) => (typeof d === "string" ? d.charAt(0).toUpperCase() + d.slice(1, 3) : d))
    .join("/");

const CourseAttendanceCard = ({ group, onOpen }) => {
  const held = group.sections.filter((s) => s.latestClass);
  const pending = held.filter((s) => !s.latestClass.submitted);
  const totalStudents = group.sections.reduce((sum, s) => sum + (s.studentCount || 0), 0);
  const lastDate = held[0]?.latestClass?.date;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-xl bg-orange-50 p-2.5">
          <HiOutlineCalendar className="h-5 w-5 text-orange-500" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-gray-900">{group.courseName}</p>
          <p className="mt-0.5 text-xs text-gray-500">
            {group.sections.length} class timing{group.sections.length !== 1 ? "s" : ""}
          </p>
        </div>
        {held.length > 0 &&
          (pending.length > 0 ? (
            <span className="ml-auto shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
              {pending.length} pending
            </span>
          ) : (
            <span className="ml-auto shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
              All caught up
            </span>
          ))}
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <HiOutlineClock className="h-3.5 w-3.5" />
          {lastDate ? `Last class · ${formatDate(lastDate)}` : "No class held yet"}
        </span>
        <span className="flex items-center gap-1">
          <HiOutlineUsers className="h-3.5 w-3.5" />
          {totalStudents} student{totalStudents !== 1 ? "s" : ""}
        </span>
      </div>
      {held.length > 0 ? (
        <button
          type="button"
          onClick={() => onOpen(group)}
          className={`mt-1 w-full rounded-full px-4 py-2 text-xs font-medium transition ${
            pending.length > 0
              ? "bg-gray-900 text-white hover:bg-gray-700"
              : "border border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          {pending.length > 0 ? "Record Attendance" : "View / Edit Attendance"}
        </button>
      ) : (
        <p className="mt-1 rounded-full border border-dashed border-gray-200 px-4 py-2 text-center text-xs text-gray-400">
          Attendance opens after the first class
        </p>
      )}
    </div>
  );
};

// ─── attendance slide-over ────────────────────────────────────────────────────

const ATTENDANCE_STATUS = ["Present", "Absent"];

const sectionKey = (section) =>
  String(section?.parentAvailabilityId || section?.latestClass?.slotId || "");

const AttendanceSlideOver = ({ course, onClose, onSuccess }) => {
  const dispatch = useDispatch();
  const { submitLoading, submitError, classDetail, classDetailLoading, classDetailError } =
    useSelector((state) => state.attendanceHomework || {});

  const sections = course.sections || [];
  const recordable = sections.filter((s) => s.latestClass);
  // Default to the class the teacher most likely just finished: the most
  // recent timing that still lacks a submission, else the most recent one.
  const [activeKey, setActiveKey] = useState(() =>
    sectionKey(recordable.find((s) => !s.latestClass.submitted) || recordable[0])
  );
  const section = sections.find((s) => sectionKey(s) === activeKey) || null;
  const cls = section?.latestClass || null;
  const slot = {
    slotId: cls?.slotId,
    courseId: course.courseId,
    courseName: course.courseName,
    sessionType: section?.sessionType,
    date: cls?.date,
    startTime: cls?.startTime,
    endTime: cls?.endTime,
  };

  const { data: courseDetails, isError: contentFailed } = useCourseDetailsQuery(
    course.courseId
  );

  // Flatten course content into select groups; value encodes the id path so a
  // single dropdown resolves moduleId/lessonId/topicId. keyFromIds reverses it
  // to prefill the dropdown when editing an existing submission.
  const contentOptions = useMemo(() => {
    const modules = (courseDetails?.content || []).flatMap((c) => c?.modules || []);
    const groups = [];
    const idsByKey = new Map();

    for (const module of modules) {
      const lessons = module.lessons || [];
      if (lessons.length === 0) {
        const key = `m|${module._id}`;
        idsByKey.set(key, { moduleId: module._id });
        groups.push({ label: module.title, options: [{ value: key, label: module.title }] });
        continue;
      }

      const lessonOnly = [];
      for (const lesson of lessons) {
        const topics = lesson.topics || [];
        if (topics.length === 0) {
          const key = `l|${module._id}|${lesson._id}`;
          idsByKey.set(key, { moduleId: module._id, lessonId: lesson._id });
          lessonOnly.push({ value: key, label: lesson.title });
          continue;
        }
        groups.push({
          label: `${module.title} › ${lesson.title}`,
          options: topics.map((topic) => {
            const key = `t|${module._id}|${lesson._id}|${topic._id}`;
            idsByKey.set(key, {
              moduleId: module._id,
              lessonId: lesson._id,
              topicId: topic._id,
            });
            return { value: key, label: topic.title };
          }),
        });
      }
      if (lessonOnly.length) groups.push({ label: module.title, options: lessonOnly });
    }

    const keyFromIds = ({ moduleId, lessonId, topicId }) => {
      if (!moduleId) return "";
      const key = topicId
        ? `t|${moduleId}|${lessonId}|${topicId}`
        : lessonId
          ? `l|${moduleId}|${lessonId}`
          : `m|${moduleId}`;
      return idsByKey.has(key) ? key : "";
    };

    return { groups, idsByKey, keyFromIds };
  }, [courseDetails]);

  const hasContent = contentOptions.groups.length > 0;

  const isEdit = Boolean(classDetail?.submitted);
  const [studentAttendance, setStudentAttendance] = useState([]);
  const dirtyRef = useRef(false);

  const switchSection = (key) => {
    setActiveKey(key);
    dirtyRef.current = false;
    setStudentAttendance([]);
  };

  // Load the authoritative roster + any existing submission for this class.
  useEffect(() => {
    if (slot?.slotId) dispatch(getTeacherClassAttendance(slot.slotId));
    return () => dispatch(clearClassDetail());
  }, [dispatch, slot?.slotId]);

  // Prefill from the fetched detail; stop once the teacher edits anything.
  useEffect(() => {
    if (!classDetail || String(classDetail.slotId) !== String(slot.slotId)) return;
    if (dirtyRef.current) return;
    setStudentAttendance(
      (classDetail.students || []).map((s) => ({
        studentId: s._id,
        name: s.name,
        image: s.image,
        attendanceStatus: s.attendanceStatus || "Present",
        homework: s.homework || "",
        contentKey: contentOptions.keyFromIds({
          moduleId: s.moduleId,
          lessonId: s.lessonId,
          topicId: s.topicId,
        }),
      }))
    );
  }, [classDetail, slot.slotId, contentOptions]);

  useEffect(() => {
    if (submitError) toast.error(submitError);
  }, [submitError]);

  const updateStudent = (index, field, value) => {
    dirtyRef.current = true;
    setStudentAttendance((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  // Typing past the limit is blocked, but a single overflowing paste is let
  // through so the teacher sees the inline error instead of losing text.
  const updateHomework = (index, value) => {
    dirtyRef.current = true;
    setStudentAttendance((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s;
        const prevWords = countWords(s.homework);
        const nextWords = countWords(value);
        if (
          nextWords > HOMEWORK_WORD_LIMIT &&
          prevWords >= HOMEWORK_WORD_LIMIT &&
          nextWords >= prevWords
        ) {
          return s;
        }
        return { ...s, homework: value };
      })
    );
  };

  const applyContentToAll = () => {
    dirtyRef.current = true;
    setStudentAttendance((prev) =>
      prev.map((s) => ({ ...s, contentKey: prev[0].contentKey }))
    );
  };

  const overLimit = studentAttendance.some(
    (s) => countWords(s.homework) > HOMEWORK_WORD_LIMIT
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    const firstInvalid = studentAttendance.find(
      (s) => countWords(s.homework) > HOMEWORK_WORD_LIMIT
    );
    if (firstInvalid) {
      toast.error("Fix the highlighted fields before submitting");
      document
        .getElementById(`attendance-card-${firstInvalid.studentId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const contentIds = (s) => {
      const ids = contentOptions.idsByKey.get(s.contentKey) || {};
      return {
        moduleId: ids.moduleId || undefined,
        lessonId: ids.lessonId || undefined,
        topicId: ids.topicId || undefined,
      };
    };

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
      Object.assign(payload, contentIds(s));
    } else {
      payload.students = studentAttendance.map((s) => ({
        studentId: s.studentId,
        attendanceStatus: s.attendanceStatus,
        homework: s.homework,
        ...contentIds(s),
      }));
    }

    const result = await dispatch(
      isEdit
        ? updateAttendanceHomework({ slotId: slot.slotId, payload })
        : submitAttendanceHomework(payload)
    );
    if (!result.error) {
      toast.success(isEdit ? "Attendance updated successfully." : "Attendance submitted successfully.");
      onSuccess();
    }
  };

  const showApplyToAll =
    slot.sessionType !== "premium" &&
    studentAttendance.length > 1 &&
    Boolean(studentAttendance[0]?.contentKey);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* panel */}
      <div className="relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-xl">
        {/* header */}
        <div className="border-b px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                {isEdit ? "Edit Attendance" : "Take Attendance"}
              </h2>
              <p className="mt-0.5 text-xs text-gray-500">{course.courseName}</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-gray-100">
              <IoClose className="h-5 w-5 text-gray-600" />
            </button>
          </div>
          {sections.length > 1 ? (
            <div className="mt-3">
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-400">
                Class timing
              </label>
              <select
                value={activeKey}
                onChange={(e) => switchSection(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs text-gray-700 outline-none focus:border-orange-400"
              >
                {sections.map((s) => (
                  <option key={sectionKey(s)} value={sectionKey(s)} disabled={!s.latestClass}>
                    {[formatDays(s.recurringDays), `${formatTime(s.startTime)} – ${formatTime(s.endTime)}`]
                      .filter(Boolean)
                      .join(" · ")}
                    {s.latestClass
                      ? ` · ${formatDate(s.latestClass.date)} · ${s.latestClass.submitted ? "Submitted" : "Pending"}`
                      : " · No class yet"}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="mt-2 text-xs text-gray-500">
              {formatDate(slot.date)} · {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
            </p>
          )}
        </div>

        {/* student list */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {classDetailLoading && studentAttendance.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-gray-900" />
                <p className="mt-3 text-sm text-gray-500">Loading class…</p>
              </div>
            ) : classDetailError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center">
                <p className="text-sm font-medium text-rose-700">{classDetailError}</p>
                <button
                  type="button"
                  onClick={() => dispatch(getTeacherClassAttendance(slot.slotId))}
                  className="mt-3 rounded-full border border-rose-300 bg-white px-4 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
                >
                  Retry
                </button>
              </div>
            ) : studentAttendance.length === 0 ? (
              <p className="text-sm text-gray-500">No students enrolled in this class.</p>
            ) : (
              studentAttendance.map((s, index) => {
                const words = countWords(s.homework);
                const isOver = words > HOMEWORK_WORD_LIMIT;
                return (
                  <div
                    key={s.studentId}
                    id={`attendance-card-${s.studentId}`}
                    className="rounded-xl border border-gray-200 p-4"
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <Avatar name={s.name} src={s.image} />
                      <span className="min-w-0 truncate text-sm font-medium text-gray-900">{s.name}</span>
                      <select
                        value={s.attendanceStatus}
                        onChange={(e) => updateStudent(index, "attendanceStatus", e.target.value)}
                        className={`ml-auto shrink-0 rounded-lg border px-2.5 py-1.5 text-xs font-medium outline-none focus:border-orange-400 ${
                          s.attendanceStatus === "Present"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-rose-200 bg-rose-50 text-rose-600"
                        }`}
                      >
                        {ATTENDANCE_STATUS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>

                    <textarea
                      placeholder="Homework (optional)"
                      value={s.homework}
                      onChange={(e) => updateHomework(index, e.target.value)}
                      rows={2}
                      className={`w-full resize-none rounded-lg border px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none ${
                        isOver
                          ? "border-rose-300 focus:border-rose-400"
                          : "border-gray-200 focus:border-orange-400"
                      }`}
                    />
                    <div className="mt-1 flex items-center justify-between">
                      <p className={`text-[11px] ${isOver ? "font-medium text-rose-600" : "text-gray-400"}`}>
                        {isOver
                          ? `Homework exceeds the ${HOMEWORK_WORD_LIMIT}-word limit (currently ${words} words)`
                          : ""}
                      </p>
                      <p className={`text-[11px] ${isOver ? "font-medium text-rose-600" : "text-gray-400"}`}>
                        {words}/{HOMEWORK_WORD_LIMIT} words
                      </p>
                    </div>

                    {hasContent ? (
                      <div className="mt-2">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                            Covered in class (optional)
                          </span>
                          {index === 0 && showApplyToAll && (
                            <button
                              type="button"
                              onClick={applyContentToAll}
                              className="text-[11px] font-semibold text-orange-600 hover:text-orange-700"
                            >
                              Apply to all
                            </button>
                          )}
                        </div>
                        <select
                          value={s.contentKey}
                          onChange={(e) => updateStudent(index, "contentKey", e.target.value)}
                          className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs text-gray-700 outline-none focus:border-orange-400"
                        >
                          <option value="">Select module · lesson · topic</option>
                          {contentOptions.groups.map((group) => (
                            <optgroup key={group.label} label={group.label}>
                              {group.options.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>
                    ) : contentFailed ? (
                      <p className="mt-2 text-[11px] text-gray-400">
                        Couldn&apos;t load course modules — attendance can still be submitted.
                      </p>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>

          {/* footer */}
          <div className="border-t px-5 py-4">
            <div className="mb-3 flex gap-2 text-xs text-gray-500">
              <span className="font-medium text-green-600">
                {studentAttendance.filter((s) => s.attendanceStatus === "Present").length} Present
              </span>
              <span>·</span>
              <span className="font-medium text-red-500">
                {studentAttendance.filter((s) => s.attendanceStatus === "Absent").length} Absent
              </span>
            </div>
            <button
              type="submit"
              disabled={submitLoading || studentAttendance.length === 0 || overLimit}
              className="w-full rounded-full bg-gray-900 py-2.5 text-sm font-medium text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitLoading
                ? isEdit
                  ? "Updating..."
                  : "Submitting..."
                : isEdit
                  ? "Update Attendance"
                  : "Submit Attendance"}
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
    courseClasses = [],
    loading,
    classesLoading,
    error,
    classesError,
  } = useSelector((state) => state.attendanceHomework || {});

  const [activeTab, setActiveTab] = useState("pending");
  const [historyView, setHistoryView] = useState("records");
  const [search, setSearch] = useState("");
  const [attendanceCourse, setAttendanceCourse] = useState(null);

  // Fetch data lazily per tab
  useEffect(() => {
    if (activeTab === "pending") dispatch(getTeacherCourseClasses());
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
        row?.module,
        row?.lesson,
        row?.topic,
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

  // One card per course; its class timings (sections) feed the slide-over dropdown.
  const courseGroups = useMemo(() => {
    const map = new Map();
    for (const section of courseClasses) {
      const key = String(section.courseId);
      if (!map.has(key)) {
        map.set(key, {
          courseId: section.courseId,
          courseName: section.courseName,
          sections: [],
        });
      }
      map.get(key).sections.push(section);
    }
    return Array.from(map.values());
  }, [courseClasses]);

  const handleAttendanceSuccess = () => {
    setAttendanceCourse(null);
    if (activeTab === "pending") dispatch(getTeacherCourseClasses());
    else if (activeTab === "history" && historyView === "classes") dispatch(getTeacherPastClasses());
    else if (activeTab === "history") dispatch(getTeacherHomeworkHistory());
  };

  const handleRefresh = () => {
    if (activeTab === "pending") dispatch(getTeacherCourseClasses());
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
              {courseGroups.length} course{courseGroups.length !== 1 ? "s" : ""} · pick a course, then choose the class timing
            </span>
            <button
              type="button"
              onClick={() => dispatch(getTeacherCourseClasses())}
              className="rounded-full border border-gray-300 px-4 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>

          {classesLoading ? (
            <Spinner />
          ) : classesError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
              <p className="text-sm font-medium text-rose-700">{classesError}</p>
              <button
                type="button"
                onClick={() => dispatch(getTeacherCourseClasses())}
                className="mt-3 rounded-full border border-rose-300 bg-white px-4 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
              >
                Retry
              </button>
            </div>
          ) : courseClasses.length === 0 ? (
            <EmptyState
              title="No classes yet"
              description="Once a class has taken place, the course appears here so you can record attendance and homework."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {courseGroups.map((group) => (
                <CourseAttendanceCard
                  key={group.courseId}
                  group={group}
                  onOpen={setAttendanceCourse}
                />
              ))}
            </div>
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
                            <td className="px-3 py-2">{formatDate(row?.date || row?.createdAt)}</td>
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
                            <td className="max-w-xs px-3 py-2 text-gray-500">
                              <p className="truncate">{row?.homework || "No homework"}</p>
                              {getContentPath(row) && (
                                <p className="mt-0.5 truncate text-xs text-gray-400">{getContentPath(row)}</p>
                              )}
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
                        <th className="px-3 py-2 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPastClasses.map((cls, index) => {
                        const recorded = cls.coverageStatus !== "Missing";
                        return (
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
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() =>
                                setAttendanceCourse({
                                  courseId: cls.courseId,
                                  courseName: cls.courseName,
                                  sections: [
                                    {
                                      startTime: cls.startTime,
                                      endTime: cls.endTime,
                                      sessionType: cls.sessionType,
                                      latestClass: {
                                        slotId: cls.slotId,
                                        date: cls.date,
                                        startTime: cls.startTime,
                                        endTime: cls.endTime,
                                        submitted: recorded,
                                      },
                                    },
                                  ],
                                })
                              }
                              className="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            >
                              {recorded ? "Edit" : "Record"}
                            </button>
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
                  {getContentPath(row) && (
                    <p className="mt-2 text-xs text-gray-400">{getContentPath(row)}</p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-500">
                    <span>{formatDate(row?.date || row?.createdAt)}</span>
                    <span>{row?.sessionType || "Session not available"}</span>
                  </div>
                </article>
              );
            })
          )}
        </div>
      )}

      {/* Attendance Slide-over */}
      {attendanceCourse && (
        <AttendanceSlideOver
          course={attendanceCourse}
          onClose={() => setAttendanceCourse(null)}
          onSuccess={handleAttendanceSuccess}
        />
      )}
    </div>
  );
};

export default Attendance;
