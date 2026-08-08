import React from "react";

const FunnelBar = ({ stages = [] }) => {
  const max = Math.max(...stages.map((s) => s.value), 1);

  return (
    <div className="space-y-3">
      {stages.map((stage) => {
        const pct = Math.max(4, Math.round((stage.value / max) * 100));
        return (
          <div key={stage.key}>
            <div className="mb-1 flex items-baseline justify-between text-xs">
              <span className="font-medium text-slate-600">{stage.label}</span>
              {stage.rateFromPrev != null && (
                <span className="text-slate-400">{stage.rateFromPrev}% of previous stage</span>
              )}
            </div>
            <div className="h-8 rounded-xl bg-slate-100">
              <div
                className="flex h-8 items-center rounded-xl bg-orange-400 px-3 text-sm font-semibold text-white transition-all"
                style={{ width: `${pct}%` }}
              >
                {stage.value.toLocaleString("en-IN")}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default FunnelBar;
