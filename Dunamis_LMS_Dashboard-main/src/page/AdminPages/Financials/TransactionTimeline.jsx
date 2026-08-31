import React from "react";
import dayjs from "dayjs";
import SlideOver from "../../../components/SlideOver";
import { usePaymentDetail } from "../../../hooks/usePayments";
import { installmentSummary } from "../../../utils/installmentLabel";
import { STATUS_TONES, formatInr } from "./financeFormat";
import { Pill } from "./financeUi";

// Mirrors the event types recorded by services/paymentService.js.
const EVENT_META = {
  order_initiated: { label: "Order initiated", tone: "sky" },
  order_created: { label: "Gateway order created", tone: "sky" },
  order_reused: { label: "Checkout reopened", tone: "slate" },
  order_superseded: { label: "Superseded by repriced order", tone: "slate" },
  checkout_opened: { label: "Checkout opened", tone: "sky" },
  checkout_dismissed: { label: "Checkout abandoned", tone: "amber" },
  webhook_received: { label: "Webhook received", tone: "sky" },
  verify_requested: { label: "Verification requested", tone: "sky" },
  gateway_paid: { label: "Gateway confirmed payment", tone: "emerald" },
  gateway_not_paid: { label: "Gateway reported unpaid", tone: "amber" },
  core_fulfilled: { label: "Fees applied, access granted", tone: "emerald" },
  fulfilled: { label: "Seat assigned, enrollment complete", tone: "emerald" },
  fulfillment_deferred: { label: "Fulfilment deferred", tone: "rose" },
  failed: { label: "Failed", tone: "rose" },
  expired: { label: "Session expired", tone: "slate" },
  reconciled: { label: "Recovered by reconciler", tone: "emerald" },
  cash_recorded: { label: "Cash recorded at centre", tone: "emerald" },
};

const ACTOR_LABELS = {
  student: "Student",
  admin: "Admin",
  system: "System",
  gateway: "Gateway",
};

const Row = ({ label, children }) => (
  <div className="flex items-start justify-between gap-4 py-2">
    <dt className="flex-shrink-0 text-xs text-slate-500">{label}</dt>
    <dd className="text-right text-sm font-medium text-slate-800">{children}</dd>
  </div>
);

const TransactionTimeline = ({ open, transactionId, onClose }) => {
  const { data, isLoading, isError, error } = usePaymentDetail(open ? transactionId : null);
  const txn = data?.transaction;
  const events = txn?.events || [];

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Close
        </button>
      }
    >
      <div className="bg-gradient-to-br from-[#FF6B35] to-[#fd5a1f] px-6 py-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
          Payment audit trail
        </p>
        <h2 className="mt-1 text-2xl font-bold">
          {isLoading ? "Loading..." : formatInr(txn?.amount)}
        </h2>
        {txn ? (
          <p className="mt-1 break-all font-mono text-xs text-white/80">{txn.merchantOrderId}</p>
        ) : null}
      </div>

      <div className="px-6 py-5">
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-24 rounded-2xl bg-slate-100" />
            <div className="h-40 rounded-2xl bg-slate-100" />
          </div>
        ) : isError ? (
          <p className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">
            {error?.message || "Could not load this payment."}
          </p>
        ) : !txn ? null : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center">
                <p className="text-[11px] text-slate-500">Status</p>
                <div className="mt-1 flex justify-center">
                  <Pill tone={STATUS_TONES[txn.status] || "slate"}>{txn.status}</Pill>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center">
                <p className="text-[11px] text-slate-500">Gateway</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {txn.gateway === "manual" ? "Cash" : "Cashfree"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center">
                <p className="text-[11px] text-slate-500">Installment</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {txn.paymentType === "Installment" ? installmentSummary(txn) : "Full"}
                </p>
              </div>
            </div>

            <dl className="mt-5 divide-y divide-slate-100">
              <Row label="Student">{txn.student?.name || "—"}</Row>
              <Row label="Email">
                <span className="break-all text-xs">{txn.student?.email || "—"}</span>
              </Row>
              <Row label="Course">{txn.courseId?.name || "—"}</Row>
              <Row label="Created">{dayjs(txn.createdAt).format("D MMM YYYY, h:mm A")}</Row>
              <Row label="Paid at">
                {txn.paidAt ? dayjs(txn.paidAt).format("D MMM YYYY, h:mm A") : "—"}
              </Row>
              <Row label="Fulfilled at">
                {txn.fulfilledAt ? dayjs(txn.fulfilledAt).format("D MMM YYYY, h:mm A") : "—"}
              </Row>
              {txn.gateway === "manual" ? (
                <>
                  <Row label="Collected by">
                    {txn.collectedByUserId
                      ? `${txn.collectedByUserId.name?.firstName || ""} ${
                          txn.collectedByUserId.name?.lastName || ""
                        }`.trim() || txn.collectedByUserId.email
                      : "—"}
                  </Row>
                  <Row label="Receipt no.">{txn.bankReference || "—"}</Row>
                  {txn.recordNote ? <Row label="Note">{txn.recordNote}</Row> : null}
                </>
              ) : (
                <>
                  <Row label="Payment ID">
                    <span className="break-all font-mono text-xs">
                      {txn.cashfreePaymentId || "—"}
                    </span>
                  </Row>
                  <Row label="Captured">
                    {txn.gatewayCapturedAmount != null
                      ? formatInr(txn.gatewayCapturedAmount)
                      : "—"}
                  </Row>
                  {txn.gatewayOfferDiscount > 0 ? (
                    <Row label="Gateway offer">{formatInr(txn.gatewayOfferDiscount)}</Row>
                  ) : null}
                </>
              )}
              {txn.discountAmount > 0 ? (
                <Row label="Referral discount">
                  {formatInr(txn.discountAmount)}
                  {txn.referralCode ? ` (${txn.referralCode})` : ""}
                </Row>
              ) : null}
              {txn.lastError ? (
                <Row label="Last error">
                  <span className="text-xs text-rose-600">{txn.lastError}</span>
                </Row>
              ) : null}
            </dl>

            <div className="mt-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Lifecycle ({events.length})
              </p>
              {events.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">
                  No events recorded. This payment predates the audit trail.
                </p>
              ) : (
                <ol className="relative space-y-4 border-l border-slate-200 pl-5">
                  {events.map((event, index) => {
                    const meta = EVENT_META[event.type] || { label: event.type, tone: "slate" };
                    return (
                      <li key={`${event.type}-${index}`} className="relative">
                        <span className="absolute -left-[1.6rem] top-1.5 h-2.5 w-2.5 rounded-full bg-orange-400 ring-2 ring-white" />
                        <div className="flex flex-wrap items-center gap-2">
                          <Pill tone={meta.tone}>{meta.label}</Pill>
                          <span className="text-[11px] text-slate-400">
                            {ACTOR_LABELS[event.actor] || event.actor}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {dayjs(event.at).format("D MMM YYYY, h:mm:ss A")}
                        </p>
                        {event.detail ? (
                          <p className="mt-1 text-xs leading-5 text-slate-600">{event.detail}</p>
                        ) : null}
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </>
        )}
      </div>
    </SlideOver>
  );
};

export default TransactionTimeline;
