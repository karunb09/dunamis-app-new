import React from "react";
import { FiInbox } from "react-icons/fi";
import { TONES } from "./financeFormat";

export const Pill = ({ tone = "slate", children }) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]}`}
  >
    {children}
  </span>
);

export const EmptyBox = ({ text }) => (
  <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-slate-400">
    <FiInbox className="text-2xl" />
    <p className="text-sm">{text}</p>
  </div>
);

export const ErrorBox = ({ message, onRetry }) => (
  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
    <p className="font-semibold text-rose-700">Something went wrong</p>
    <p className="mt-1 text-sm text-rose-600">{message}</p>
    <button
      onClick={onRetry}
      className="mt-4 rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-700"
    >
      Retry
    </button>
  </div>
);

export const TableSkeleton = () => (
  <div className="animate-pulse space-y-3">
    <div className="h-10 rounded-2xl bg-slate-100" />
    <div className="h-64 rounded-2xl bg-slate-100" />
  </div>
);

export const StudentCell = ({ value }) => (
  <div className="min-w-[160px]">
    <p className="font-medium text-slate-800">{value?.name?.trim() || "Unknown"}</p>
    <p className="text-xs text-slate-500">{value?.email || "—"}</p>
  </div>
);

export const CourseCell = ({ value }) => (
  <div className="min-w-[140px]">
    <p className="text-slate-800">{value?.name || "—"}</p>
    <p className="text-xs text-slate-500">{value?.code || ""}</p>
  </div>
);
