import React, { useState } from "react";
import toast from "react-hot-toast";
import { FiInfo, FiLock, FiRotateCcw } from "react-icons/fi";
import {
  useCommunicationMatrix,
  useResetMatrixRule,
  useSaveMatrixRule,
} from "../../hooks/useCommunicationMatrix";

const SECTIONS = [
  { id: "learners", title: "Learners record", hint: "Things a learner does or that happen to them." },
  { id: "instructors", title: "Instructors record", hint: "Schedule changes and the instructor's own follow-ups." },
  { id: "other", title: "Other automated messages", hint: "Not on the sheet; instructor only by default." },
];

const AUDIENCES = [
  { key: "learner", label: "Learner" },
  { key: "instructor", label: "Instructor" },
  { key: "aa", label: "AA" },
  { key: "bde", label: "BDE" },
];

const formatWhen = (value) =>
  value ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

const personName = (user) => [user?.name?.firstName, user?.name?.lastName].filter(Boolean).join(" ");

const MatrixRow = ({ row, index, savingEvent, onChange, onReset }) => {
  const saving = savingEvent === row.event;
  return (
    <tr
      className="border-t border-slate-100 motion-safe:animate-fade-in"
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
    >
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-slate-900">{row.label}</p>
        {row.changed && (
          <p className="mt-0.5 text-[11px] text-amber-700">
            Changed{row.updatedBy ? ` by ${personName(row.updatedBy)}` : ""}
            {row.updatedAt ? ` on ${formatWhen(row.updatedAt)}` : ""}
          </p>
        )}
      </td>
      {AUDIENCES.map(({ key, label }) => {
        const lockedReason = row.locked[key];
        return (
          <td key={key} className="px-3 py-3 text-center">
            {lockedReason ? (
              <span
                title={lockedReason}
                aria-label={`${label}: ${lockedReason}`}
                className="inline-flex items-center gap-1 text-slate-400"
              >
                <FiLock size={13} />
                {row.current[key] && <span className="text-[11px]">on</span>}
              </span>
            ) : (
              <input
                type="checkbox"
                aria-label={`${row.label} — ${label}`}
                checked={row.current[key]}
                disabled={saving}
                onChange={(e) => onChange(row, { [key]: e.target.checked })}
                className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-[#FF6B35] disabled:cursor-wait"
              />
            )}
          </td>
        );
      })}
      <td className="px-3 py-3">
        <select
          aria-label={`${row.label} — channel`}
          value={row.current.channel}
          disabled={saving}
          onChange={(e) => onChange(row, { channel: e.target.value })}
          className="rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
        >
          <option value="email">Email</option>
          <option value="notification">Notification</option>
        </select>
      </td>
      <td className="px-3 py-3 text-right">
        {row.changed && (
          <button
            type="button"
            onClick={() => onReset(row)}
            disabled={saving}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
          >
            <FiRotateCcw size={12} /> Reset
          </button>
        )}
      </td>
    </tr>
  );
};

const CommunicationMatrixPage = () => {
  const { data: rows = [], isLoading, error } = useCommunicationMatrix();
  const saveRule = useSaveMatrixRule();
  const resetRule = useResetMatrixRule();
  const [savingEvent, setSavingEvent] = useState(null);

  const run = async (event, action, success) => {
    setSavingEvent(event);
    try {
      await action();
      toast.success(success);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingEvent(null);
    }
  };

  const handleChange = (row, patch) =>
    run(row.event, () => saveRule.mutateAsync({ event: row.event, rule: { ...row.current, ...patch } }), `${row.label} updated`);

  const handleReset = (row) =>
    run(row.event, () => resetRule.mutateAsync(row.event), `${row.label} is back to the default`);

  return (
    <div className="min-h-screen bg-slate-50/40 p-6">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">Updates</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Who hears about what</h1>
        <p className="mt-0.5 max-w-2xl text-sm text-slate-500">
          The communication sheet. Each row goes out on one channel. A change applies to messages sent from the
          next minute on.
        </p>
      </div>

      {error && <p className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error.message}</p>}

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-40 animate-pulse rounded-[30px] bg-slate-100" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {SECTIONS.map((section) => {
            const sectionRows = rows.filter((row) => row.section === section.id);
            return (
              <section
                key={section.id}
                className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm motion-safe:animate-fade-in-up"
              >
                <div className="px-5 pt-5">
                  <h2 className="text-sm font-semibold text-slate-900">{section.title}</h2>
                  <p className="text-xs text-slate-500">{section.hint}</p>
                </div>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left">
                    <thead>
                      <tr className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        <th className="px-4 py-2">Event</th>
                        {AUDIENCES.map(({ key, label }) => (
                          <th key={key} className="px-3 py-2 text-center">
                            {label}
                          </th>
                        ))}
                        <th className="px-3 py-2">Channel</th>
                        <th className="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {sectionRows.map((row, index) => (
                        <MatrixRow
                          key={row.event}
                          row={row}
                          index={index}
                          savingEvent={savingEvent}
                          onChange={handleChange}
                          onReset={handleReset}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}

          <div className="flex gap-3 rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
            <FiInfo className="mt-0.5 shrink-0 text-slate-400" />
            <div className="space-y-1.5">
              <p>
                <span className="font-medium text-slate-800">Always sent, whatever this table says:</span> payment
                receipts, the welcome email, OTPs and passwords, application status and class join links. Learners
                also keep their portal copy of demo, fee, assessment and reschedule messages.
              </p>
              <p>
                <span className="font-medium text-slate-800">AA and BDE</span> are the people responsible for the
                learner's branch or course (Admins → Reporting structure). Where nobody is, the message goes up to the
                BDM, then the Marketing Head.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunicationMatrixPage;
