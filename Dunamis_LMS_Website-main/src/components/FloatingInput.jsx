"use client";

export default function FloatingInput({
  id,
  label,
  icon = null,
  trailing = null,
  className = "",
  inputClassName = "",
  ...props
}) {
  return (
    <div className={`relative ${className}`}>
      {icon && (
        <span className="pointer-events-none absolute inset-y-0 left-4 z-10 flex items-center text-slate-400">
          {icon}
        </span>
      )}
      <input
        id={id}
        {...props}
        placeholder=" "
        className={`peer w-full rounded-2xl border border-slate-200 bg-white ${
          icon ? "pl-11" : "pl-4"
        } ${
          trailing ? "pr-12" : "pr-4"
        } pb-2.5 pt-6 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 ${inputClassName}`}
      />
      <label
        htmlFor={id}
        className={`pointer-events-none absolute ${
          icon ? "left-11" : "left-4"
        } top-1/2 -translate-y-1/2 text-sm text-slate-400 transition-all duration-200 peer-focus:top-3.5 peer-focus:text-[10px] peer-focus:font-semibold peer-focus:uppercase peer-focus:tracking-wide peer-focus:text-orange-500 peer-[:not(:placeholder-shown)]:top-3.5 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:font-semibold peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:tracking-wide`}
      >
        {label}
      </label>
      {trailing}
    </div>
  );
}
