import React from "react";

const ActionProgressBar = ({ active = false, label = "Processing request..." }) => {
  if (!active) return null;

  return (
    <div className="mb-4 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-800 shadow-sm">
      <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-sky-100">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-sky-500" />
      </div>
      <p className="font-medium">{label}</p>
    </div>
  );
};

export default ActionProgressBar;
