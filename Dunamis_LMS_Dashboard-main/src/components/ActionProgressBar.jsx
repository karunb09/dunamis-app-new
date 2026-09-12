import React from "react";

const ActionProgressBar = ({ active = false, label = "Processing request..." }) => {
  if (!active) return null;

  return (
    <div className="mb-4 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-800 shadow-sm motion-safe:animate-fade-in">
      <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-sky-100">
        <div className="h-full w-2/5 rounded-full bg-sky-500 motion-safe:animate-indeterminate motion-reduce:animate-pulse" />
      </div>
      <p className="font-medium">{label}</p>
    </div>
  );
};

export default ActionProgressBar;
