import React, { useState } from "react";
import dayjs from "dayjs";
import { toast } from "react-hot-toast";
import { FiCopy, FiDollarSign } from "react-icons/fi";
import { useDues } from "../../../hooks/usePayments";
import RecordCashModal from "./RecordCashModal";
import DataTable from "../../../components/Table";
import Pagination from "../../../components/Pagination";
import RowActionsMenu from "../../../components/RowActionsMenu";
import BarRow from "../../../components/insights/BarRow";
import { BUCKET_META, formatInr } from "./financeFormat";
import { Pill, EmptyBox, ErrorBox, TableSkeleton, StudentCell, CourseCell } from "./financeUi";

const LIMIT = 50;
const BUCKET_ORDER = ["0-7", "8-30", "30+"];

const inputClass =
  "rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100";

const DuesTab = () => {
  const [page, setPage] = useState(1);
  const [bucket, setBucket] = useState("");
  const [cashRow, setCashRow] = useState(null);

  const { data, isLoading, isError, error, refetch } = useDues({
    page,
    limit: LIMIT,
    bucket: bucket || undefined,
  });

  const rows = data?.rows || [];
  const totals = data?.totals || { amount: 0, count: 0, students: 0, maxDaysLate: 0 };
  const agingByBucket = Object.fromEntries((data?.aging || []).map((a) => [a.bucket, a]));
  const agingMax = Math.max(...(data?.aging || []).map((a) => a.amount), 1);

  const columns = [
    { key: "student", header: "Student", render: (value) => <StudentCell value={value} /> },
    { key: "course", header: "Course", render: (value) => <CourseCell value={value} /> },
    {
      key: "installmentNo",
      header: "Installment",
      render: (value, row) => (
        <span className="text-slate-600">
          {value} of {row.installmentTotal}
        </span>
      ),
    },
    {
      key: "amountDue",
      header: "Amount due",
      render: (value) => <span className="font-semibold text-slate-800">{formatInr(value)}</span>,
    },
    {
      key: "dueDate",
      header: "Due",
      render: (value) => <span className="text-slate-600">{dayjs(value).format("D MMM YYYY")}</span>,
    },
    {
      key: "daysLate",
      header: "Days late",
      render: (value) => (
        <span className={value > 30 ? "font-semibold text-rose-600" : "text-slate-600"}>{value}</span>
      ),
    },
    {
      key: "bucket",
      header: "Age",
      render: (value) => {
        const meta = BUCKET_META[value] || { label: value, tone: "slate" };
        return <Pill tone={meta.tone}>{meta.label}</Pill>;
      },
    },
    {
      key: "lastRemindedAt",
      header: "Last reminded",
      render: (value) => (
        <span className="text-xs text-slate-500">
          {value ? dayjs(value).format("D MMM YYYY") : "—"}
        </span>
      ),
    },
    {
      key: "branch",
      header: "Branch",
      render: (value) => <span className="text-slate-600">{value?.branchName || "Online"}</span>,
    },
    {
      key: "_actions",
      header: "",
      render: (_value, row) => (
        <RowActionsMenu
          items={[
            {
              label: "Record cash payment",
              icon: <FiDollarSign />,
              onClick: () => setCashRow(row),
            },
            {
              label: "Copy student email",
              icon: <FiCopy />,
              onClick: () => {
                navigator.clipboard.writeText(row.student?.email || "");
                toast.success("Email copied");
              },
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Total receivable</p>
          <p className="text-lg font-semibold text-slate-900">{formatInr(totals.amount)}</p>
          <p className="text-xs text-slate-400">as of today</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Students owing</p>
          <p className="text-lg font-semibold text-slate-900">{totals.students || 0}</p>
          <p className="text-xs text-slate-400">{totals.count || 0} installment(s)</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Oldest</p>
          <p className="text-lg font-semibold text-slate-900">{totals.maxDaysLate || 0} days</p>
          <p className="text-xs text-slate-400">past due</p>
        </div>
      </div>

      {(data?.aging || []).length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Aging</p>
          {BUCKET_ORDER.filter((b) => agingByBucket[b]).map((b) => (
            <BarRow
              key={b}
              label={BUCKET_META[b].label}
              value={agingByBucket[b].amount}
              displayValue={formatInr(agingByBucket[b].amount)}
              max={agingMax}
              tone={b === "0-7" ? "amber" : "rose"}
            />
          ))}
        </div>
      )}

      <select
        value={bucket}
        onChange={(e) => {
          setBucket(e.target.value);
          setPage(1);
        }}
        className={inputClass}
      >
        <option value="">All ages</option>
        {BUCKET_ORDER.map((b) => (
          <option key={b} value={b}>
            {BUCKET_META[b].label}
          </option>
        ))}
      </select>

      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <ErrorBox message={error?.message} onRetry={refetch} />
      ) : rows.length === 0 ? (
        <EmptyBox text="Nothing here yet — nobody is overdue." />
      ) : (
        <>
          <DataTable
            data={rows}
            columns={columns}
            itemsPerPage={rows.length}
            selectable={false}
            totalCount={data.total}
            rangeOffset={(data.page - 1) * data.limit}
          />
          {data.pages > 1 && (
            <Pagination currentPage={data.page} totalPages={data.pages} onPageChange={setPage} />
          )}
        </>
      )}

      <RecordCashModal
        open={Boolean(cashRow)}
        due={cashRow}
        onClose={() => setCashRow(null)}
        onRecorded={() => refetch()}
      />
    </div>
  );
};

export default DuesTab;
