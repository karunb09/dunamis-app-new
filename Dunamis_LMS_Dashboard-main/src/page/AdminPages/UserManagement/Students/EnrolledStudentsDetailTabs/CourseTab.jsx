import { useState } from "react";
import { FiPause, FiPlay, FiRepeat, FiSlash } from "react-icons/fi";
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
    completed: "bg-green-100 text-green-700",
    "in-progress": "bg-blue-100 text-blue-700",
    paused: "bg-amber-100 text-amber-700",
    discontinued: "bg-slate-200 text-slate-600",
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
        return <p className="text-gray-500">No courses enrolled.</p>;
    }

    // Active enrollments (current class) lead the grid; reassigned-away
    // entries trail behind as disabled history cards.
    const sortedCourses = [...enrolledCourses].sort(
        (a, b) => (b.active !== false ? 1 : 0) - (a.active !== false ? 1 : 0)
    );

    return (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sortedCourses.map((item) => {
                const course = item.courseId;
                const isActive = item.active !== false;

                if (!course) {
                    console.warn("Skipping enrollment with null courseId:", item);
                    return null;
                }

                const progress = item.progress || 0;
                const status = item.status || "in-progress";

                // Get category details (can be null)
                const categoryName = course.category?.name || "N/A";
                const categoryIcon = course.category?.icon || "";
                const categoryColor = course.category?.color || "#3b82f6";
                const categoryBgColor = hexToRgba(categoryColor, 0.2);

                // Format dates
                const startDate = course.startDate
                    ? new Date(course.startDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    })
                    : "-";
                const endDate = course.endDate
                    ? new Date(course.endDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    })
                    : "-";

                return (
                    <div
                        key={item._id}
                        className={`flex bg-white rounded-xl overflow-hidden shadow-sm border ${
                            isActive ? "border-gray-200" : "border-gray-200 opacity-60 grayscale"
                        }`}
                    >
                        <img
                            src={resolveImageUrl(course.image, "/placeholder.png")}
                            alt={course.name}
                            className="h-full w-24 shrink-0 object-cover sm:w-28"
                        />
                        <div className="p-3 flex flex-col justify-between flex-1 min-w-0">
                            <div>
                                <div className="flex items-start justify-between gap-2 mb-1.5">
                                    <div className="flex gap-1.5 flex-wrap">
                                        {/* Category badge with dynamic color */}
                                        <span
                                            className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full"
                                            style={{
                                                backgroundColor: categoryBgColor,
                                                color: categoryColor
                                            }}
                                        >
                                            <span>{categoryIcon}</span>
                                            <span>{categoryName}</span>
                                        </span>

                                        {/* Level badge */}
                                        <span className="text-[11px] bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full capitalize">
                                            {course.level}
                                        </span>

                                        {/* Status badge */}
                                        {isActive ? (
                                            <span
                                                className={`text-[11px] px-2 py-0.5 rounded-full capitalize ${
                                                    STATUS_BADGE[status] || "bg-gray-100 text-gray-700"
                                                }`}
                                            >
                                                {status.replace('-', ' ')}
                                            </span>
                                        ) : (
                                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 font-medium">
                                                Reassigned — inactive
                                            </span>
                                        )}
                                    </div>

                                    {isActive && status !== "discontinued" && (
                                        <div className="flex shrink-0 flex-wrap items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => setReassignTarget(item)}
                                                title="Reassign instructor / course"
                                                className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-600 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"
                                            >
                                                <FiRepeat size={11} />
                                                Reassign
                                            </button>
                                            {status === "paused" ? (
                                                <button
                                                    type="button"
                                                    disabled={busyId === item._id}
                                                    onClick={() => runLifecycle(item, resumeEnrollment)}
                                                    title="Resume — the due date moves out by the paused days"
                                                    className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-0.5 text-[11px] font-medium text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-50"
                                                >
                                                    <FiPlay size={11} />
                                                    Resume
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    disabled={busyId === item._id}
                                                    onClick={() => handlePause(item)}
                                                    title="Pause — freezes billing, holds the seat"
                                                    className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-0.5 text-[11px] font-medium text-amber-700 hover:border-amber-300 hover:bg-amber-50 disabled:opacity-50"
                                                >
                                                    <FiPause size={11} />
                                                    Pause
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                disabled={busyId === item._id}
                                                onClick={() => handleDiscontinue(item)}
                                                title="Discontinue — final; releases the seat"
                                                className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-0.5 text-[11px] font-medium text-rose-600 hover:border-rose-300 hover:bg-rose-50 disabled:opacity-50"
                                            >
                                                <FiSlash size={11} />
                                                Discontinue
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Course name */}
                                <h3 className="text-sm font-semibold text-gray-900 break-words">
                                    {course.name}
                                </h3>

                                {/* Course code */}
                                <p className="text-xs text-gray-500">
                                    Code: {course.code}
                                </p>

                                {/* Date range */}
                                <p className="text-xs text-gray-400 mt-1">
                                    {startDate} - {endDate}
                                </p>

                                {/* Mode and Type */}
                                <p className="text-xs text-gray-500 mt-1">
                                    Mode: <span className="capitalize">{course.mode}</span> • Type: <span className="capitalize">{course.courseType}</span>
                                </p>

                                {/* Reassignment history, if any */}
                                {(() => {
                                    const history = (student?.reassignmentHistory || []).filter(
                                        (h) => String(h.toCourseId?._id || h.toCourseId) === String(course._id)
                                    );
                                    if (!history.length) return null;
                                    const last = history[history.length - 1];
                                    return (
                                        <p className="text-[11px] text-amber-600 mt-1">
                                            Reassigned {history.length > 1 ? `${history.length} times` : "once"}
                                            {last?.reassignedAt
                                                ? ` · last on ${new Date(last.reassignedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                                                : ""}
                                        </p>
                                    );
                                })()}
                            </div>

                            {/* Progress bar */}
                            <div className="mt-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className={`h-2 rounded-full transition-all ${progress === 100 ? 'bg-green-600' : 'bg-blue-600'
                                                }`}
                                            style={{ width: `${progress}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
                                        {progress}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
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
