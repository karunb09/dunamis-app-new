import React from "react";
import { FiArrowUp, FiArrowDown } from "react-icons/fi";
import Sparkline from "./Sparkline";

const defaultFormat = (v) => (v ?? 0).toLocaleString("en-IN");

const StatTile = ({
  label,
  current = 0,
  delta = 0,
  deltaPct = null,
  series = [],
  format = defaultFormat,
  suffix = "",
}) => {
  const up = delta > 0;
  const down = delta < 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">
        {format(current)}
        {suffix}
      </p>
      <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold">
        {!up && !down ? (
          <span className="text-slate-400">— no change</span>
        ) : (
          <span className={`flex items-center gap-1 ${up ? "text-emerald-600" : "text-rose-600"}`}>
            {up ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />}
            {Math.abs(delta).toLocaleString("en-IN")}
            {deltaPct != null && ` (${Math.abs(deltaPct)}%)`}
          </span>
        )}
      </div>
      {series.length > 1 && (
        <div className="mt-3 text-orange-500">
          <Sparkline data={series} label={label} />
        </div>
      )}
    </div>
  );
};

export default StatTile;
