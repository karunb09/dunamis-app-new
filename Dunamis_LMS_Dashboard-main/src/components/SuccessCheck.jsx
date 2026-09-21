import React from "react";

const SuccessCheck = ({ title, message, children, className = "" }) => (
  <div className={`flex flex-col items-center text-center ${className}`}>
    <div className="relative mb-5 flex h-20 w-20 items-center justify-center">
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-full bg-emerald-400/40 motion-safe:animate-burst-out"
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-full bg-emerald-50 ring-8 ring-emerald-50/70 motion-safe:animate-check-ring"
      />
      <svg viewBox="0 0 52 52" className="relative h-11 w-11 text-emerald-500" aria-hidden="true">
        <path
          className="motion-safe:animate-check-draw"
          d="M14 27 l8 8 l16 -18"
          fill="none"
          stroke="currentColor"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="48"
        />
      </svg>
    </div>

    <h2
      className="text-2xl font-bold text-slate-900 motion-safe:animate-fade-in-up"
      style={{ animationDelay: "150ms" }}
    >
      {title}
    </h2>

    {message ? (
      <p
        className="mt-3 max-w-sm text-sm leading-6 text-slate-500 motion-safe:animate-fade-in-up"
        style={{ animationDelay: "250ms" }}
      >
        {message}
      </p>
    ) : null}

    {children ? (
      <div className="mt-7 motion-safe:animate-fade-in-up" style={{ animationDelay: "350ms" }}>
        {children}
      </div>
    ) : null}
  </div>
);

export default SuccessCheck;
