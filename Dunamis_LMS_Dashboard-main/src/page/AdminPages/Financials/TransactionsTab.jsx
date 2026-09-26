import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { toast } from "react-hot-toast";
import { FiClock, FiCopy } from "react-icons/fi";
import { usePaymentsList } from "../../../hooks/usePayments";
import TransactionTimeline from "./TransactionTimeline";
import DataTable from "../../../components/Table";
import Pagination from "../../../components/Pagination";
import RowActionsMenu from "../../../components/RowActionsMenu";
import ExportMenu from "../../../components/ExportMenu";
import useFinanceExport from "./useFinanceExport";
import { installmentSummary } from "../../../utils/installmentLabel";
import { STATUS_TONES, formatInr, studentName } from "./financeFormat";
import {
  Pill,
  EmptyBox,
  ErrorBox,
  TableSkeleton,
  StudentCell,
  CourseCell,
} from "./financeUi";

const LIMIT = 50;

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "paid,paid_pending_fulfillment,fulfilled", label: "All paid" },
  { value: "paid_pending_fulfillment", label: "Awaiting fulfilment" },
  { value: "refunded", label: "Refunded" },
  { value: "failed,dropped", label: "Failed / dropped" },
  { value: "created,pending", label: "Awaiting payment" },
  { value: "expired", label: "Expired" },
];

const inputClass =
  "rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100";

const exportColumns = [
  { header: "Date", value: (r) => dayjs(r.paidAt || r.createdAt).format("YYYY-MM-DD HH:mm") },
  { header: "Student", value: (r) => studentName(r.student), width: 24 },
  { header: "Email", value: (r) => r.student?.email, width: 26 },
  { header: "Course", value: (r) => r.course?.name, width: 26 },
  { header: "Amount", value: (r) => r.amount },
  { header: "Captured", value: (r) => r.gatewayCapturedAmount ?? r.amount },
  { header: "Discount", value: (r) => r.discountAmount ?? 0 },
  { header: "Referral code", value: (r) => r.referralCode },
  { header: "Type", value: (r) => r.paymentType },
  { header: "Course type", value: (r) => r.courseType || "fixed" },
  { header: "Installment", value: (r) => (r.paymentType === "Installment" ? r.installmentNo : "") },
  // Blank on a running course: it has no last installment to count towards.
  { header: "Of", value: (r) => (r.courseType === "running" ? "" : r.installmentTotal) },
  { header: "Plan", value: (r) => r.planType },
  { header: "Plan months", value: (r) => r.planMonths },
  { header: "Session", value: (r) => r.sessionType },
  { header: "Mode", value: (r) => r.deliveryMode },
  { header: "Payment mode", value: (r) => r.paymentMode },
  { header: "Gateway", value: (r) => r.gateway },
  { header: "Status", value: (r) => r.status },
  { header: "Branch", value: (r) => r.branch?.branchName },
  { header: "Order ID", value: (r) => r.merchantOrderId, width: 26 },
  { header: "Gateway payment ID", value: (r) => r.cashfreePaymentId, width: 24 },
  { header: "Created at", value: (r) => dayjs(r.createdAt).format("YYYY-MM-DD HH:mm") },
  { header: "Paid at", value: (r) => (r.paidAt ? dayjs(r.paidAt).format("YYYY-MM-DD HH:mm") : "") },
  {
    header: "Fulfilled at",
    value: (r) => (r.fulfilledAt ? dayjs(r.fulfilledAt).format("YYYY-MM-DD HH:mm") : ""),
  },
  { header: "Last error", value: (r) => r.lastError, width: 30 },
];

const TransactionsTab = ({ initialFilters = {} }) => {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState(initialFilters.status || "");
  const [gateway, setGateway] = useState("");
  const [dateFrom, setDateFrom] = useState(initialFilters.dateFrom || "");
  const [dateTo, setDateTo] = useState(initialFilters.dateTo || "");
  const [dateField, setDateField] = useState(initialFilters.dateField || "createdAt");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [timelineId, setTimelineId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  // Debounced so typing a name doesn't fire a person-lookup per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const params = useMemo(
    () => ({
      page,
      limit: LIMIT,
      status: status || undefined,
      gateway: gateway || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      dateField,
      search: search || undefined,
    }),
    [page, status, gateway, dateFrom, dateTo, dateField, search]
  );

  const { data, isLoading, isError, error, refetch } = usePaymentsList(params);
  const rows = data?.rows || [];

  const resetPageAnd = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  // Shows a month in the picker only when the range is exactly that month, so a
  // hand-edited range never reads as one.
  const monthValue =
    dateFrom &&
    dateTo &&
    dateFrom === dayjs(dateFrom).startOf("month").format("YYYY-MM-DD") &&
    dateTo === dayjs(dateFrom).endOf("month").format("YYYY-MM-DD")
      ? dayjs(dateFrom).format("YYYY-MM")
      : "";

  const pickMonth = (month) => {
    if (!month) {
      setDateFrom("");
      setDateTo("");
    } else {
      const start = dayjs(`${month}-01`);
      setDateFrom(start.format("YYYY-MM-DD"));
      setDateTo(start.endOf("month").format("YYYY-MM-DD"));
    }
    setPage(1);
  };

  // Exactly one bound is a range open at the other end — the filter is doing
  // what it was told, but it does not look like it.
  const halfOpenRange = Boolean(dateFrom) !== Boolean(dateTo);

  const { exporting, exportAll, exportSelected } = useFinanceExport({
    scope: "transactions",
    sheetName: "Transactions",
    fileNamePrefix: "dunamis-transactions",
    params,
    columns: exportColumns,
  });

  const selectedRows = rows.filter((row) => selectedIds.includes(row._id));

  const columns = [
    {
      key: "paidAt",
      header: "Date",
      render: (value, row) => {
        const when = value || row.createdAt;
        return (
          <div className="min-w-[110px]">
            <p className="text-slate-800">{dayjs(when).format("D MMM YYYY")}</p>
            <p className="text-xs text-slate-500">{dayjs(when).format("h:mm A")}</p>
          </div>
        );
      },
    },
    { key: "student", header: "Student", render: (value) => <StudentCell value={value} /> },
    { key: "course", header: "Course", render: (value) => <CourseCell value={value} /> },
    {
      key: "amount",
      header: "Amount",
      render: (value, row) => (
        <div>
          <p className="font-semibold text-slate-800">{formatInr(value)}</p>
          {row.gatewayOfferDiscount > 0 && (
            <p className="text-xs text-amber-600">
              captured {formatInr(row.gatewayCapturedAmount)} (offer{" "}
              {formatInr(row.gatewayOfferDiscount)})
            </p>
          )}
        </div>
      ),
    },
    {
      key: "paymentType",
      header: "Type",
      render: (value, row) => (
        <span className="text-slate-600">
          {value === "Installment" ? `Inst ${installmentSummary(row)}` : "Full"}
        </span>
      ),
    },
    {
      key: "gateway",
      header: "Gateway",
      render: (value) => <Pill tone={value === "manual" ? "sky" : "slate"}>{value}</Pill>,
    },
    {
      key: "status",
      header: "Status",
      render: (value) => <Pill tone={STATUS_TONES[value] || "slate"}>{value}</Pill>,
    },
    {
      key: "merchantOrderId",
      header: "Order ID",
      render: (value) => (
        <span className="block max-w-[160px] truncate font-mono text-xs text-slate-500" title={value}>
          {value}
        </span>
      ),
    },
    {
      key: "_actions",
      header: "",
      render: (_value, row) => (
        <RowActionsMenu
          items={[
            {
              label: "View audit trail",
              icon: <FiClock />,
              onClick: () => setTimelineId(row._id),
            },
            {
              label: "Copy order ID",
              icon: <FiCopy />,
              onClick: () => {
                navigator.clipboard.writeText(row.merchantOrderId);
                toast.success("Order ID copied");
              },
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search student or order ID…"
          className={`${inputClass} min-w-[220px] flex-1`}
        />
        <select
          value={status}
          onChange={(e) => resetPageAnd(setStatus)(e.target.value)}
          className={inputClass}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={gateway}
          onChange={(e) => resetPageAnd(setGateway)(e.target.value)}
          className={inputClass}
        >
          <option value="">All gateways</option>
          <option value="cashfree">Cashfree</option>
          <option value="manual">Manual / cash</option>
        </select>
        <select
          value={dateField}
          onChange={(e) => resetPageAnd(setDateField)(e.target.value)}
          className={inputClass}
        >
          <option value="createdAt">Created</option>
          <option value="paidAt">Paid</option>
          <option value="recognized">Recognized</option>
        </select>
        {/* Filling one bound only is an unbounded range, which reads as a
            broken filter ("I asked for August and got July"). The month picker
            sets both at once, which is what people actually mean. */}
        <input
          type="month"
          value={monthValue}
          onChange={(e) => pickMonth(e.target.value)}
          title="Filter to a whole month"
          className={inputClass}
        />
        <label className="flex items-center gap-1.5 text-xs text-slate-500">
          From
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => resetPageAnd(setDateFrom)(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-slate-500">
          To
          <input
            type="date"
            value={dateTo}
            onChange={(e) => resetPageAnd(setDateTo)(e.target.value)}
            className={inputClass}
          />
        </label>
        <ExportMenu
          onExportAll={exportAll}
          onExportSelected={() => exportSelected(selectedRows)}
          totalCount={data?.total || 0}
          selectedCount={selectedRows.length}
          exporting={exporting}
        />
      </div>

      {halfOpenRange && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span>
            {dateFrom
              ? `Showing everything from ${dayjs(dateFrom).format("D MMM YYYY")} onwards — set a To date to close the range.`
              : `Showing everything up to ${dayjs(dateTo).format("D MMM YYYY")}, including earlier months — set a From date to close the range.`}
          </span>
          <button
            type="button"
            onClick={() => pickMonth(dayjs(dateFrom || dateTo).format("YYYY-MM"))}
            className="rounded-2xl border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
          >
            Limit to {dayjs(dateFrom || dateTo).format("MMMM YYYY")}
          </button>
        </div>
      )}

      {data && !isLoading && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Gross (filtered)</p>
            <p className="text-lg font-semibold text-slate-900">{formatInr(data.totals.gross)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Captured</p>
            <p className="text-lg font-semibold text-slate-900">{formatInr(data.totals.captured)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Discount given</p>
            <p className="text-lg font-semibold text-slate-900">{formatInr(data.totals.discount)}</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <ErrorBox message={error?.message} onRetry={refetch} />
      ) : rows.length === 0 ? (
        <EmptyBox text="Nothing here yet — no payments match these filters." />
      ) : (
        <>
          <DataTable
            data={rows}
            columns={columns}
            itemsPerPage={rows.length}
            onSelectionChange={setSelectedIds}
            totalCount={data.total}
            rangeOffset={(data.page - 1) * data.limit}
          />
          {data.pages > 1 && (
            <Pagination currentPage={data.page} totalPages={data.pages} onPageChange={setPage} />
          )}
        </>
      )}

      <TransactionTimeline
        open={Boolean(timelineId)}
        transactionId={timelineId}
        onClose={() => setTimelineId(null)}
      />
    </div>
  );
};

export default TransactionsTab;
