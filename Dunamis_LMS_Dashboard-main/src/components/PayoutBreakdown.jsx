import React from "react";
import { formatInr } from "../page/AdminPages/Financials/financeFormat";

const sessionLabel = (sessionType) =>
  sessionType === "premium" ? "Individual" : "Group";

const titleCase = (value) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : "—";

// The per-learner arithmetic behind one month's payout. Shared so the admin
// review and the instructor's own view can never show different numbers.
export default function PayoutBreakdown({ record }) {
  const lines = record?.lines || [];
  const adjustments = record?.adjustments || [];
  const linesTotal = lines.reduce((sum, line) => sum + (line.amount || 0), 0);
  const missing = lines.filter((line) => line.rateMissing);

  return (
    <div className="space-y-4">
      {missing.length > 0 && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <p className="font-semibold">
            {missing.length} line{missing.length === 1 ? "" : "s"} have no rate card entry
          </p>
          <p className="mt-1 text-rose-600">
            Add a rate for{" "}
            {[
              ...new Set(
                missing.map(
                  (line) =>
                    `${line.categoryName || "Unknown category"} · ${titleCase(
                      line.level
                    )} · ${sessionLabel(line.sessionType)}`
                )
              ),
            ].join("; ")}{" "}
            on the Rate Card tab, then regenerate this month.
          </p>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Learner</th>
              <th className="px-4 py-2.5 font-semibold">Course</th>
              <th className="px-4 py-2.5 font-semibold">Level</th>
              <th className="px-4 py-2.5 font-semibold">Type</th>
              <th className="px-4 py-2.5 text-right font-semibold">Sessions</th>
              <th className="px-4 py-2.5 text-right font-semibold">Rate</th>
              <th className="px-4 py-2.5 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lines.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  No attendance recorded for this month.
                </td>
              </tr>
            ) : (
              lines.map((line, index) => (
                <tr key={`${line.studentId}-${line.courseId}-${line.sessionType}-${index}`}>
                  <td className="px-4 py-2.5 text-slate-800">{line.studentName}</td>
                  <td className="px-4 py-2.5 text-slate-600">{line.courseName}</td>
                  <td className="px-4 py-2.5 text-slate-600">{titleCase(line.level)}</td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {sessionLabel(line.sessionType)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600">
                    {line.sessionsAttended} / {line.sessionsPerMonth}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600">
                    {line.rateMissing ? (
                      <span className="text-rose-600">No rate</span>
                    ) : (
                      formatInr(line.rate)
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-slate-800">
                    {formatInr(line.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
        <Row label="Teaching subtotal" value={formatInr(linesTotal)} />
        {record?.demoConversions > 0 && (
          <Row
            label={`Demo conversions (${record.demoConversions})`}
            value={formatInr(record.demoAmount)}
          />
        )}
        {adjustments.map((item, index) => (
          <Row key={`${item.label}-${index}`} label={item.label} value={formatInr(item.amount)} />
        ))}
        <div className="mt-2 border-t border-slate-200 pt-2">
          <Row label="Net payable" value={formatInr(record?.totalEarnings)} bold />
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Each learner is paid pro-rata on the sessions they attended, capped at one
        full month.
      </p>
    </div>
  );
}

const Row = ({ label, value, bold = false }) => (
  <div className="flex items-center justify-between py-1.5">
    <span className={bold ? "font-semibold text-slate-900" : "text-slate-600"}>
      {label}
    </span>
    <span className={bold ? "font-semibold text-slate-900" : "text-slate-700"}>
      {value}
    </span>
  </div>
);
