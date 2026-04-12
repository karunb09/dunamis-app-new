import React from "react";
import { FaSpinner } from "react-icons/fa";

const toneClasses = {
  amber: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
  sky: "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100",
  rose: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
  slate: "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
};

const IconActionButton = ({
  label,
  icon,
  onClick,
  tone = "slate",
  disabled = false,
  isLoading = false,
}) => {
  const buttonTone = toneClasses[tone] || toneClasses.slate;

  return (
    <div className="group relative">
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={onClick}
        disabled={disabled}
        className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${buttonTone}`}
      >
        {isLoading ? <FaSpinner className="animate-spin" /> : icon}
      </button>

      <span className="pointer-events-none absolute -top-10 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-within:opacity-100">
        {isLoading ? `Processing ${label}` : label}
      </span>
    </div>
  );
};

export default IconActionButton;
