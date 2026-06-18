import { FiClock, FiUsers } from "react-icons/fi";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const DAY_LABELS = {
  monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu",
  friday: "Fri", saturday: "Sat", sunday: "Sun",
};

const SECTION_CONFIG = {
  group:      { title: "Group Sessions",      rowClass: "text-fuchsia-700 bg-fuchsia-50 border-fuchsia-100" },
  individual: { title: "Individual Sessions", rowClass: "text-violet-700 bg-violet-50 border-violet-100" },
  demo:       { title: "Demo Sessions",       rowClass: "text-pink-700 bg-pink-50 border-pink-100" },
};

const getSectionId = (slot) => {
  if (slot?.slotType === "demo") return "demo";
  if (slot?.sessionType === "premium") return "individual";
  return "group";
};

const sortDays = (days) =>
  [...days].sort((a, b) => DAYS.indexOf(a) - DAYS.indexOf(b));

const convertTo12Hour = (value) => {
  const time = String(value || "").trim();
  if (!time) return "";
  if (time === "24:00") return "12:00 AM";
  if (time.includes("AM") || time.includes("PM")) return time;
  const [hours, minutes] = time.split(":");
  const hour = Number(hours);
  if (Number.isNaN(hour)) return time;
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${period}`;
};

export default function ScheduleTab({ teacher }) {
  const slots = Array.isArray(teacher?.weeklyAvailability) ? teacher.weeklyAvailability : [];

  const courseById = (teacher?.courses || []).reduce((map, c) => {
    const id = String(c._id || c.id || "");
    if (id) map[id] = c;
    return map;
  }, {});

  const grouped = { group: [], individual: [], demo: [] };
  slots.forEach((slot) => {
    grouped[getSectionId(slot)].push(slot);
  });

  if (!slots.length) {
    return (
      <div className="p-4">
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
          <p className="text-sm font-medium text-slate-700">No schedule set</p>
          <p className="mt-1 text-sm text-slate-400">This instructor has not added any availability slots yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4">
      {["group", "individual", "demo"].map((sectionId) => {
        const sectionSlots = grouped[sectionId];
        if (!sectionSlots.length) return null;
        const config = SECTION_CONFIG[sectionId];
        return (
          <section key={sectionId}>
            <div className="mb-2 flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-700">{config.title}</h3>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                {sectionSlots.length}
              </span>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {sectionSlots.map((slot, index) => {
                const days = sortDays(Array.isArray(slot.days) ? slot.days : []);
                const courseId = String(slot.courseId?._id || slot.courseId || "");
                const course = courseById[courseId];
                const courseName = course?.name || null;
                const isLast = index === sectionSlots.length - 1;

                return (
                  <div
                    key={slot._id || index}
                    className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3 text-sm ${
                      isLast ? "" : "border-b border-slate-100"
                    }`}
                  >
                    {/* Type badge */}
                    <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${config.rowClass}`}>
                      {config.title.replace(" Sessions", "")}
                    </span>

                    {/* Days */}
                    <span className="shrink-0 font-medium text-slate-800">
                      {days.map((d) => DAY_LABELS[d] || d).join(" • ")}
                    </span>

                    {/* Time */}
                    <span className="flex shrink-0 items-center gap-1 text-slate-500">
                      <FiClock className="h-3.5 w-3.5" />
                      {convertTo12Hour(slot.startTime)} – {convertTo12Hour(slot.endTime)}
                    </span>

                    {/* Capacity */}
                    <span className="flex shrink-0 items-center gap-1 text-slate-400">
                      <FiUsers className="h-3.5 w-3.5" />
                      {slot.maxStudents} {slot.maxStudents === 1 ? "student" : "students"}
                    </span>

                    {/* Course name */}
                    {courseName && (
                      <span className="truncate text-xs text-slate-400 uppercase tracking-wide">
                        {courseName}
                      </span>
                    )}

                    {/* Status */}
                    <span className={`ml-auto shrink-0 text-xs font-medium ${
                      slot.isActive ? "text-emerald-600" : "text-slate-400"
                    }`}>
                      {slot.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
