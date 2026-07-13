import { FiCalendar } from "react-icons/fi";

const formatDays = (slot) => {
  const days = Array.isArray(slot?.day)
    ? slot.day
    : Array.isArray(slot?.recurringDays)
      ? slot.recurringDays
      : slot?.day
        ? [slot.day]
        : [];
  return days
    .map((d) => (typeof d === "string" ? d.charAt(0).toUpperCase() + d.slice(1) : d))
    .join(" / ");
};

const SchedulesTab = ({ student }) => {
  const courses = Array.isArray(student?.enrolledCourses) ? student.enrolledCourses : [];
  const schedules = courses
    .filter((course) => course?.slotDetails)
    .map((course, idx) => {
      const slot = course.slotDetails;
      return {
        id: course._id || idx,
        courseTitle: course.courseId?.name || course.courseId?.title || "Course",
        days: formatDays(slot) || "—",
        time: [slot.startTime, slot.endTime].filter(Boolean).join(" – ") || "—",
        sessionType: slot.sessionType || "",
        teacherName: slot.teacherName || "",
        since: course.joinedAt ? new Date(course.joinedAt).toLocaleDateString() : "",
      };
    });

  if (!schedules.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 py-16 text-center">
        <FiCalendar className="mb-3 text-3xl text-slate-300" />
        <p className="text-sm font-medium text-slate-500">No class schedule yet</p>
        <p className="mt-1 text-xs text-slate-400">
          A schedule appears once the student is enrolled in a recurring class.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
      {schedules.map((schedule) => (
        <div
          key={schedule.id}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
            <div className="text-sm font-medium text-slate-800">
              {schedule.days}
              <div className="text-xs text-slate-500">{schedule.time}</div>
            </div>
            {schedule.sessionType && (
              <span className="rounded-full bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700 ring-1 ring-orange-200">
                {schedule.sessionType}
              </span>
            )}
          </div>
          <div className="px-4 py-3">
            <h3 className="text-base font-semibold text-slate-900">{schedule.courseTitle}</h3>
            {schedule.teacherName && (
              <p className="mt-0.5 text-sm text-slate-600">with {schedule.teacherName}</p>
            )}
            {schedule.since && (
              <p className="mt-2 text-xs text-slate-400">Since {schedule.since}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SchedulesTab;
