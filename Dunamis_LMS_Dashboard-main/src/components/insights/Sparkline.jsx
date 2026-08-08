import React from "react";

// preserveAspectRatio="none" lets the polyline fill the tile's width exactly,
// which stretches the stroke non-uniformly unless vectorEffect counteracts it.
const Sparkline = ({ data = [], label = "", height = 32, className = "" }) => {
  const values = data.map((d) => d.value);
  const n = values.length;

  if (n < 2) {
    return (
      <div
        className={`w-full rounded-full bg-slate-100 ${className}`}
        style={{ height: 2 }}
        role="img"
        aria-label={`${label} trend: not enough data`}
      />
    );
  }

  const max = Math.max(...values, 1);
  const points = values.map((v, i) => {
    const x = (i / (n - 1)) * 100;
    const y = 31 - (v / max) * 30;
    return `${x},${y}`;
  });
  const polygonPoints = `0,32 ${points.join(" ")} 100,32`;

  return (
    <svg
      viewBox="0 0 100 32"
      preserveAspectRatio="none"
      className={`w-full ${className}`}
      style={{ height }}
      role="img"
      aria-label={`${label} trend: ${values[0]} to ${values[n - 1]} over ${n} months`}
    >
      <polygon points={polygonPoints} fill="currentColor" opacity="0.12" />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
};

export default Sparkline;
