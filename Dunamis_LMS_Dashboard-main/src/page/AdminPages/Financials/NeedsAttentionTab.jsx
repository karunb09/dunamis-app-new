import React, { useState } from "react";
import Swal from "sweetalert2";
import { toast } from "react-hot-toast";
import { FiCopy, FiCheckCircle } from "react-icons/fi";
import { useNeedsAttention, useReverifyPayment } from "../../../hooks/usePayments";
import DataTable from "../../../components/Table";
import Pagination from "../../../components/Pagination";
import RowActionsMenu from "../../../components/RowActionsMenu";
import SavingOverlay from "../../../components/SavingOverlay";
import {
  REASON_META,
  STATUS_TONES,
  formatInr,
  formatAge,
} from "./financeFormat";
import {
  Pill,
  EmptyBox,
  ErrorBox,
  TableSkeleton,
  StudentCell,
  CourseCell,
} from "./financeUi";

const LIMIT = 50;

const NeedsAttentionTab = () => {
  const [page, setPage] = useState(1);
  const [includeAbandoned, setIncludeAbandoned] = useState(false);

  const { data, isLoading, isError, error, refetch } = useNeedsAttention({
    page,
    limit: LIMIT,
    includeAbandoned,
  });
  const reverify = useReverifyPayment();

  const rows = data?.rows || [];

  const showOutcome = (result, row) => {
    const order = row.merchantOrderId;
    if (!result.paid) {
      return Swal.fire({
        icon: "info",
        title: "No payment captured",
        html: `Cashfree reports <b>${result.cashfreeOrderStatus || "not paid"}</b> for <code>${order}</code>. No money was taken.`,
      });
    }
    if (result.fulfilled) {
      return Swal.fire({
        icon: "success",
        title: "Enrolled",
        html: `<code>${order}</code> is fulfilled. The student is enrolled and seated.`,
      });
    }
    if (result.coreFulfilled) {
      return Swal.fire({
        icon: "warning",
        title: "Enrolled, but no class seat",
        html: `Payment recorded and course access granted for <code>${order}</code>, but the class is full. Assign a seat manually.<br/><br/><small>${result.error || ""}</small>`,
      });
    }
    return Swal.fire({
      icon: "error",
      title: "Fulfilment failed",
      html: `<code>${order}</code> is paid but could not be fulfilled.<br/><br/><small>${result.error || "Unknown error"}</small>`,
    });
  };

  const handleReverify = async (row) => {
    const confirmed = await Swal.fire({
      title: "Re-verify with Cashfree?",
      html: `Checks <code>${row.merchantOrderId}</code> (${formatInr(row.amount)}) against Cashfree and completes enrolment if it was genuinely paid.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Re-verify",
      confirmButtonColor: "#FF6B35",
    });
    if (!confirmed.isConfirmed) return;

    try {
      const result = await reverify.mutateAsync(row._id);
      await showOutcome(result, row);
    } catch (err) {
      Swal.fire({ icon: "error", title: "Could not re-verify", text: err.message });
    }
  };

  const columns = [
    {
      key: "reason",
      header: "Reason",
      render: (value) => {
        const meta = REASON_META[value] || { label: value, tone: "slate" };
        return <Pill tone={meta.tone}>{meta.label}</Pill>;
      },
    },
    {
      key: "ageMs",
      header: "Age",
      render: (value) => <span className="text-slate-600">{formatAge(value)}</span>,
    },
    { key: "student", header: "Student", render: (value) => <StudentCell value={value} /> },
    { key: "course", header: "Course", render: (value) => <CourseCell value={value} /> },
    {
      key: "amount",
      header: "Amount",
      render: (value, row) => (
        <div>
          <p className="font-semibold text-slate-800">{formatInr(value)}</p>
          {row.paymentType === "Installment" && (
            <p className="text-xs text-slate-500">
              Inst {row.installmentNo}/{row.installmentTotal}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Local status",
      render: (value) => <Pill tone={STATUS_TONES[value] || "slate"}>{value}</Pill>,
    },
    {
      key: "cashfreeOrderStatus",
      header: "Cashfree",
      render: (value, row) => (
        <div>
          <p className="text-slate-700">{value || "—"}</p>
          {row.reconcileLastStatus && row.reconcileLastStatus !== value && (
            <p className="text-xs text-slate-400">last seen {row.reconcileLastStatus}</p>
          )}
        </div>
      ),
    },
    {
      key: "lastError",
      header: "Last error",
      render: (value) => (
        <span className="block max-w-[220px] truncate text-xs text-rose-600" title={value || ""}>
          {value || "—"}
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
              label: "Copy order ID",
              icon: <FiCopy />,
              onClick: () => {
                navigator.clipboard.writeText(row.merchantOrderId);
                toast.success("Order ID copied");
              },
            },
            {
              label: "Re-verify with Cashfree",
              icon: <FiCheckCircle />,
              onClick: () => handleReverify(row),
              disabled: row.gateway !== "cashfree",
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <SavingOverlay show={reverify.isPending} label="Re-verifying with Cashfree…" />

      <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={includeAbandoned}
          onChange={(e) => {
            setIncludeAbandoned(e.target.checked);
            setPage(1);
          }}
          className="rounded border-slate-300 text-orange-500 focus:ring-2 focus:ring-orange-100"
        />
        Show abandoned checkouts
      </label>

      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <ErrorBox message={error?.message} onRetry={refetch} />
      ) : rows.length === 0 ? (
        <EmptyBox
          text={
            includeAbandoned
              ? "Nothing here yet — no payments need attention."
              : "Nothing here yet — no money is stuck."
          }
        />
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
    </div>
  );
};

export default NeedsAttentionTab;
