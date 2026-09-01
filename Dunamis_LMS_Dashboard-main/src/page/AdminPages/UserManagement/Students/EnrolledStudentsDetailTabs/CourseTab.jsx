import { useState } from "react";
import { FiBookOpen, FiPause, FiPlay, FiRepeat, FiSlash } from "react-icons/fi";
import Swal from "sweetalert2";
import { toast } from "react-hot-toast";
import { resolveImageUrl } from "../../../../../utils/resolveImageUrl";
import ReassignEnrollmentModal from "../ReassignEnrollmentModal";
import {
    pauseEnrollment,
    resumeEnrollment,
    discontinueEnrollment,
} from "../../../../../api/studentLifecycleApi";

const STATUS_BADGE = {
    completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    "in-progress": "bg-sky-50 text-sky-700 ring-sky-200",
    paused: "bg-amber-50 text-amber-700 ring-amber-200",
    discontinued: "bg-slate-100 text-slate-600 ring-slate-200",
};

// Helper: convert hex color to rgba with alpha
function hexToRgba(hex, alpha = 1) {
    if (!hex) return `rgba(59, 130, 246, ${alpha})`; // default blue
    let c = hex.replace("#", "");
    if (c.length === 3) {
        c = c.split("").map((x) => x + x).join("");
    }
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const CoursesTab = ({ student, onRefresh }) => {
    const enrolledCourses = student?.enrolledCourses || [];
    const [reassignTarget, setReassignTarget] = useState(null);
    const [busyId, setBusyId] = useState(null);

    const runLifecycle = async (item, action) => {
        const courseId = item.courseId?._id || item.courseId;
        setBusyId(item._id);
        try {
            const result = await action({ studentId: student?._id, courseId });
            toast.success(result.message);
            onRefresh?.();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setBusyId(null);
        }
    };

    const handlePause = async (item) => {
        const { isConfirmed, value } = await Swal.fire({
            title: "Pause this enrollment?",
            text: "Billing freezes and the student comes off future classes. Their seat is held.",
            input: "text",
            inputLabel: "Reason",
            inputPlaceholder: "e.g. exams, travel",
            showCancelButton: true,
            confirmButtonText: "Pause",
            confirmButtonColor: "#FF6B35",
        });
        if (!isConfirmed) return;
        await runLifecycle(item, (args) =>
            pauseEnrollment({ ...args, reason: (value || "").trim() || undefined })
        );
    };

    const handleDiscontinue = async (item) => {
        const { isConfirmed, value } = await Swal.fire({
            title: "Discontinue this enrollment?",
            text: "This is final. The seat is released and any outstanding fee is written off.",
            input: "text",
            inputLabel: "Reason",
            inputPlaceholder: "e.g. moved city",
            showCancelButton: true,
            confirmButtonText: "Discontinue",
            confirmButtonColor: "#e11d48",
        });
        if (!isConfirmed) return;
        await runLifecycle(item, (args) =>
            discontinueEnrollment({ ...args, reason: (value || "").trim() || undefined })
        );
    };

    if (enrolledCourses.length === 0) {
        return (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white/60 px-6 py-12 text-center">
                <FiBookOpen className="mx-auto text-2xl text-slate-300" />
                <p className="mt-3 text-sm font-medium text-slate-500">Nothing here yet</p>
                <p className="mt-1 text-xs text-slate-400">This student has no course enrollments.</p>
            </div>
        );
    }

    // Active enrollments (current class) lead the grid; reassigned-away
    // entries trail behind as disabled history cards.
    const sortedCourses = [...enrolledCourses].sort(
        (a, b) => (b.active !== false ? 1 : 0) - (a.active !== false ? 1 : 0)
    );

    return (
        <>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {sortedCourses.map((item) => {
                const course = item.courseId;
                const isActive = item.active !== false;

                if (!course) {
                    console.warn("Skipping enrollment with null courseId:", item);
                    return null;
                }

                const progress = item.progress || 0;
                const status = item.status || "in-progress";
                const busy = busyId === item._id;

                const categoryName = course.category?.name || "N/A";
                const categoryIcon = course.category?.icon || "";
                const categoryColor = course.category?.color || "#3b82f6";
                const categoryBgColor = hexToRgba(categoryColor, 0.16);

                const formatDate = (value) =>
                    value
                        ? new Date(value).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                          })
                        : "";
                const startDate = formatDate(course.startDate);
                const endDate = formatDate(course.endDate);
                const dateRange = [startDate, endDate].filter(Boolean).join(" – ");

                const history = (student?.reassignmentHistory || []).filter(
                    (h) => String(h.toCourseId?._id || h.toCourseId) === String(course._id)
                );
                const lastReassignedAt = history.length
                    ? formatDate(history[history.length - 1]?.reassignedAt)
                    : "";

                return (
                    // min-w-0 is load-bearing: without it the card's min-content
                    // width widens the grid track and overflows the whole page.
                    <article
                        key={item._id}
                        className={`flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition sm:flex-row ${
                            isActive
                                ? "border-slate-200 hover:shadow-md"
                                : "border-slate-200 opacity-70 grayscale"
                        }`}
                    >
                        <img
                            src={resolveImageUrl(course.image, "/placeholder.png")}
                            alt={course.name}
                            className="h-32 w-full shrink-0 object-cover sm:h-auto sm:w-28 lg:w-32"
                        />

                        <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span
                                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                                    style={{ backgroundColor: categoryBgColor, color: categoryColor }}
                                >
                                    {categoryIcon && <span>{categoryIcon}</span>}
                                    <span>{categoryName}</span>
                                </span>

                                {course.level && (
                                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium capitalize text-slate-600 ring-1 ring-slate-200">
                                        {course.level}
                                    </span>
                                )}

                                <span
                                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ring-1 ${
                                        isActive
                                            ? STATUS_BADGE[status] || "bg-slate-100 text-slate-700 ring-slate-200"
                                            : "bg-slate-100 text-slate-500 ring-slate-200"
                                    }`}
                                >
                                    {isActive ? status.replace("-", " ") : "Reassigned — inactive"}
                                </span>
                            </div>

                            <div className="min-w-0">
                                <h3 className="break-words text-sm font-semibold text-slate-900">
                                    {course.name}
                                </h3>
                                <p className="mt-0.5 text-xs text-slate-500">Code: {course.code}</p>

                                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                                    <div className="min-w-0">
                                        <dt className="text-[10px] uppercase tracking-wide text-slate-400">Mode</dt>
                                        <dd className="truncate capitalize text-slate-700">{course.mode || "—"}</dd>
                                    </div>
                                    <div className="min-w-0">
                                        <dt className="text-[10px] uppercase tracking-wide text-slate-400">Type</dt>
                                        <dd className="truncate capitalize text-slate-700">{course.courseType || "—"}</dd>
                                    </div>
                                    {dateRange && (
                                        <div className="col-span-2 min-w-0">
                                            <dt className="text-[10px] uppercase tracking-wide text-slate-400">Dates</dt>
                                            <dd className="truncate text-slate-700">{dateRange}</dd>
                                        </div>
                                    )}
                                </dl>

                                {history.length > 0 && (
                                    <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1 text-[11px] text-amber-700 ring-1 ring-amber-100">
                                        Reassigned {history.length > 1 ? `${history.length} times` : "once"}
                                        {lastReassignedAt ? ` · last on ${lastReassignedAt}` : ""}
                                    </p>
                                )}
                            </div>

                            <div className="mt-auto space-y-3 pt-1">
                                <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                                        <div
                                            className={`h-full rounded-full transition-all ${
                                                progress === 100 ? "bg-emerald-500" : "bg-[#FF6B35]"
                                            }`}
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                    <span className="shrink-0 text-xs font-semibold text-slate-500">
                                        {progress}%
                                    </span>
                                </div>

                                {isActive && status !== "discontinued" && (
                                    // Own full-width row — sharing a line with the badges is
                                    // what pushed these buttons outside the card on mobile.
                                    <div className="flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
                                        <button
                                            type="button"
                                            onClick={() => setReassignTarget(item)}
                                            title="Reassign instructor / course"
                                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-2.5 py-2 text-xs font-medium text-slate-600 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 sm:flex-none"
                                        >
                                            <FiRepeat size={13} />
                                            Reassign
                                        </button>
                                        {status === "paused" ? (
                                            <button
                                                type="button"
                                                disabled={busy}
                                                onClick={() => runLifecycle(item, resumeEnrollment)}
                                                title="Resume — the due date moves out by the paused days"
                                                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-2.5 py-2 text-xs font-medium text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-50 sm:flex-none"
                                            >
                                                <FiPlay size={13} />
                                                Resume
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                disabled={busy}
                                                onClick={() => handlePause(item)}
                                                title="Pause — freezes billing, holds the seat"
                                                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-2.5 py-2 text-xs font-medium text-amber-700 transition hover:border-amber-300 hover:bg-amber-50 disabled:opacity-50 sm:flex-none"
                                            >
                                                <FiPause size={13} />
                                                Pause
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            disabled={busy}
                                            onClick={() => handleDiscontinue(item)}
                                            title="Discontinue — final; releases the seat"
                                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-2.5 py-2 text-xs font-medium text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 disabled:opacity-50 sm:flex-none"
                                        >
                                            <FiSlash size={13} />
                                            Discontinue
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </article>
                );
            })}
        </div>

        {reassignTarget && (
            <ReassignEnrollmentModal
                enrollment={reassignTarget}
                studentId={student._id}
                onClose={() => setReassignTarget(null)}
            />
        )}
        </>
    );
};

export default CoursesTab;
