"use client";

import { useState } from "react";
import { HiCheck } from "react-icons/hi";
import { PARTS_OF_DAY, dayDate, dayName, partOfDay, timeLabel } from "./demoTimes";

const FIRST_DAYS = 8;

// Days and times as wrapping grids: nothing hides in a sideways scroll.
export default function DateTimePicker({ days, selectedDay, onSelectDay, selectedSlotId, onSelectSlot, dayHeading, timeHeading }) {
  const [showAllDays, setShowAllDays] = useState(false);
  const dayKeys = [...days.keys()];
  const selectedIndex = dayKeys.indexOf(selectedDay);
  const visibleDays =
    showAllDays || selectedIndex >= FIRST_DAYS ? dayKeys : dayKeys.slice(0, FIRST_DAYS);
  const times = days.get(selectedDay) || [];

  return (
    <>
      <section>
        {dayHeading}
        <div className="grid grid-cols-4 gap-2">
          {visibleDays.map((dayKey) => {
            const selected = dayKey === selectedDay;
            return (
              <button
                key={dayKey}
                type="button"
                aria-pressed={selected}
                onClick={() => onSelectDay(dayKey)}
                className={`relative flex min-h-14 flex-col items-center justify-center rounded-2xl border-2 px-1 py-2 text-center transition ${
                  selected
                    ? "border-[#CC3700] bg-[#CC3700] text-white"
                    : "border-slate-200 bg-white text-slate-900 hover:border-orange-200"
                }`}
              >
                <span className="text-[15px] font-semibold leading-tight">{dayName(dayKey)}</span>
                <span className={`text-[13px] leading-tight ${selected ? "text-white" : "text-slate-600"}`}>
                  {dayDate(dayKey)}
                </span>
                {selected ? (
                  <span aria-hidden="true" className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#CC3700] ring-2 ring-[#CC3700]">
                    <HiCheck className="text-xs" />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        {visibleDays.length < dayKeys.length ? (
          <button
            type="button"
            onClick={() => setShowAllDays(true)}
            className="mt-2 min-h-12 w-full rounded-2xl border-2 border-dashed border-slate-300 text-[15px] font-semibold text-slate-700 transition hover:border-orange-300"
          >
            More days
          </button>
        ) : null}
      </section>

      <section>
        {timeHeading}
        <div className="space-y-4">
          {PARTS_OF_DAY.map((part) => {
            const partTimes = times.filter((slot) => partOfDay(slot.startMinutes) === part.key);
            if (!partTimes.length) return null;
            return (
              <div key={part.key}>
                <p className="mb-2 text-sm font-semibold text-slate-600">{part.label}</p>
                <div className="grid grid-cols-3 gap-2">
                  {partTimes.map((slot) => {
                    const selected = slot.id === selectedSlotId;
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => onSelectSlot(slot.id)}
                        className={`relative min-h-12 rounded-2xl border-2 px-1 text-[15px] font-semibold transition ${
                          selected
                            ? "border-[#CC3700] bg-[#CC3700] text-white"
                            : "border-slate-200 bg-white text-slate-900 hover:border-orange-200"
                        }`}
                      >
                        {timeLabel(slot)}
                        {selected ? (
                          <span aria-hidden="true" className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#CC3700] ring-2 ring-[#CC3700]">
                            <HiCheck className="text-xs" />
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
