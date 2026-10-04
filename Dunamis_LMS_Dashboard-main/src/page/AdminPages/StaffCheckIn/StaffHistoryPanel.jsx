import React, { useState } from "react";
import { FiChevronLeft, FiChevronRight, FiInbox } from "react-icons/fi";
import { useMyStaffHistory } from "../../../hooks/useStaffCheckIns";
import {
  formatDay,
  formatDuration,
  formatMonth,
  formatTime,
  istDayKey,
  shiftMonthKey,
} from "../../../utils/checkInFormat";
import { DayFlags } from "../../../components/checkIns/VisitFlags";
import CountTile from "../../../components/checkIns/CountTile";
import { LoadError } from "../../../components/checkIns/CheckInParts";

const StaffHistoryPanel = () => {
  const currentMonth = istDayKey().slice(0, 7);
  const [month, setMonth] = useState(currentMonth);
  const { data, isLoading, isError, error, refetch } = useMyStaffHistory(month);

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
        <LoadError title="Could not load your history" error={error} onRetry={() => refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <CountTile label="Days worked" value={data.totals.days} />
            <CountTile label="Late logins" value={data.totals.lateDays} alert />
            <CountTile label="Early logouts" value={data.totals.earlyDays} alert />
            <CountTile label="Missing logouts" value={data.totals.missingLogouts} alert />
            <CountTile label="Days with no check-in" value={data.totals.noCheckInDays} alert />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-base font-semibold text-slate-900">Your days</h3>
            <p className="text-xs text-slate-500">What the admin team sees for {formatMonth(month)}</p>
            {data.days.length ? (
              <ul className="mt-4 space-y-3">
                {data.days.map((day, index) => (
                  <li
                    key={day.dayKey}
                    className="rounded-2xl border border-slate-100 p-3 motion-safe:animate-fade-in"
                    style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-800">
                        {formatDay(day.dayKey)} · {day.branches.join(", ")}
                      </p>
                      <DayFlags day={day} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      First in {formatTime(day.firstInAt, { seconds: true })}
                      {" → "}
                      {day.lastOutAt
                        ? `last out ${formatTime(day.lastOutAt, { seconds: true })}`
                        : day.isOpen
                          ? "still checked in"
                          : "no check-out"}
                      {` · ${formatDuration(day.minutesOnSite)} on site`}
                      {day.visits.length > 1 && ` · ${day.visits.length} visits`}
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

          {data.noCheckInDays.length > 0 && (
            <div className="rounded-2xl border border-rose-200 bg-white p-5">
              <h3 className="text-base font-semibold text-slate-900">Days with no check-in</h3>
              <p className="text-xs text-slate-500">
                Your branch was open and there's no check-in from you. If you were working, tell the
                admin team so they can note it.
              </p>
              <ul className="mt-4 space-y-2">
                {data.noCheckInDays.map((day) => (
                  <li
                    key={day.dayKey}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-100 px-3 py-2.5 text-sm text-slate-700"
                  >
                    <span>{formatDay(day.dayKey)}</span>
                    <span className="text-xs text-slate-400">{day.branches.join(", ")}</span>
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

export default StaffHistoryPanel;
