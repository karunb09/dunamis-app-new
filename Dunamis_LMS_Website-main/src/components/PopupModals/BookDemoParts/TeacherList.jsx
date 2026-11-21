"use client";

import { HiCheck, HiPlay, HiStar } from "react-icons/hi";
import { getInitialsImage } from "@/lib/resolveImageUrl";
import { slotLabel } from "./demoTimes";

export default function TeacherList({ teachers, selectedId, onSelect, onWatch }) {
  return (
    <ul className="grid gap-3 lg:grid-cols-2">
      {teachers.map((teacher) => {
        const selected = teacher.id === selectedId;
        return (
          <li key={teacher.id} className="relative">
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(teacher.id)}
              className={`flex min-h-16 w-full items-center gap-3 rounded-2xl border-2 p-3 pr-12 text-left transition ${
                teacher.profileVideo ? "pb-14" : ""
              } ${
                selected
                  ? "border-[#FF6B35] bg-orange-50"
                  : "border-slate-200 bg-white hover:border-orange-200"
              }`}
            >
              <img
                src={teacher.profilePicture || getInitialsImage(teacher.name)}
                alt=""
                className="h-14 w-14 shrink-0 rounded-xl object-cover object-top"
                onError={(event) => {
                  event.currentTarget.src = getInitialsImage(teacher.name);
                }}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-semibold text-slate-900">
                  {teacher.name}
                </span>
                {teacher.averageRating ? (
                  <span className="flex items-center gap-1 text-sm text-slate-700">
                    <HiStar className="text-amber-500" aria-hidden="true" />
                    {teacher.averageRating.toFixed(1)}
                  </span>
                ) : null}
                <span className="block text-sm text-slate-600">
                  Earliest: {slotLabel(teacher.upcoming[0])}
                </span>
              </span>
            </button>
            {selected ? (
              <span className="pointer-events-none absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#CC3700] text-white">
                <HiCheck aria-hidden="true" />
                <span className="sr-only">Selected</span>
              </span>
            ) : null}
            {teacher.profileVideo ? (
              <button
                type="button"
                onClick={() => onWatch(teacher)}
                className="absolute bottom-1 left-[4.25rem] flex min-h-12 items-center gap-1 rounded-full px-3 text-sm font-semibold text-[#c2410c] transition hover:bg-orange-100"
              >
                <HiPlay aria-hidden="true" />
                Watch intro
              </button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
