import React, { useMemo, useState } from "react";
import dayjs from "dayjs";
import { toast } from "react-hot-toast";
import Swal from "sweetalert2";
import { FiCheckCircle, FiDownload, FiPlus, FiRefreshCw, FiTrash2 } from "react-icons/fi";
import DataTable from "../../../components/Table";
import SlideOver from "../../../components/SlideOver";
import ActionProgressBar from "../../../components/ActionProgressBar";
import ExportMenu from "../../../components/ExportMenu";
import PayoutBreakdown from "../../../components/PayoutBreakdown";
import { exportToExcel } from "../../../utils/exportToExcel";
import {
  useApprovePayout,
  useGeneratePayouts,
  usePayoutsForMonth,
  useSaveAdjustments,
  useSetPayStatus,
} from "../../../hooks/useInstructorPay";
import usePayslipDownload from "../../../hooks/usePayslipDownload";
import { formatInr } from "./financeFormat";
import { Pill, EmptyBox, ErrorBox, TableSkeleton } from "./financeUi";

const inputClass =
  "rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100";

const instructorName = (record) => {
  const name = record.teacherId?.userId?.name;
  return [name?.firstName, name?.lastName].filter(Boolean).join(" ").trim() || "Instructor";
};

const employeeIdOf = (record) => record.teacherId?.userId?.employeeId || "";

const hasMissingRate = (record) =>
  (record.lines || []).some((line) => line.rateMissing);

const statusPill = (record) => {
  if (hasMissingRate(record)) return { tone: "rose", label: "Rates missing" };
  if (record.payStatus === "Paid") return { tone: "emerald", label: "Paid" };
  if (record.approvedAt) return { tone: "amber", label: "Approved" };
  return { tone: "sky", label: "Draft" };
};

const EXPORT_COLUMNS = [
  { header: "Instructor", value: (r) => instructorName(r), width: 26 },
  { header: "Employee ID", value: (r) => employeeIdOf(r), width: 14 },
  { header: "Month", value: (r) => r.month, width: 10 },
  { header: "Learners", value: (r) => (r.lines || []).length },
  { header: "Group learners", value: (r) => r.groupStudents },
  { header: "Individual learners", value: (r) => r.individualStudents, width: 16 },
  { header: "Demo conversions", value: (r) => r.demoConversions, width: 16 },
  { header: "Net payable", value: (r) => r.totalEarnings, width: 14 },
  { header: "Status", value: (r) => statusPill(r).label, width: 14 },
  {
    header: "Payment due",
    value: (r) => (r.payDueDate ? dayjs(r.payDueDate).format("YYYY-MM-DD") : ""),
    width: 14,
  },
];

const InstructorPayTab = () => {
  const [month, setMonth] = useState(dayjs().subtract(1, "month").format("YYYY-MM"));
  const [status, setStatus] = useState("");
  const [detail, setDetail] = useState({ open: false, record: null });
  const [exporting, setExporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const params = { month, status: status || undefined };
  const { data, isLoading, isError, error, refetch } = usePayoutsForMonth(params);
  const generate = useGeneratePayouts();
  const approve = useApprovePayout();
  const setPayStatus = useSetPayStatus();
  const saveAdjustments = useSaveAdjustments();
  const { preparingId, requestPayslip } = usePayslipDownload();

  const rows = data?.records || [];
  const totals = data?.totals || { amount: 0, approved: 0, paid: 0, rateMissing: 0 };

  // The panel keeps a row snapshot; re-derive from the live list so an approval
  // or adjustment made inside the panel is reflected without reopening it.
  const openRecord = useMemo(() => {
    if (!detail.record) return null;
    return rows.find((row) => row._id === detail.record._id) || detail.record;
  }, [detail.record, rows]);

  const runGenerate = async () => {
    const { isConfirmed } = await Swal.fire({
      title: `Generate payouts for ${dayjs(`${month}-01`).format("MMMM YYYY")}?`,
      text: "Attendance is recomputed for every instructor. Manual adjustments are kept, but any month already approved goes back to draft for review.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Generate",
      confirmButtonColor: "#FF6B35",
    });
    if (!isConfirmed) return;

    try {
      const result = await generate.mutateAsync({ month });
      toast.success(result.message);
      if (result.rateMissingCount) {
        toast(
          `${result.rateMissingCount} payout(s) have lines with no rate card entry.`,
          { duration: 7000 }
        );
      }
    } catch (err) {
      toast.error(err.message || "Failed to generate payouts");
    }
  };

  const runApprove = async (record) => {
    const { isConfirmed } = await Swal.fire({
      title: `Approve ${instructorName(record)}'s payout?`,
      text: `${formatInr(record.totalEarnings)} for ${dayjs(`${record.month}-01`).format(
        "MMMM YYYY"
      )}. Once approved the instructor can see it and download their payslip.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Approve",
      confirmButtonColor: "#FF6B35",
    });
    if (!isConfirmed) return;

    try {
      await approve.mutateAsync(record._id);
      toast.success("Payout approved");
    } catch (err) {
      toast.error(err.message || "Failed to approve payout");
    }
  };

  const runMarkPaid = async (record) => {
    const { isConfirmed, value } = await Swal.fire({
      title: "Mark as paid?",
      input: "text",
      inputLabel: "Payment reference (optional)",
      inputPlaceholder: "UTR / transaction id",
      showCancelButton: true,
      confirmButtonText: "Mark paid",
      confirmButtonColor: "#FF6B35",
    });
    if (!isConfirmed) return;

    try {
      await setPayStatus.mutateAsync({
        id: record._id,
        payStatus: "Paid",
        transactionId: value || undefined,
      });
      toast.success("Marked as paid");
    } catch (err) {
      toast.error(err.message || "Failed to update pay status");
    }
  };

  const runExport = async (list) => {
    if (!list.length) return toast.error("Nothing to export");
    setExporting(true);
    try {
      await exportToExcel({
        fileName: `instructor-payouts-${month}`,
        sheetName: "Instructor Payouts",
        columns: EXPORT_COLUMNS,
        rows: list,
      });
      toast.success(`Exported ${list.length} payout${list.length === 1 ? "" : "s"}`);
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const columns = [
    {
      key: "instructor",
      header: "Instructor",
      render: (_value, row) => (
        <div className="min-w-[160px]">
          <p className="font-medium text-slate-800">{instructorName(row)}</p>
          <p className="text-xs text-slate-500">{employeeIdOf(row) || "—"}</p>
        </div>
      ),
    },
    {
      key: "learners",
      header: "Learners",
      render: (_value, row) => (
        <span className="text-slate-600">
          {row.groupStudents} group · {row.individualStudents} individual
        </span>
      ),
    },
    {
      key: "demoConversions",
      header: "Demos converted",
      render: (value) => <span className="text-slate-600">{value || 0}</span>,
    },
    {
      key: "totalEarnings",
      header: "Net payable",
      render: (value) => (
        <span className="font-semibold text-slate-800">{formatInr(value)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (_value, row) => {
        const pill = statusPill(row);
        return <Pill tone={pill.tone}>{pill.label}</Pill>;
      },
    },
    {
      key: "payDueDate",
      header: "Due",
      render: (value) => (
        <span className="text-slate-600">
          {value ? dayjs(value).format("D MMM YYYY") : "—"}
        </span>
      ),
    },
    {
      key: "_actions",
      header: "",
      render: (_value, row) => (
        <button
          type="button"
          onClick={() => setDetail({ open: true, record: row })}
          className="rounded-2xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-orange-200 hover:text-orange-600"
        >
          Review
        </button>
      ),
    },
  ];

  const selectedRows = rows.filter((row) => selectedIds.includes(row._id));

  return (
    <div className="space-y-4">
      <ActionProgressBar
        active={generate.isPending}
        label="Generating payouts from attendance..."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <SummaryCard label="Total payable" value={formatInr(totals.amount)} hint={`${rows.length} instructor(s)`} />
        <SummaryCard label="Approved" value={totals.approved} hint="visible to instructors" />
        <SummaryCard label="Paid" value={totals.paid} hint="settled this month" />
        <SummaryCard
          label="Blocked"
          value={totals.rateMissing}
          hint="missing rate card entries"
          tone={totals.rateMissing ? "rose" : "slate"}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className={inputClass}
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={inputClass}
        >
          <option value="">All statuses</option>
          <option value="draft">Draft — awaiting review</option>
          <option value="approved">Approved, unpaid</option>
          <option value="paid">Paid</option>
        </select>
        <button
          type="button"
          onClick={runGenerate}
          disabled={generate.isPending}
          className="inline-flex items-center gap-2 rounded-2xl bg-[#FF6B35] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#fd5a1f] disabled:opacity-50"
        >
          <FiRefreshCw className={generate.isPending ? "animate-spin" : ""} />
          Generate for month
        </button>
        <ExportMenu
          onExportAll={() => runExport(rows)}
          onExportSelected={() => runExport(selectedRows)}
          totalCount={rows.length}
          selectedCount={selectedRows.length}
          exporting={exporting}
        />
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <ErrorBox message={error?.message} onRetry={refetch} />
      ) : rows.length === 0 ? (
        <EmptyBox text="Nothing here yet — generate this month to see payouts." />
      ) : (
        <DataTable
          data={rows}
          columns={columns}
          itemsPerPage={25}
          onSelectionChange={setSelectedIds}
        />
      )}

      <SlideOver
        open={detail.open}
        onClose={() => setDetail((prev) => ({ ...prev, open: false }))}
        footer={
          openRecord ? (
            <PanelActions
              record={openRecord}
              approving={approve.isPending}
              preparing={preparingId === openRecord._id}
              onApprove={() => runApprove(openRecord)}
              onMarkPaid={() => runMarkPaid(openRecord)}
              onPayslip={() => requestPayslip(openRecord, employeeIdOf(openRecord))}
            />
          ) : null
        }
      >
        {openRecord ? (
          <div className="space-y-5 px-6 pb-6 pt-16">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">
                {dayjs(`${openRecord.month}-01`).format("MMMM YYYY")}
              </p>
              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                {instructorName(openRecord)}
              </h2>
              <p className="text-sm text-slate-500">
                {employeeIdOf(openRecord) || "No employee ID"}
              </p>
            </div>

            <PayoutBreakdown record={openRecord} />

            <AdjustmentsEditor
              record={openRecord}
              saving={saveAdjustments.isPending}
              onSave={async (adjustments) => {
                try {
                  await saveAdjustments.mutateAsync({ id: openRecord._id, adjustments });
                  toast.success("Adjustments saved");
                } catch (err) {
                  toast.error(err.message || "Failed to save adjustments");
                }
              }}
            />
          </div>
        ) : null}
      </SlideOver>
    </div>
  );
};

const SummaryCard = ({ label, value, hint, tone = "slate" }) => (
  <div
    className={`rounded-2xl border p-4 ${
      tone === "rose" ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-white"
    }`}
  >
    <p className="text-xs text-slate-500">{label}</p>
    <p
      className={`text-lg font-semibold ${
        tone === "rose" ? "text-rose-700" : "text-slate-900"
      }`}
    >
      {value}
    </p>
    <p className="text-xs text-slate-400">{hint}</p>
  </div>
);

const PanelActions = ({ record, approving, preparing, onApprove, onMarkPaid, onPayslip }) => (
  <div className="flex flex-wrap gap-2">
    <button
      type="button"
      onClick={onPayslip}
      disabled={preparing}
      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
    >
      <FiDownload />
      {preparing ? "Preparing payslip..." : "Payslip"}
    </button>
    {!record.approvedAt ? (
      <button
        type="button"
        onClick={onApprove}
        disabled={approving || hasMissingRate(record)}
        title={
          hasMissingRate(record)
            ? "Add the missing rate card entries and regenerate first"
            : ""
        }
        className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#FF6B35] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#fd5a1f] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <FiCheckCircle />
        Approve payout
      </button>
    ) : record.payStatus !== "Paid" ? (
      <button
        type="button"
        onClick={onMarkPaid}
        className="flex-1 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
      >
        Mark as paid
      </button>
    ) : (
      <span className="flex-1 rounded-2xl bg-emerald-50 px-4 py-2.5 text-center text-sm font-semibold text-emerald-700">
        Paid
      </span>
    )}
  </div>
);

const AdjustmentsEditor = ({ record, saving, onSave }) => {
  const [draft, setDraft] = useState(
    (record.adjustments || []).map((item) => ({ label: item.label, amount: item.amount }))
  );
  const [recordId, setRecordId] = useState(record._id);

  // The panel is reused across rows; reset when it points at a different payout.
  if (recordId !== record._id) {
    setRecordId(record._id);
    setDraft((record.adjustments || []).map((item) => ({ label: item.label, amount: item.amount })));
  }

  const locked = record.payStatus === "Paid";

  const update = (index, key, value) =>
    setDraft((rows) => rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900">Adjustments</p>
        {!locked && (
          <button
            type="button"
            onClick={() => setDraft((rows) => [...rows, { label: "", amount: 0 }])}
            className="inline-flex items-center gap-1 rounded-2xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-orange-200 hover:text-orange-600"
          >
            <FiPlus />
            Add
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Level upgrade bonus, deductions, and anything else outside the rate card.
        Use a negative amount to deduct.
      </p>

      {draft.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">None.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {draft.map((row, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={row.label}
                disabled={locked}
                placeholder="Level upgrade bonus"
                onChange={(e) => update(index, "label", e.target.value)}
                className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100 disabled:bg-slate-50"
              />
              <input
                type="number"
                value={row.amount}
                disabled={locked}
                onChange={(e) => update(index, "amount", e.target.value)}
                className="w-28 rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100 disabled:bg-slate-50"
              />
              {!locked && (
                <button
                  type="button"
                  onClick={() => setDraft((rows) => rows.filter((_, i) => i !== index))}
                  className="rounded-2xl border border-rose-100 p-2 text-rose-600 transition hover:bg-rose-50"
                  aria-label="Remove adjustment"
                >
                  <FiTrash2 />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {!locked && (
        <button
          type="button"
          disabled={saving || draft.some((row) => !row.label.trim())}
          onClick={() =>
            onSave(
              draft.map((row) => ({
                label: row.label.trim(),
                amount: Number(row.amount) || 0,
              }))
            )
          }
          className="mt-3 w-full rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save adjustments"}
        </button>
      )}
    </div>
  );
};

export default InstructorPayTab;
