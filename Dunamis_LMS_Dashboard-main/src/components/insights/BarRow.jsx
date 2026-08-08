import React from "react";

const TONE_CLASSES = {
  orange: "bg-orange-400",
  emerald: "bg-emerald-400",
  rose: "bg-rose-400",
  amber: "bg-amber-400",
  slate: "bg-slate-400",
  sky: "bg-sky-400",
};

const BarRow = ({ label, value, displayValue, max, tone = "orange" }) => {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;

  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="w-32 shrink-0 truncate text-xs text-slate-500" title={label}>
        {label}
      </span>
      <div className="h-2 flex-1 rounded-full bg-slate-100">
        <div className={`h-2 rounded-full ${TONE_CLASSES[tone] || TONE_CLASSES.orange}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-20 shrink-0 text-right text-xs font-semibold text-slate-700">
        {displayValue ?? value}
      </span>
    </div>
  );
};

export default BarRow;
