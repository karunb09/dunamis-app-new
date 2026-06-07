import { FiClock, FiUsers } from "react-icons/fi";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const DAY_LABELS = {
  monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu",
  friday: "Fri", saturday: "Sat", sunday: "Sun",
};

const SECTION_CONFIG = {
  group:      { title: "Group Sessions",      badge: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100" },
  individual: { title: "Individual Sessions", badge: "bg-violet-50 text-violet-700 border-violet-100" },
  demo:       { title: "Demo Sessions",       badge: "bg-pink-50 text-pink-700 border-pink-100" },
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
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <h3 className="text-base font-semibold text-gray-900">No schedule set</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm text-gray-500">
            This instructor has not added any availability slots yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {["group", "individual", "demo"].map((sectionId) => {
        const sectionSlots = grouped[sectionId];
        if (!sectionSlots.length) return null;
        const config = SECTION_CONFIG[sectionId];
        return (
          <div key={sectionId}>
            <h3 className="mb-3 text-sm font-semibold text-gray-700">{config.title}</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sectionSlots.map((slot, index) => {
                const days = sortDays(Array.isArray(slot.days) ? slot.days : []);
                const courseId = String(slot.courseId?._id || slot.courseId || "");
                const course = courseById[courseId];
                const courseName = course?.name || null;
                return (
                  <div
                    key={slot._id || index}
                    className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${config.badge}`}>
                        {config.title.replace(" Sessions", "")}
                      </span>
                      <span className={`text-xs font-medium ${slot.isActive ? "text-green-600" : "text-gray-400"}`}>
                        {slot.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="mb-1 text-sm font-medium text-gray-900">
                      {days.map((d) => DAY_LABELS[d] || d).join(" • ")}
                    </p>
                    <div className="mb-1 flex items-center gap-1 text-sm text-gray-600">
                      <FiClock className="text-xs" />
                      <span>{convertTo12Hour(slot.startTime)} &ndash; {convertTo12Hour(slot.endTime)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <FiUsers className="text-xs" />
                      <span>{slot.maxStudents} {slot.maxStudents === 1 ? "student" : "students"} max</span>
                    </div>
                    {courseName && (
                      <p className="mt-2 truncate text-xs text-gray-400">{courseName}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
