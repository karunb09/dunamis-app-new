"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { installmentSummary, isRunning, paymentPeriodLabel } from "@/lib/installmentLabel";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import {
  HiCheckCircle,
  HiClock,
  HiExclamationCircle,
  HiOutlineDocumentText,
  HiRefresh,
} from "react-icons/hi";
import StudentShell from "@/components/student/StudentShell";
import PaymentModal from "@/components/PopupModals/PaymentModal";
import { getWebsiteToken, getWebsiteUser } from "@/lib/authSession";
import { API_BASE } from "@/lib/apiBase";

// Authenticated calls go through the BFF proxy (JWT injected from httpOnly cookie).
const BASE_URL = API_BASE;

const formatInr = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const STATUS_META = {
  overdue: {
    label: "Overdue",
    pill: "bg-red-50 text-red-700 ring-red-200",
    card: "border-red-200 bg-red-50/40",
  },
  due: {
    label: "Due",
    pill: "bg-orange-50 text-orange-700 ring-orange-200",
    card: "border-orange-200 bg-orange-50/40",
  },
  due_soon: {
    label: "Due soon",
    pill: "bg-amber-50 text-amber-700 ring-amber-200",
    card: "border-amber-200 bg-amber-50/40",
  },
  upcoming: {
    label: "Upcoming",
    pill: "bg-sky-50 text-sky-700 ring-sky-200",
    card: "border-slate-200 bg-white",
  },
};

// Plain-language labels for the lifecycle trail the backend records.
const EVENT_LABELS = {
  order_initiated: "Payment started",
  order_created: "Payment link ready",
  order_reused: "Checkout reopened",
  order_superseded: "Replaced by a repriced order",
  checkout_opened: "Checkout opened",
  checkout_dismissed: "Checkout closed without paying",
  webhook_received: "Bank confirmation received",
  verify_requested: "Verification requested",
  gateway_paid: "Payment confirmed",
  gateway_not_paid: "Payment not completed",
  core_fulfilled: "Fees recorded and access restored",
  fulfilled: "Enrollment updated",
  fulfillment_deferred: "Awaiting support review",
  failed: "Payment failed",
  expired: "Payment session expired",
  reconciled: "Recovered by automatic check",
  cash_recorded: "Cash payment recorded at the centre",
};

function SummaryCard({ label, value, hint, tone = "slate" }) {
  const toneClass =
    tone === "red" ? "text-red-600" : tone === "emerald" ? "text-emerald-600" : "text-slate-900";

  return (
    <div className="rounded-2xl border border-orange-100 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${toneClass}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function DueCard({ due, onPay, paying }) {
  const meta = STATUS_META[due.status] || STATUS_META.upcoming;
  const running = isRunning(due);
  const paidCount = Number(due.installmentsPaid || 0);
  const total = Number(due.installmentTotal || 1);
  const progress = Math.min(100, Math.round((paidCount / total) * 100));

  return (
    <div className={`rounded-[1.75rem] border p-6 ${meta.card}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-slate-950">{due.courseName}</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {due.courseCode ? `${due.courseCode} · ` : ""}
            {due.sessionType === "premium" ? "One-to-one" : "Group"}
            {due.deliveryMode ? ` · ${due.deliveryMode}` : ""}
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${meta.pill}`}
        >
          {meta.label}
        </span>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div>
          <p className="text-xs text-slate-500">Amount due</p>
          <p className="text-xl font-bold text-slate-950">{formatInr(due.amount)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Due date</p>
          <p className="text-sm font-semibold text-slate-800">{formatDate(due.dueDate)}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {due.isOverdue
              ? `${due.daysLate} day${due.daysLate === 1 ? "" : "s"} late`
              : due.daysUntilDue === 0
              ? "Due today"
              : `in ${due.daysUntilDue} day${due.daysUntilDue === 1 ? "" : "s"}`}
          </p>
        </div>
        {running ? (
          // No counter and no progress bar: this course has no last payment, and
          // a bar filling toward a total reads as "nearly finished".
          <div>
            <p className="text-xs text-slate-500">Paying for</p>
            <p className="text-sm font-semibold text-slate-800">{paymentPeriodLabel(due)}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {paidCount > 0
                ? `${paidCount} month${paidCount === 1 ? "" : "s"} paid so far`
                : "Your first month"}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-xs text-slate-500">Installment</p>
            <p className="text-sm font-semibold text-slate-800">
              {due.installmentNo} of {due.installmentTotal}
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-orange-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => onPay(due)}
          disabled={paying}
          className="rounded-full bg-orange-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {paying
            ? "Starting payment..."
            : due.activeOrder
            ? `Resume payment of ${formatInr(due.amount)}`
            : `Pay ${formatInr(due.amount)}`}
        </button>
        {!due.isOverdue ? (
          <p className="text-xs text-slate-500">You can clear this early — no extra charge.</p>
        ) : null}
      </div>
    </div>
  );
}

function ReceiptPanel({ open, onClose, receipt, timeline, loading }) {
  if (!open || !receipt) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto px-3 py-6 sm:items-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative my-auto w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 px-6 py-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">Receipt</p>
          <h3 className="mt-1 text-xl font-bold">{receipt.courseName}</h3>
          <p className="mt-1 text-sm text-white/80">
            {formatInr(receipt.amount)} · {formatDateTime(receipt.paidAt)}
          </p>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs text-slate-500">Payment type</dt>
              <dd className="font-medium text-slate-900">
                {receipt.paymentType === "Installment"
                  ? installmentSummary(receipt)
                  : receipt.planLabel || "Full payment"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Mode</dt>
              <dd className="font-medium text-slate-900">{receipt.paymentMode || "Online"}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs text-slate-500">Reference</dt>
              <dd className="break-all font-mono text-xs text-slate-700">
                {receipt.transactionId || receipt.orderId || "—"}
              </dd>
            </div>
          </dl>

          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              What happened
            </p>
            {loading ? (
              <p className="mt-3 text-sm text-slate-500">Loading history...</p>
            ) : timeline.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                No detailed history is available for this payment.
              </p>
            ) : (
              <ol className="mt-3 space-y-3">
                {timeline.map((event, index) => (
                  <li key={`${event.type}-${index}`} className="flex gap-3">
                    <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-orange-400" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900">
                        {EVENT_LABELS[event.type] || event.type}
                      </p>
                      <p className="text-xs text-slate-500">{formatDateTime(event.at)}</p>
                      {event.detail ? (
                        <p className="mt-0.5 text-xs leading-5 text-slate-500">{event.detail}</p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        <div className="border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StudentFeesPage() {
  const authUser = useSelector((state) => state.auth?.user);
  const authToken = useSelector((state) => state.auth?.token);

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payingCourseId, setPayingCourseId] = useState(null);
  const [payOpen, setPayOpen] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [activeTransactionId, setActiveTransactionId] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  // PaymentModal calls onSuccess and then onClose on the happy path, so the
  // close handler must know the payment already settled — otherwise every
  // successful checkout logs a false "abandoned" event.
  const checkoutSettled = useRef(false);

  const session = useMemo(() => {
    if (typeof window === "undefined") return { user: authUser, token: authToken };
    return {
      user: authUser || getWebsiteUser(),
      token: authToken || getWebsiteToken(),
    };
  }, [authUser, authToken]);

  const authHeaders = useCallback(
    (extra = {}) => ({
      ...(session.token ? { Authorization: `Bearer ${session.token}` } : {}),
      ...extra,
    }),
    [session.token]
  );

  const loadSummary = useCallback(async () => {
    try {
      const response = await fetch(`${BASE_URL}/v1/student-payments/summary`, {
        credentials: "include",
        headers: authHeaders(),
      });
      const data = await response.json();
      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Could not load your fees");
      }
      setSummary(data);
      setError("");
    } catch (err) {
      setError(err.message || "Could not load your fees");
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  // Best-effort lifecycle ping so an abandoned checkout is visible to support.
  const pingCheckout = useCallback(
    (transactionId, type) => {
      if (!transactionId) return;
      fetch(`${BASE_URL}/v1/student-payments/transaction/${transactionId}/event`, {
        method: "POST",
        credentials: "include",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ type }),
      }).catch(() => {});
    },
    [authHeaders]
  );

  const startPayment = async (due) => {
    setPayingCourseId(due.courseId);
    try {
      const response = await fetch(`${BASE_URL}/v1/student-payments/order`, {
        method: "POST",
        credentials: "include",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          courseId: due.courseId,
          slotId: due.slotId,
          sessionType: due.sessionType,
        }),
      });
      const data = await response.json();
      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Could not start the payment");
      }

      checkoutSettled.current = false;
      setPaymentOrder(data.order);
      setActiveTransactionId(data.transactionId);
      setPayOpen(true);
      pingCheckout(data.transactionId, "checkout_opened");
    } catch (err) {
      toast.error(err.message || "Could not start the payment");
    } finally {
      setPayingCourseId(null);
    }
  };

  const closeCheckout = () => {
    if (!checkoutSettled.current) {
      pingCheckout(activeTransactionId, "checkout_dismissed");
    }
    setPayOpen(false);
    setPaymentOrder(null);
    setActiveTransactionId(null);
  };

  const verifyPayment = async (paymentDetails) => {
    // Set before any await: PaymentModal fires onClose synchronously after this.
    checkoutSettled.current = true;
    const orderId =
      paymentDetails?.cashfree_order_id || paymentOrder?.orderId || paymentOrder?.id;

    setPayOpen(false);
    const toastId = toast.loading("Confirming your payment...");

    try {
      const response = await fetch(`${BASE_URL}/v1/enrollment/verify-payment`, {
        method: "POST",
        credentials: "include",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ cashfree_order_id: orderId }),
      });
      const data = await response.json();
      if (!response.ok || data.success === false) {
        throw new Error(data.message || "We could not confirm the payment");
      }
      toast.success(data.message || "Payment confirmed", { id: toastId });
    } catch (err) {
      // The webhook and the reconciler both still settle this, so never tell the
      // student their money is lost.
      toast.error(
        `${err.message}. If the amount left your account it will be confirmed shortly.`,
        { id: toastId, duration: 8000 }
      );
    } finally {
      setPaymentOrder(null);
      setActiveTransactionId(null);
      await loadSummary();
    }
  };

  const openReceipt = async (row) => {
    setReceipt(row);
    setTimeline([]);

    if (!row.transactionRef) return;

    setTimelineLoading(true);
    try {
      const response = await fetch(
        `${BASE_URL}/v1/student-payments/transaction/${row.transactionRef}`,
        { credentials: "include", headers: authHeaders() }
      );
      const data = await response.json();
      if (response.ok && data.success !== false) {
        setTimeline(data.transaction?.events || []);
      }
    } catch {
      setTimeline([]);
    } finally {
      setTimelineLoading(false);
    }
  };

  const totals = summary?.totals || {};
  const dues = summary?.dues || [];
  const history = summary?.history || [];

  return (
    <StudentShell
      title="Fees & Payments"
      description="Pay your next installment, clear anything overdue, and download past receipts."
    >
      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-28 rounded-[2rem] bg-orange-50" />
          <div className="h-48 rounded-[2rem] bg-orange-50" />
        </div>
      ) : error ? (
        <div className="rounded-[2rem] border border-red-100 bg-red-50 p-8 text-center">
          <p className="font-semibold text-red-700">We could not load your fees</p>
          <p className="mt-1 text-sm text-red-600">{error}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              loadSummary();
            }}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
          >
            <HiRefresh className="h-4 w-4" />
            Try again
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {summary?.accessRestricted ? (
            <div className="flex items-start gap-3 rounded-[2rem] border border-red-200 bg-red-50 p-6">
              <HiExclamationCircle className="mt-0.5 h-6 w-6 flex-shrink-0 text-red-600" />
              <div>
                <p className="font-bold text-red-800">Your class access is paused</p>
                <p className="mt-1 text-sm leading-6 text-red-700">
                  {summary.message} Clear the overdue amount below and access is restored
                  immediately.
                </p>
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              label="Outstanding"
              value={formatInr(totals.outstanding)}
              hint={`${totals.duesCount || 0} installment(s) to pay`}
              tone={totals.overdueCount > 0 ? "red" : "slate"}
            />
            <SummaryCard
              label="Overdue"
              value={formatInr(totals.overdueAmount)}
              hint={
                totals.overdueCount > 0
                  ? `${totals.overdueCount} course(s) past due`
                  : "Nothing past due"
              }
              tone={totals.overdueCount > 0 ? "red" : "emerald"}
            />
            <SummaryCard
              label="Next due"
              value={formatDate(totals.nextDueDate)}
              hint={totals.nextDueDate ? "Earliest upcoming date" : "No pending dues"}
            />
            <SummaryCard
              label="Paid so far"
              value={formatInr(totals.totalPaid)}
              hint={`${history.length} payment(s)`}
              tone="emerald"
            />
          </div>

          <section>
            <h2 className="text-lg font-bold text-slate-950">Pending fees</h2>
            {dues.length === 0 ? (
              <div className="mt-3 flex flex-col items-center gap-2 rounded-[2rem] border border-dashed border-emerald-200 bg-emerald-50/50 py-14 text-center">
                <HiCheckCircle className="h-8 w-8 text-emerald-500" />
                <p className="font-semibold text-emerald-800">You are all paid up</p>
                <p className="text-sm text-emerald-700">
                  Nothing is due right now. We will email you before the next installment.
                </p>
              </div>
            ) : (
              <div className="mt-3 space-y-4">
                {dues.map((due) => (
                  <DueCard
                    key={`${due.courseId}-${due.slotId}-${due.installmentNo}`}
                    due={due}
                    onPay={startPayment}
                    paying={payingCourseId === due.courseId}
                  />
                ))}
              </div>
            )}
          </section>

          {summary?.settled?.length ? (
            <section>
              <h2 className="text-lg font-bold text-slate-950">Fully paid courses</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {summary.settled.map((course) => (
                  <div
                    key={course.courseId}
                    className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/40 px-4 py-3"
                  >
                    <HiCheckCircle className="h-5 w-5 flex-shrink-0 text-emerald-500" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {course.courseName}
                      </p>
                      <p className="text-xs text-slate-500">No fees pending</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <h2 className="text-lg font-bold text-slate-950">Payment history</h2>
            {history.length === 0 ? (
              <div className="mt-3 flex flex-col items-center gap-2 rounded-[2rem] border border-dashed border-slate-300 bg-white py-14 text-center text-slate-400">
                <HiOutlineDocumentText className="h-7 w-7" />
                <p className="text-sm">No payments yet.</p>
              </div>
            ) : (
              <div className="mt-3 overflow-hidden rounded-[2rem] border border-orange-100 bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="bg-stone-50 text-left text-xs uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-5 py-3 font-semibold">Course</th>
                        <th className="px-5 py-3 font-semibold">Amount</th>
                        <th className="px-5 py-3 font-semibold">Paid on</th>
                        <th className="px-5 py-3 font-semibold">Installment</th>
                        <th className="px-5 py-3 font-semibold">Mode</th>
                        <th className="px-5 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {history.map((row) => (
                        <tr key={row._id}>
                          <td className="px-5 py-3">
                            <p className="font-medium text-slate-900">{row.courseName}</p>
                            <p className="text-xs text-slate-500">{row.courseCode}</p>
                          </td>
                          <td className="px-5 py-3 font-semibold text-slate-900">
                            {formatInr(row.amount)}
                          </td>
                          <td className="px-5 py-3 text-slate-600">{formatDate(row.paidAt)}</td>
                          <td className="px-5 py-3 text-slate-600">
                            {row.paymentType === "Installment"
                              ? installmentSummary(row)
                              : row.planLabel || "Full"}
                          </td>
                          <td className="px-5 py-3">
                            <span className="inline-flex items-center gap-1 text-slate-600">
                              {row.gateway === "manual" ? (
                                <>
                                  <HiClock className="h-3.5 w-3.5 text-slate-400" />
                                  Cash at centre
                                </>
                              ) : (
                                row.paymentMode || "Online"
                              )}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => openReceipt(row)}
                              className="rounded-full border border-orange-200 px-3 py-1.5 text-xs font-semibold text-orange-700 transition hover:bg-orange-50"
                            >
                              Receipt
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {payOpen && paymentOrder ? (
        <PaymentModal
          open={payOpen}
          onClose={closeCheckout}
          order={paymentOrder}
          onSuccess={verifyPayment}
          onFailure={(err) => {
            toast.error(err?.description || "Payment failed. Please try again.");
            closeCheckout();
          }}
        />
      ) : null}

      <ReceiptPanel
        open={Boolean(receipt)}
        onClose={() => setReceipt(null)}
        receipt={receipt}
        timeline={timeline}
        loading={timelineLoading}
      />
    </StudentShell>
  );
}
