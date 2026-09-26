import React, { useMemo, useState } from "react";
import dayjs from "dayjs";
import { FiCalendar, FiDownload, FiInbox } from "react-icons/fi";
import SlideOver from "../../../../../components/SlideOver";
import PayoutBreakdown from "../../../../../components/PayoutBreakdown";
import usePayslipDownload from "../../../../../hooks/usePayslipDownload";
import { formatInr } from "../../../Financials/financeFormat";
import { Pill } from "../../../Financials/financeUi";

const monthLabel = (month) =>
  month ? dayjs(`${month}-01`).format("MMMM YYYY") : "Unknown month";

const statusPill = (record) => {
  if (record.payStatus === "Paid") return { tone: "emerald", label: "Paid" };
  if (record.approvedAt) return { tone: "amber", label: "Approved" };
  return { tone: "sky", label: "Draft" };
};

// Shared by the admin's instructor profile and the instructor's own profile.
// `showDrafts` is the only difference: an instructor is never shown a payout
// that has not been approved.
export default function RemunerationTab({
  remunerations = [],
  employeeId,
  showDrafts = true,
  loading = false,
}) {
  const [detail, setDetail] = useState({ open: false, record: null });
  const { preparingId, requestPayslip } = usePayslipDownload();

  const records = useMemo(() => {
    const list = Array.isArray(remunerations) ? remunerations : [];
    return list
      .filter((record) => showDrafts || record.approvedAt)
      .slice()
      .sort((a, b) => String(b.month).localeCompare(String(a.month)));
  }, [remunerations, showDrafts]);

  const openRecord = detail.record;

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-24 rounded-2xl bg-slate-100" />
        <div className="h-24 rounded-2xl bg-slate-100" />
      </div>
    );
  }

  if (!records.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-slate-400">
        <FiInbox className="text-2xl" />
        <p className="text-sm">Nothing here yet — no payouts have been issued.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {records.map((record) => {
        const pill = statusPill(record);
        const preparing = preparingId === record._id;

        return (
          <div
            key={record._id}
            className="rounded-2xl border border-slate-200 bg-white p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {monthLabel(record.month)}
                  </h3>
                  <Pill tone={pill.tone}>{pill.label}</Pill>
                  {employeeId && (
                    <span className="rounded-full bg-slate-100 px-2 py-1 font-mono text-xs text-slate-700">
                      {employeeId}
                    </span>
                  )}
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                  <FiCalendar />
                  {record.payDueDate
                    ? `Payment due ${dayjs(record.payDueDate).format("D MMM YYYY")}`
                    : "Payment date not set"}
                </p>
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {formatInr(record.totalEarnings)}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Group learners" value={record.groupStudents ?? 0} />
              <Stat label="Individual learners" value={record.individualStudents ?? 0} />
              <Stat label="Demos converted" value={record.demoConversions ?? 0} />
              <Stat label="Earning lines" value={(record.lines || []).length} />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDetail({ open: true, record })}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-orange-200 hover:text-orange-600"
              >
                View breakdown
              </button>
              {record.approvedAt && (
                <button
                  type="button"
                  onClick={() => requestPayslip(record, employeeId)}
                  disabled={Boolean(preparingId)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#FF6B35] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#fd5a1f] disabled:opacity-50"
                >
                  <FiDownload />
                  {preparing ? "Preparing payslip..." : "Download payslip"}
                </button>
              )}
            </div>
          </div>
        );
      })}

      <SlideOver
        open={detail.open}
        onClose={() => setDetail((prev) => ({ ...prev, open: false }))}
      >
        {openRecord ? (
          <div className="space-y-5 px-6 pb-6 pt-16">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">
                Payout breakdown
              </p>
              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                {monthLabel(openRecord.month)}
              </h2>
            </div>
            <PayoutBreakdown record={openRecord} />
          </div>
        ) : null}
      </SlideOver>
    </div>
  );
}

const Stat = ({ label, value }) => (
  <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
      {label}
    </p>
    <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
  </div>
);
