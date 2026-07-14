import { useMemo, useState } from "react";
import { FiClock, FiUsers } from "react-icons/fi";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const DAY_LABELS = {
  monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday",
  friday: "Friday", saturday: "Saturday", sunday: "Sunday",
};

const DAY_SHORT = {
  monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu",
  friday: "Fri", saturday: "Sat", sunday: "Sun",
};

const TYPE_CONFIG = {
  group: { label: "Group", dot: "bg-fuchsia-500", chip: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800" },
  individual: { label: "Individual", dot: "bg-violet-500", chip: "border-violet-200 bg-violet-50 text-violet-800" },
  demo: { label: "Demo", dot: "bg-pink-500", chip: "border-pink-200 bg-pink-50 text-pink-800" },
};

const TYPE_ORDER = ["group", "individual", "demo"];

const getType = (slot) => {
  if (slot?.slotType === "demo") return "demo";
  if (slot?.sessionType === "premium") return "individual";
  return "group";
};

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

const toMinutes = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return 0;
  const meridiem = raw.match(/(am|pm)/i);
  const [h, m] = raw.replace(/\s*(am|pm)/i, "").split(":").map((n) => parseInt(n, 10) || 0);
  let hour = h;
  if (meridiem) {
    const isPM = /pm/i.test(meridiem[0]);
    if (isPM && hour < 12) hour += 12;
    if (!isPM && hour === 12) hour = 0;
  }
  return hour * 60 + m;
};

export default function ScheduleTab({ teacher }) {
  const slots = Array.isArray(teacher?.weeklyAvailability) ? teacher.weeklyAvailability : [];

  const courseById = useMemo(
    () =>
      (teacher?.courses || []).reduce((map, c) => {
        const id = String(c._id || c.id || "");
        if (id) map[id] = c;
        return map;
      }, {}),
    [teacher]
  );

  const slotCourseId = (slot) => String(slot.courseId?._id || slot.courseId || "");

  const [typeFilter, setTypeFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");

  const typeCounts = useMemo(() => {
    const counts = { group: 0, individual: 0, demo: 0 };
    slots.forEach((s) => { counts[getType(s)] += 1; });
    return counts;
  }, [slots]);

  const courseOptions = useMemo(() => {
    const map = new Map();
    slots.forEach((s) => {
      const id = slotCourseId(s);
      if (id && courseById[id] && !map.has(id)) {
        map.set(id, courseById[id].name || "Course");
      }
    });
    return [...map.entries()];
  }, [slots, courseById]);

  const filtered = slots.filter((s) => {
    if (typeFilter !== "all" && getType(s) !== typeFilter) return false;
    if (courseFilter !== "all" && slotCourseId(s) !== courseFilter) return false;
    return true;
  });

  const byDay = DAYS.map((day) => ({
    day,
    daySlots: filtered
      .filter((s) => Array.isArray(s.days) && s.days.includes(day))
      .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime)),
  }));

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

  const filterChip = (active) =>
    `inline-flex items-center gap-1.5 rounded-2xl border px-3 py-1.5 text-sm font-medium transition ${
      active
        ? "border-orange-300 bg-orange-50 text-orange-700"
        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
    }`;

  return (
    <div className="space-y-4 p-4">
      {/* Filter bar — chips double as the type legend */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button className={filterChip(typeFilter === "all")} onClick={() => setTypeFilter("all")}>
            All
            <span className="rounded-full bg-slate-100 px-1.5 text-xs font-semibold text-slate-500">{slots.length}</span>
          </button>
          {TYPE_ORDER.map((type) => (
            <button key={type} className={filterChip(typeFilter === type)} onClick={() => setTypeFilter(type)}>
              <span className={`h-2 w-2 rounded-full ${TYPE_CONFIG[type].dot}`} />
              {TYPE_CONFIG[type].label}
              <span className="rounded-full bg-slate-100 px-1.5 text-xs font-semibold text-slate-500">{typeCounts[type]}</span>
            </button>
          ))}
        </div>

        {courseOptions.length > 1 && (
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
          >
            <option value="all">All courses</option>
            {courseOptions.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Weekly agenda — one row per day, sessions sorted by start time */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {byDay.map(({ day, daySlots }, index) => (
          <div
            key={day}
            className={`flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center ${
              index === byDay.length - 1 ? "" : "border-b border-slate-100"
            } ${daySlots.length ? "" : "bg-slate-50/50"}`}
          >
            <div className="flex w-full shrink-0 items-center gap-2 sm:w-28">
              <span className="flex h-7 w-11 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600">
                {DAY_SHORT[day]}
              </span>
              <span className="text-sm font-medium text-slate-700 sm:hidden">{DAY_LABELS[day]}</span>
            </div>

            {daySlots.length ? (
              <div className="flex flex-1 flex-wrap gap-2">
                {daySlots.map((slot, i) => {
                  const type = getType(slot);
                  const config = TYPE_CONFIG[type];
                  const courseName = courseById[slotCourseId(slot)]?.name;
                  return (
                    <div
                      key={slot._id || i}
                      className={`inline-flex items-center gap-2 rounded-xl border px-2.5 py-1.5 ${config.chip}`}
                    >
                      <span className={`h-2 w-2 shrink-0 rounded-full ${config.dot}`} />
                      <span className="inline-flex items-center gap-1 text-xs font-semibold">
                        <FiClock className="h-3 w-3 opacity-60" />
                        {convertTo12Hour(slot.startTime)}–{convertTo12Hour(slot.endTime)}
                      </span>
                      {courseName && (
                        <span className="max-w-[140px] truncate text-[11px] font-medium opacity-70">· {courseName}</span>
                      )}
                      <span className="inline-flex items-center gap-0.5 text-[11px] opacity-70">
                        <FiUsers className="h-3 w-3" />
                        {slot.maxStudents}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <span className="text-xs text-slate-300">No sessions</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
