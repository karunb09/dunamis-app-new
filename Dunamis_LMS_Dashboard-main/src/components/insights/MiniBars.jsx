import React from "react";

const MiniBars = ({ data = [], height = 80, className = "" }) => {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className={`flex items-end gap-1 ${className}`} style={{ height }}>
      {data.map((d, index) => (
        <div key={d.month} className="group relative flex h-full flex-1 items-end">
          <div
            className="w-full rounded-t bg-orange-400/80 transition-[height,background-color] duration-500 ease-out-expo group-hover:bg-orange-500 motion-safe:animate-grow-height"
            style={{ height: `${Math.max(2, (d.value / max) * 100)}%`, animationDelay: `${index * 40}ms` }}
          />
          <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-1.5 py-0.5 text-[10px] text-white group-hover:block">
            {d.month}: {d.value.toLocaleString("en-IN")}
          </span>
        </div>
      ))}
    </div>
  );
};

export default MiniBars;
