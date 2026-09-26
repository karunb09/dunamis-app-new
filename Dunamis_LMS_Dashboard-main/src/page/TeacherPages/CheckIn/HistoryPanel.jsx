import React, { useState } from "react";
import { FiChevronLeft, FiChevronRight, FiInbox } from "react-icons/fi";
import { useMyCheckInHistory } from "../../../hooks/useCheckIns";
import {
  formatDay,
  formatDuration,
  formatMonth,
  formatTime,
  istDayKey,
  shiftMonthKey,
} from "../../../utils/checkInFormat";
import VisitFlags from "../../../components/checkIns/VisitFlags";
import CountTile from "../../../components/checkIns/CountTile";

const HistoryPanel = () => {
  const currentMonth = istDayKey().slice(0, 7);
  const [month, setMonth] = useState(currentMonth);
  const { data, isLoading, isError, error, refetch } = useMyCheckInHistory(month);

  return (
    <div className="space-y-5">
      <div className="flex w-fit items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1">
        <button
          type="button"
          onClick={() => setMonth(shiftMonthKey(month, -1))}
          className="rounded-xl p-2 text-slate-500 hover:bg-slate-50"
          aria-label="Previous month"
        >
          <FiChevronLeft />
        </button>
        <span className="min-w-[9rem] px-2 text-center text-sm font-medium text-slate-700">
          {formatMonth(month)}
        </span>
        <button
          type="button"
          onClick={() => setMonth(shiftMonthKey(month, 1))}
          disabled={month >= currentMonth}
          className="rounded-xl p-2 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Next month"
        >
          <FiChevronRight />
        </button>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-slate-100" />
            ))}
          </div>
          <div className="h-48 rounded-2xl bg-slate-100" />
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
          <p className="font-semibold text-rose-700">Could not load your history</p>
          <p className="mt-1 text-sm text-rose-600">{error?.message}</p>
          <button
            onClick={() => refetch()}
            className="mt-4 rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-700"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <CountTile label="Visits" value={data.totals.visits} />
            <CountTile label="Late logins" value={data.totals.lateCheckIns} alert />
            <CountTile label="Early logouts" value={data.totals.earlyCheckOuts} alert />
            <CountTile label="Missing logouts" value={data.totals.missingLogouts} alert />
            <CountTile label="Classes with no check-in" value={data.totals.classesMissed} alert />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-base font-semibold text-slate-900">Your visits</h3>
            <p className="text-xs text-slate-500">What the admin team sees for {formatMonth(month)}</p>
            {data.visits.length ? (
              <ul className="mt-4 space-y-3">
                {data.visits.map((visit, index) => (
                  <li
                    key={visit._id}
                    className="rounded-2xl border border-slate-100 p-3 motion-safe:animate-fade-in"
                    style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-800">
                        {formatDay(visit.dayKey)} · {visit.branch.branchName}
                      </p>
                      <VisitFlags visit={visit} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      In {formatTime(visit.checkIn.at, { seconds: true })}
                      {" → "}
                      {visit.checkOut
                        ? `Out ${formatTime(visit.checkOut.at, { seconds: true })}`
                        : visit.isOpen
                          ? "still checked in"
                          : "no check-out"}
                      {visit.minutesOnSite != null && ` · ${formatDuration(visit.minutesOnSite)} on site`}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-4 flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 py-10 text-slate-400">
                <FiInbox className="text-2xl" />
                <p className="text-sm">Nothing here yet</p>
              </div>
            )}
          </div>

          {data.missedClasses.length > 0 && (
            <div className="rounded-2xl border border-rose-200 bg-white p-5">
              <h3 className="text-base font-semibold text-slate-900">Classes with no check-in</h3>
              <p className="text-xs text-slate-500">
                If you taught these, tell the admin team so they can note it.
              </p>
              <ul className="mt-4 space-y-2">
                {data.missedClasses.map((cls) => (
                  <li
                    key={cls.slotId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-100 px-3 py-2.5 text-sm text-slate-700"
                  >
                    <span>
                      {formatDay(istDayKey(new Date(cls.startAt)))} · {formatTime(cls.startAt)} –{" "}
                      {formatTime(cls.endAt)} · {cls.courseName}
                      {cls.slotType === "demo" ? " (demo)" : ""}
                    </span>
                    <span className="text-xs text-slate-400">{cls.branch.branchName}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default HistoryPanel;
