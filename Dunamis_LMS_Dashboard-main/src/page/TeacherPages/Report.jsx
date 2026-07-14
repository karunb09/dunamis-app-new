import React from "react";
import { FiBarChart2, FiClock, FiDownload, FiRefreshCw, FiUsers } from "react-icons/fi";

const months = [
  {
    label: "July 2025",
    isCurrent: true,
    stats: [
      { title: "Total Hours", value: "140", sub: "98h group · 32h individual" },
      { title: "Classes Missed", value: "01", sub: "1 group · 0 individual" },
      { title: "Group Students", value: "12", sub: "1 class rescheduled" },
      { title: "Individual Students", value: "4", sub: "0 classes rescheduled" },
      { title: "Demo Students", value: "09", sub: "2 new students" },
    ],
    remuneration: null,
    remunerationNote: "Available on 30 Jul 2025",
  },
  {
    label: "June 2025",
    isCurrent: false,
    stats: [
      { title: "Total Hours", value: "140", sub: "98h group · 32h individual" },
      { title: "Classes Missed", value: "01", sub: "1 group · 0 individual" },
      { title: "Group Students", value: "12", sub: "1 class rescheduled" },
      { title: "Individual Students", value: "4", sub: "0 classes rescheduled" },
      { title: "Demo Students", value: "09", sub: "2 new students" },
    ],
    remuneration: "₹21,740",
    remunerationNote: "Due 07 Aug 2025",
  },
];

const summaryCards = [
  { icon: <FiBarChart2 className="h-5 w-5 text-slate-400" />, label: "Classes Completed", value: "12 of 20", badge: "67%", badgeClass: "text-teal-600" },
  { icon: <FiClock className="h-5 w-5 text-amber-400" />, label: "Total Teaching Hours", value: "This month", badge: "32h", badgeClass: "text-amber-600" },
  { icon: <FiUsers className="h-5 w-5 text-rose-400" />, label: "Students Taught", value: "This month", badge: "12", badgeClass: "text-rose-600" },
];

const Report = () => {
  return (
    <div className="min-h-screen bg-white p-6">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">Analytics</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">My Report</h1>
        <p className="mt-1 text-sm text-slate-500">Monthly summary of your teaching activity and performance.</p>
      </div>

      {/* Summary strip */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {summaryCards.map((card) => (
          <div key={card.label} className="flex items-center justify-between gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
            <div className="flex min-w-0 items-center gap-3">
              {card.icon}
              <div className="min-w-0">
                <p className="truncate text-xs text-slate-500">{card.label}</p>
                <p className="mt-0.5 truncate text-base font-semibold text-slate-800">{card.value}</p>
              </div>
            </div>
            <span className={`shrink-0 text-lg font-bold tabular-nums ${card.badgeClass}`}>{card.badge}</span>
          </div>
        ))}
      </div>

      {/* Performance section */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-800">My Performance</h2>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 rounded-2xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50">
            <FiRefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <button className="flex items-center gap-1.5 rounded-2xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50">
            <FiDownload className="h-3.5 w-3.5" /> Download
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {months.map((month) => (
          <section key={month.label} className="rounded-[28px] border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-800">{month.label}</h3>
              {month.isCurrent && (
                <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-600 ring-1 ring-orange-100">
                  Current
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              {month.stats.map((stat) => (
                <div key={stat.title} className="flex flex-col rounded-[20px] border border-slate-200 bg-slate-50 p-3">
                  <p className="truncate text-xs text-slate-500">{stat.title}</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-slate-800">{stat.value}</p>
                  <p className="mt-0.5 line-clamp-1 text-[10px] text-slate-400">{stat.sub}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs text-slate-500">Monthly Remuneration</p>
                <p className="mt-0.5 text-base font-semibold tabular-nums text-slate-800">
                  {month.remuneration ?? "₹ ----"}
                </p>
                <p className="text-xs text-slate-400">{month.remunerationNote}</p>
              </div>
              <button className="shrink-0 text-sm font-medium text-slate-500 transition hover:text-slate-800">
                View Details →
              </button>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

export default Report;
