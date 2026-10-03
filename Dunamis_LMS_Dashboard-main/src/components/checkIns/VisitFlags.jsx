import React from "react";
import { dayFlags, visitFlags } from "./visitFlagList";

const TONES = {
  rose: "bg-rose-50 text-rose-700 ring-rose-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  sky: "bg-sky-50 text-sky-700 ring-sky-200",
  slate: "bg-slate-50 text-slate-500 ring-slate-200",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

export const Pill = ({ tone = "slate", children }) => (
  <span
    className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${TONES[tone]}`}
  >
    {children}
  </span>
);

const FlagPills = ({ flags, isOpen }) => {
  if (isOpen && !flags.length) return <Pill tone="sky">Checked in</Pill>;
  if (!flags.length) return <Pill tone="emerald">On time</Pill>;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {isOpen && <Pill tone="sky">Checked in</Pill>}
      {flags.map((flag) => (
        <Pill key={flag.key} tone={flag.tone}>
          {flag.label}
        </Pill>
      ))}
    </div>
  );
};

export const DayFlags = ({ day }) => <FlagPills flags={dayFlags(day)} isOpen={day.isOpen} />;

const VisitFlags = ({ visit }) => <FlagPills flags={visitFlags(visit)} isOpen={visit.isOpen} />;

export default VisitFlags;
