"use client";

const CONFETTI = [
  { dx: "-58px", dy: "-34px", delay: "0.15s", color: "bg-orange-400" },
  { dx: "54px", dy: "-40px", delay: "0.2s", color: "bg-emerald-400" },
  { dx: "-40px", dy: "34px", delay: "0.25s", color: "bg-[#47c9c4]" },
  { dx: "44px", dy: "30px", delay: "0.3s", color: "bg-amber-400" },
  { dx: "0px", dy: "-56px", delay: "0.18s", color: "bg-orange-500" },
  { dx: "-62px", dy: "6px", delay: "0.28s", color: "bg-[#a855f7]" },
];

export default function SuccessSplash({ title, message, children, className = "" }) {
  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      <div className="relative mb-5 flex h-20 w-20 items-center justify-center">
        <span aria-hidden="true" className="burst-out absolute inset-0 rounded-full bg-emerald-400/40" />
        <span
          aria-hidden="true"
          className="check-ring absolute inset-0 rounded-full bg-emerald-50 ring-8 ring-emerald-50/70"
        />
        {CONFETTI.map((bit, index) => (
          <span
            key={index}
            aria-hidden="true"
            className={`confetti-bit absolute h-2 w-2 rounded-full ${bit.color}`}
            style={{ "--dx": bit.dx, "--dy": bit.dy, "--delay": bit.delay }}
          />
        ))}
        <svg viewBox="0 0 52 52" className="relative h-11 w-11 text-emerald-500" aria-hidden="true">
          <path
            className="check-draw"
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

      <h2 className="enter-up text-2xl font-bold text-slate-950 sm:text-3xl" style={{ animationDelay: "0.15s" }}>
        {title}
      </h2>

      {message ? (
        <p className="enter-up mt-3 max-w-sm text-sm leading-6 text-slate-500" style={{ animationDelay: "0.25s" }}>
          {message}
        </p>
      ) : null}

      {children ? (
        <div className="enter-up mt-8" style={{ animationDelay: "0.35s" }}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
