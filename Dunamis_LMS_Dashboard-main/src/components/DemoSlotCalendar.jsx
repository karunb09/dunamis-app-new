import React, { useEffect, useMemo, useState } from "react";
import { FiChevronLeft, FiChevronRight, FiClock, FiUser } from "react-icons/fi";

// Local calendar day, not UTC — a slot at 9am IST belongs to that IST day.
const dayKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
};

const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const instructorName = (slot) => {
  const name = slot?.createdBy?.userId?.name;
  const full = `${name?.firstName || ""} ${name?.lastName || ""}`.trim();
  return full || "Instructor";
};

// Month grid + the chosen day's times. A flat list of every open slot runs to
// dozens of rows across three weeks; this shows which days have anything at a
// glance and only expands one day's times.
const DemoSlotCalendar = ({ slots, selectedId, onSelect }) => {
  const byDay = useMemo(() => {
    const map = new Map();
    slots.forEach((slot) => {
      const key = dayKey(slot.date);
      if (!key) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(slot);
    });
    map.forEach((list) =>
      list.sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)))
    );
    return map;
  }, [slots]);

  const availableDays = useMemo(() => [...byDay.keys()].sort(), [byDay]);

  const [viewMonth, setViewMonth] = useState(null);
  const [selectedDay, setSelectedDay] = useState("");

  // Open on the first day that actually has something.
  useEffect(() => {
    if (!availableDays.length) {
      setViewMonth(null);
      setSelectedDay("");
      return;
    }
    const [year, month] = availableDays[0].split("-").map(Number);
    setViewMonth(new Date(year, month - 1, 1));
    setSelectedDay(availableDays[0]);
  }, [availableDays]);

  const bounds = useMemo(() => {
    if (!availableDays.length) return null;
    const toMonth = (key) => {
      const [year, month] = key.split("-").map(Number);
      return new Date(year, month - 1, 1);
    };
    return {
      first: toMonth(availableDays[0]),
      last: toMonth(availableDays[availableDays.length - 1]),
    };
  }, [availableDays]);

  const cells = useMemo(() => {
    if (!viewMonth) return [];
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    // Monday-first: JS getDay() is Sunday-first.
    const leading = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    return [
      ...Array.from({ length: leading }, () => null),
      ...Array.from({ length: daysInMonth }, (_, i) => {
        const key = dayKey(new Date(year, month, i + 1));
        return { key, dayOfMonth: i + 1, count: byDay.get(key)?.length || 0 };
      }),
    ];
  }, [viewMonth, byDay]);

  if (!availableDays.length) return null;

  const canGoBack = bounds && viewMonth && monthKey(viewMonth) > monthKey(bounds.first);
  const canGoForward = bounds && viewMonth && monthKey(viewMonth) < monthKey(bounds.last);
  const shiftMonth = (delta) =>
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));

  const daySlots = byDay.get(selectedDay) || [];

  return (
    <div>
      <div className="rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            disabled={!canGoBack}
            aria-label="Previous month"
            className="rounded-full p-1.5 text-slate-600 transition hover:bg-slate-100 disabled:opacity-30"
          >
            <FiChevronLeft className="h-5 w-5" />
          </button>
          <p className="text-sm font-semibold text-slate-900">
            {viewMonth?.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
          </p>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            disabled={!canGoForward}
            aria-label="Next month"
            className="rounded-full p-1.5 text-slate-600 transition hover:bg-slate-100 disabled:opacity-30"
          >
            <FiChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((day) => (
            <span key={day} className="py-1 text-[11px] font-semibold text-slate-400">
              {day}
            </span>
          ))}

          {cells.map((cell, index) => {
            if (!cell) return <span key={`blank-${index}`} />;

            const isSelected = cell.key === selectedDay;
            const hasSlots = cell.count > 0;

            return (
              <button
                key={cell.key}
                type="button"
                disabled={!hasSlots}
                onClick={() => setSelectedDay(cell.key)}
                className={`relative flex h-10 flex-col items-center justify-center rounded-xl text-sm transition ${
                  isSelected
                    ? "bg-[#FF6B35] font-semibold text-white"
                    : hasSlots
                    ? "font-medium text-slate-800 hover:bg-orange-50"
                    : "text-slate-300"
                }`}
              >
                {cell.dayOfMonth}
                {hasSlots && (
                  <span
                    className={`absolute bottom-1.5 h-1 w-1 rounded-full ${
                      isSelected ? "bg-white" : "bg-[#FF6B35]"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {daySlots.length} time{daySlots.length === 1 ? "" : "s"} available
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {daySlots.map((slot) => {
            const isSelected = String(slot._id) === selectedId;
            return (
              <button
                key={slot._id}
                type="button"
                onClick={() => onSelect(String(slot._id))}
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  isSelected
                    ? "border-orange-300 bg-orange-50"
                    : "border-slate-200 hover:border-orange-200"
                }`}
              >
                <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <FiClock className="h-4 w-4 text-orange-500" />
                  {slot.startTime} – {slot.endTime}
                </p>
                <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                  <FiUser className="h-3.5 w-3.5" />
                  {instructorName(slot)}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DemoSlotCalendar;
