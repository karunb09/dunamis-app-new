import React from "react";
import { FiAlertTriangle, FiInbox, FiLogOut, FiNavigation, FiRefreshCw } from "react-icons/fi";
import PageTabBar from "../PageTabBar";
import { formatDistance, formatTime } from "../../utils/checkInFormat";
import { fenceFor } from "./checkInHooks";
import { Pill } from "./VisitFlags";

// The pieces instructor and staff check-in share: page shell, location strip,
// branch picker card, open-visit card.

const SHELL_TABS = [
  { id: "today", label: "Today" },
  { id: "history", label: "History" },
];

export const CheckInShell = ({ tab, onTabChange, children }) => (
  <div className="mx-auto max-w-3xl space-y-6">
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">Branch check-in</p>
      <h1 className="text-2xl font-bold text-slate-900">Check in at your branch</h1>
      <p className="mt-1 text-sm text-slate-500">
        Tap when you arrive and again when you leave. The time and your location are recorded when
        you tap, and can't be changed afterwards.
      </p>
    </div>
    <PageTabBar tabs={SHELL_TABS} activeTab={tab} onChange={onTabChange} />
    {children}
  </div>
);

export const EmptyBox = ({ title = "Nothing here yet", text }) => (
  <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-slate-400">
    <FiInbox className="text-2xl" />
    <p className="text-sm font-medium text-slate-500">{title}</p>
    <p className="max-w-sm text-xs">{text}</p>
  </div>
);

export const LoadingBlocks = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-16 rounded-2xl bg-slate-100" />
    <div className="h-56 rounded-[30px] bg-slate-100" />
    <div className="h-40 rounded-2xl bg-slate-100" />
  </div>
);

export const LoadError = ({ title, error, onRetry }) => (
  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
    <p className="font-semibold text-rose-700">{title}</p>
    <p className="mt-1 text-sm text-rose-600">{error?.message}</p>
    <button
      onClick={onRetry}
      className="mt-4 rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-700"
    >
      Retry
    </button>
  </div>
);

export const LocationStrip = ({ fix, locating, error, onRefresh }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
    <div className="flex min-w-0 items-center gap-3">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          error ? "bg-rose-50 text-rose-600" : "bg-orange-50 text-[#FF6B35]"
        }`}
      >
        <FiNavigation />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-800">
          {locating
            ? "Finding your location…"
            : error
              ? "Location unavailable"
              : fix
                ? `Location found · accurate to ±${fix.accuracyM} m`
                : "Location not read yet"}
        </p>
        <p className="text-xs text-slate-500">
          {error ||
            (fix
              ? `Read at ${formatTime(fix.deviceTime, { seconds: true })}. A fresh reading is taken when you tap.`
              : "Your location is only read when this page asks for it.")}
        </p>
      </div>
    </div>
    <button
      type="button"
      onClick={onRefresh}
      disabled={locating}
      className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-orange-300 hover:text-orange-600 disabled:opacity-60"
    >
      <FiRefreshCw className={locating ? "motion-safe:animate-spin" : ""} />
      Refresh
    </button>
  </div>
);

export const RefusalBanner = ({ message }) =>
  message ? (
    <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 motion-safe:animate-fade-in">
      <FiAlertTriangle className="mt-0.5 shrink-0 text-lg" />
      <div>
        <p className="font-semibold">Not recorded</p>
        <p>{message}</p>
      </div>
    </div>
  ) : null;

// children: what is happening at the branch today (next class, opening hours).
export const BranchOption = ({ branch, fix, selected, onSelect, children }) => {
  const fence = fenceFor(branch, fix);
  return (
    <button
      type="button"
      onClick={() => onSelect(branch._id)}
      aria-pressed={selected}
      className={`w-full rounded-2xl border p-4 text-left transition active:scale-[0.99] ${
        selected
          ? "border-orange-300 bg-orange-50 ring-2 ring-orange-100"
          : "border-slate-200 bg-white hover:border-orange-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`font-semibold ${selected ? "text-orange-700" : "text-slate-900"}`}>
            {branch.branchName}
          </p>
          <p className="truncate text-xs text-slate-500">
            {[branch.location, branch.cityName].filter(Boolean).join(" · ")}
          </p>
        </div>
        <span
          className={`mt-1 h-4 w-4 shrink-0 rounded-full border-2 ${
            selected ? "border-[#FF6B35] bg-[#FF6B35]" : "border-slate-300"
          }`}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {children}
        {!branch.pinned && <Pill tone="amber">No location pin — marked unverified</Pill>}
        {fence && (
          <Pill tone={fence.inside ? "emerald" : "rose"}>
            {formatDistance(fence.distanceM)} away · {fence.inside ? "inside" : "outside"} the{" "}
            {branch.radiusM} m zone
          </Pill>
        )}
      </div>
    </button>
  );
};

export const OpenVisitCard = ({ visit, note, footnote, onCheckOut, busy, children }) => (
  <div className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-emerald-600 to-teal-500 p-6 text-white shadow-lg shadow-emerald-900/10 motion-safe:animate-fade-in-up">
    <p className="text-xs font-semibold uppercase tracking-widest text-white/70">You're checked in</p>
    <h2 className="mt-1 text-2xl font-bold">{visit.branch.branchName}</h2>
    <p className="mt-1 text-sm text-white/85">
      Since {formatTime(visit.checkIn.at, { seconds: true })}
      {note && ` · ${note}`}
      {visit.flags.locationUnverified && " · location unverified"}
    </p>
    {children}
    <button
      type="button"
      onClick={onCheckOut}
      disabled={busy}
      className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-4 text-base font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50 active:scale-[0.97] disabled:opacity-60 sm:w-auto"
    >
      <FiLogOut />
      {busy ? "Checking out…" : "Check out"}
    </button>
    <p className="mt-3 text-xs text-white/70">{footnote}</p>
  </div>
);
