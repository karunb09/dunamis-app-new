import { FiClock, FiUsers } from "react-icons/fi";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const DAY_SHORT = {
  monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu",
  friday: "Fri", saturday: "Sat", sunday: "Sun",
};

const SECTION_CONFIG = {
  group: { title: "Group", dot: "bg-fuchsia-500", accent: "text-fuchsia-700" },
  individual: { title: "Individual", dot: "bg-violet-500", accent: "text-violet-700" },
  demo: { title: "Demo", dot: "bg-pink-500", accent: "text-pink-700" },
};

const SECTION_ORDER = ["group", "individual", "demo"];

const getSectionId = (slot) => {
  if (slot?.slotType === "demo") return "demo";
  if (slot?.sessionType === "premium") return "individual";
  return "group";
};

const sortDays = (days) => [...days].sort((a, b) => DAYS.indexOf(a) - DAYS.indexOf(b));

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

function hexToRgba(hex, alpha = 1) {
  if (!hex) return `rgba(0,0,0,${alpha})`;
  let c = hex.replace("#", "");
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function ScheduleTab({ teacher }) {
  const slots = Array.isArray(teacher?.weeklyAvailability) ? teacher.weeklyAvailability : [];

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

  const courseById = (teacher?.courses || []).reduce((map, c) => {
    const id = String(c._id || c.id || "");
    if (id) map[id] = c;
    return map;
  }, {});

  const slotCourseId = (slot) => String(slot.courseId?._id || slot.courseId || "");

  // Group slots by course, then split each course into session-type sections.
  const groups = new Map();
  slots.forEach((slot) => {
    const cid = slotCourseId(slot);
    const course = courseById[cid];
    const key = cid || "__general__";
    if (!groups.has(key)) {
      groups.set(key, {
        name: course?.name || "General availability",
        category: course?.category || null,
        sections: { group: [], individual: [], demo: [] },
      });
    }
    groups.get(key).sections[getSectionId(slot)].push(slot);
  });

  const cards = [...groups.values()];
  cards.forEach((card) => {
    SECTION_ORDER.forEach((sec) => {
      card.sections[sec].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
    });
  });

  return (
    <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2">
      {cards.map((card, idx) => {
        const color = card.category?.color || null;
        return (
          <div key={idx} className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {/* Course header */}
            <div className="border-b border-slate-100 px-4 py-3">
              {card.category?.name && (
                <span
                  className="mb-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                  style={{
                    backgroundColor: hexToRgba(color, 0.15),
                    color: color || "#475569",
                  }}
                >
                  {card.category.icon} {card.category.name}
                </span>
              )}
              <h3 className="text-sm font-semibold break-words text-slate-800">{card.name}</h3>
            </div>

            {/* Session-type sections */}
            <div className="divide-y divide-slate-100">
              {SECTION_ORDER.map((sec) => {
                const sectionSlots = card.sections[sec];
                if (!sectionSlots.length) return null;
                const config = SECTION_CONFIG[sec];
                return (
                  <div key={sec} className="px-4 py-3">
                    <div className="mb-2 flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${config.dot}`} />
                      <span className={`text-xs font-semibold uppercase tracking-wide ${config.accent}`}>
                        {config.title}
                      </span>
                      <span className="rounded-full bg-slate-100 px-1.5 text-xs font-semibold text-slate-500">
                        {sectionSlots.length}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {sectionSlots.map((slot, i) => (
                        <div key={slot._id || i} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                          <span className="font-medium text-slate-700">
                            {sortDays(Array.isArray(slot.days) ? slot.days : [])
                              .map((d) => DAY_SHORT[d] || d)
                              .join(" • ") || "—"}
                          </span>
                          <span className="inline-flex items-center gap-1 text-slate-500">
                            <FiClock className="h-3.5 w-3.5" />
                            {convertTo12Hour(slot.startTime)}–{convertTo12Hour(slot.endTime)}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                            <FiUsers className="h-3.5 w-3.5" />
                            {Number(slot.maxStudents) >= 9999 ? "Unlimited" : slot.maxStudents}
                          </span>
                        </div>
                      ))}
                    </div>
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
