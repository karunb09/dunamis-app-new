import React from "react";
import AnimatedNumber from "../AnimatedNumber";

const defaultFormat = (v) => (v ?? 0).toLocaleString("en-IN");

// A plain count. `alert` turns a non-zero value rose — for the counts that go
// against an instructor.
const CountTile = ({ label, value = 0, alert = false, format = defaultFormat, hint }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 transition-shadow duration-300 hover:shadow-[0_18px_40px_-24px_rgba(15,23,42,0.3)]">
    <p className="text-xs font-medium text-slate-500">{label}</p>
    <p
      className={`mt-1 text-2xl font-bold tabular-nums ${
        alert && value > 0 ? "text-rose-600" : "text-slate-900"
      }`}
    >
      <AnimatedNumber value={value} format={format} />
    </p>
    {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
  </div>
);

export default CountTile;
