import React, { useEffect, useState } from "react";
import axios from "../../../../api/axios";
import Swal from "sweetalert2";
import { useReassignEnrollment } from "../../../../hooks/useStudents";

const SESSION_TYPES = ["standard", "premium"];

const ErrorBox = ({ message }) => (
  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
    {message}
  </div>
);

const slotLabel = (slot) => {
  const days =
    slot.batchLabel ||
    slot.dayPairLabel ||
    (Array.isArray(slot.recurringDays) ? slot.recurringDays.join(" / ") : "");
  const time = `${slot.startTime || ""}–${slot.endTime || ""}`;
  const seats = slot.availableSeats != null ? ` · ${slot.availableSeats} seats left` : "";
  return [days, time, seats].filter(Boolean).join("  ");
};

const teacherName = (t) => {
  const firstName = t?.userId?.name?.firstName || t?.name?.firstName || "";
  const lastName = t?.userId?.name?.lastName || t?.name?.lastName || "";
  return `${firstName} ${lastName}`.trim() || t?.userId?.email || "Instructor";
};

export default function ReassignEnrollmentModal({ enrollment, studentId, onClose }) {
  const currentCourseId = enrollment.courseId?._id || enrollment.courseId;
  const currentTeacherId = enrollment.slotDetails?.teacherId;
  const currentTeacherName = enrollment.slotDetails?.teacherName || "Unassigned";
  const currentCourseName = enrollment.courseId?.name || "this course";

  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [changeCourse, setChangeCourse] = useState(false);

  const [selectedCourseId, setSelectedCourseId] = useState(currentCourseId || "");
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [sessionType, setSessionType] = useState(enrollment.slotDetails?.sessionType || "standard");

  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const reassignMutation = useReassignEnrollment();

  useEffect(() => {
    axios
      .get("/course/get")
      .then((res) => {
        const all = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data?.courses)
          ? res.data.courses
          : Array.isArray(res.data)
          ? res.data
          : [];
        setCourses(all.filter((c) => c.isPublished));
      })
      .catch(() => setCourses([]))
      .finally(() => setCoursesLoading(false));
  }, []);

  const selectedCourse = courses.find((c) => (c._id || c.id) === selectedCourseId) || null;
  const isOfflineCourse = selectedCourse?.mode === "offline";
  const branchOptions = Array.isArray(selectedCourse?.branches) ? selectedCourse.branches : [];
  const teacherOptions = Array.isArray(selectedCourse?.teacher) ? selectedCourse.teacher : [];

  // Reset downstream selections whenever the course changes.
  useEffect(() => {
    setSelectedBranchId("");
    setSelectedTeacherId("");
    setSelectedSlotId("");
    setSlots([]);
  }, [selectedCourseId]);

  // Only look up real availability once course, instructor, and session type
  // are all picked (plus branch for offline courses) — fetching earlier just
  // shows slots that belong to the wrong teacher/session type and invites
  // picking one that doesn't match what gets submitted.
  const readyForSlots =
    Boolean(selectedCourseId) &&
    Boolean(selectedTeacherId) &&
    Boolean(sessionType) &&
    (!isOfflineCourse || Boolean(selectedBranchId));

  useEffect(() => {
    if (!readyForSlots) {
      setSlots([]);
      return;
    }
    setSlotsLoading(true);
    const params = {
      courseId: selectedCourseId,
      teacherId: selectedTeacherId,
      sessionType,
      slotType: "enrolled",
    };
    if (selectedBranchId) params.branchId = selectedBranchId;

    axios
      .get("/slots/available", { params })
      .then((res) => setSlots(Array.isArray(res.data?.slots) ? res.data.slots : []))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [readyForSlots, selectedCourseId, selectedBranchId, selectedTeacherId, sessionType]);

  const isNoOp =
    !changeCourse &&
    selectedTeacherId &&
    String(selectedTeacherId) === String(currentTeacherId) &&
    selectedSlotId &&
    String(selectedSlotId) === String(enrollment.slotId);

  const canSubmit =
    selectedCourseId && selectedTeacherId && selectedSlotId && (!isOfflineCourse || selectedBranchId) && !isNoOp;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    const newTeacher = teacherOptions.find((t) => (t._id || t.id) === selectedTeacherId);
    const confirm = await Swal.fire({
      icon: "warning",
      title: "Reassign student?",
      html: `Move to <strong>${selectedCourse?.name || currentCourseName}</strong> with <strong>${teacherName(
        newTeacher
      )}</strong>? This takes effect from the next upcoming class — past attendance and payments are untouched.`,
      showCancelButton: true,
      confirmButtonText: "Reassign",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#f97316",
    });
    if (!confirm.isConfirmed) return;

    reassignMutation.mutate(
      {
        studentId,
        enrollmentId: enrollment._id,
        courseId: selectedCourseId,
        teacherId: selectedTeacherId,
        slotId: selectedSlotId,
        sessionType,
        deliveryMode: selectedCourse?.mode,
        branchId: selectedBranchId || undefined,
      },
      { onSuccess: onClose }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-8">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">Reassign Instructor / Course</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
            Currently: <span className="font-semibold text-gray-900">{currentCourseName}</span> with{" "}
            <span className="font-semibold text-gray-900">{currentTeacherName}</span>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={changeCourse}
              onChange={(e) => {
                setChangeCourse(e.target.checked);
                if (!e.target.checked) setSelectedCourseId(currentCourseId || "");
              }}
              className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
            />
            Change course too (uncommon — leave off to only switch instructor)
          </label>

          {changeCourse && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">New course</label>
              {coursesLoading ? (
                <p className="text-sm text-gray-400">Loading courses…</p>
              ) : (
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-orange-400"
                >
                  <option value="">— Choose a course —</option>
                  {courses.map((c) => (
                    <option key={c._id || c.id} value={c._id || c.id}>
                      {c.name || c.title} {c.code ? `(${c.code})` : ""}
                      {c.mode ? ` · ${c.mode}` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {selectedCourse && (
            <div className="grid gap-4 sm:grid-cols-2">
              {isOfflineCourse && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">Branch</label>
                  {branchOptions.length === 0 ? (
                    <ErrorBox message="No branches assigned to this course." />
                  ) : (
                    <select
                      value={selectedBranchId}
                      onChange={(e) => {
                        setSelectedBranchId(e.target.value);
                        setSelectedSlotId("");
                      }}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-orange-400"
                    >
                      <option value="">— Select branch —</option>
                      {branchOptions.map((b) => {
                        const id = b._id || b.id || b;
                        const name = b.branchName || b.name || id;
                        return (
                          <option key={id} value={id}>
                            {name}
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">New instructor</label>
                {teacherOptions.length === 0 ? (
                  <ErrorBox message="No instructors assigned to this course." />
                ) : (
                  <select
                    value={selectedTeacherId}
                    onChange={(e) => {
                      setSelectedTeacherId(e.target.value);
                      setSelectedSlotId("");
                    }}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-orange-400"
                  >
                    <option value="">— Select instructor —</option>
                    {teacherOptions.map((t) => {
                      const id = t._id || t.id;
                      return (
                        <option key={id} value={id}>
                          {teacherName(t)}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">Session type</label>
                <div className="flex gap-2">
                  {SESSION_TYPES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setSessionType(s);
                        setSelectedSlotId("");
                      }}
                      className={`flex-1 rounded-xl border py-2 text-sm capitalize transition ${
                        sessionType === s
                          ? "border-orange-400 bg-orange-50 font-semibold text-orange-700"
                          : "border-gray-200 bg-white text-gray-600 hover:border-orange-200"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {selectedCourse && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">New batch slot</label>
              {!readyForSlots ? (
                <p className="text-sm text-gray-400">
                  Select {isOfflineCourse && !selectedBranchId ? "a branch, " : ""}an instructor, and a session type to see real availability.
                </p>
              ) : slotsLoading ? (
                <p className="text-sm text-gray-400">Loading batches…</p>
              ) : slots.length === 0 ? (
                <ErrorBox message="No available batch slots for this course / branch / instructor / session type." />
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {slots.map((slot) => {
                      const id = slot._id || slot.id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setSelectedSlotId(id)}
                          className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                            selectedSlotId === id
                              ? "border-orange-400 bg-orange-50 font-semibold text-orange-700"
                              : "border-gray-200 bg-white text-gray-700 hover:border-orange-200"
                          }`}
                        >
                          {slotLabel(slot) || "Batch slot"}
                          {slot.availableSeats === 0 && (
                            <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">
                              Full
                            </span>
                          )}
                        </button>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {isNoOp && (
            <ErrorBox message="This is the student's current instructor and batch — pick a different one to reassign." />
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit || reassignMutation.isPending}
              className="flex-1 rounded-2xl bg-orange-500 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-40"
            >
              {reassignMutation.isPending ? "Reassigning…" : "Reassign Student"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
