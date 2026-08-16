import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import { toast } from "react-hot-toast";
import Swal from "sweetalert2";
import { FiX } from "react-icons/fi";
import { useRecordCashInstallment } from "../../../hooks/usePayments";
import { formatInr } from "./financeFormat";

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100";

const labelClass = "mb-1.5 block text-xs font-semibold text-slate-600";

// `due` is a row from the dues list (or an equivalent shape assembled on a
// student page): studentId, courseId, slotId, sessionType, amountDue,
// installmentNo, dueDate, student, course.
const RecordCashModal = ({ open, due, onClose, onRecorded }) => {
  const [paymentDate, setPaymentDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [receiptRef, setReceiptRef] = useState("");
  const [note, setNote] = useState("");
  const [discountType, setDiscountType] = useState("");
  const [discountValue, setDiscountValue] = useState("");
  const recordCash = useRecordCashInstallment();

  useEffect(() => {
    if (!open) return;
    setPaymentDate(dayjs().format("YYYY-MM-DD"));
    setReceiptRef("");
    setNote("");
    setDiscountType("");
    setDiscountValue("");
  }, [open, due?.studentId, due?.courseId]);

  if (!open || !due) return null;

  const amountDue = Number(due.amountDue || 0);
  const studentName = due.student?.name?.trim() || "this student";
  // The dues row carries the last PAID installment; cash clears the next one.
  const installmentNo = Number(due.installmentNo || 0) + 1;

  // Mirrors the server: the waiver is priced off the amount due and the
  // remainder is still required in full. Floors at ₹1.
  const discountAmount = (() => {
    const value = Number(discountValue) || 0;
    if (!discountType || value <= 0 || amountDue <= 0) return 0;
    const raw =
      discountType === "percent"
        ? Math.round((amountDue * value) / 100)
        : Math.round(value);
    return Math.min(raw, Math.max(0, amountDue - 1));
  })();
  const collectAmount = amountDue - discountAmount;

  const submit = async (event) => {
    event.preventDefault();

    const confirmed = await Swal.fire({
      title: "Record cash payment?",
      html: `<div style="text-align:left;font-size:14px;line-height:1.7">
        <b>${formatInr(collectAmount)}</b> will be recorded as received in cash from
        <b>${studentName}</b> for <b>${due.course?.name || "this course"}</b>
        (installment ${installmentNo}).<br/>
        ${
          discountAmount > 0
            ? `A discount of <b>${formatInr(discountAmount)}</b> off ${formatInr(
                amountDue
              )} will be recorded against this installment.<br/>`
            : ""
        }<br/>
        This marks the installment paid and restores course access. It cannot be undone from here.
      </div>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, record it",
      confirmButtonColor: "#FF6B35",
      cancelButtonText: "Cancel",
    });

    if (!confirmed.isConfirmed) return;

    try {
      const result = await recordCash.mutateAsync({
        studentId: due.studentId,
        courseId: due.courseId,
        slotId: due.slotId || undefined,
        sessionType: due.sessionType || undefined,
        amount: collectAmount,
        discountType: discountType || undefined,
        discountValue: discountType ? Number(discountValue) : undefined,
        paymentDate,
        receiptRef: receiptRef.trim() || undefined,
        note: note.trim() || undefined,
      });

      toast.success(result.message || "Cash payment recorded");

      if (result.hint) {
        Swal.fire({
          title: "Recorded, but needs review",
          text: `${result.message} ${result.hint}`,
          icon: "warning",
          confirmButtonColor: "#FF6B35",
        });
      }

      onRecorded?.(result);
      onClose();
    } catch (error) {
      const options = error.response?.data?.options;
      if (options?.length) {
        Swal.fire({
          title: "More than one enrollment",
          text: "This student has multiple enrollments for this course. Open the student's profile and record the payment against the correct batch.",
          icon: "info",
          confirmButtonColor: "#FF6B35",
        });
        return;
      }
      toast.error(error.message || "Failed to record the cash payment");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-3 py-6 backdrop-blur-sm sm:items-center">
      <form
        onSubmit={submit}
        className="relative my-auto w-full max-w-md rounded-3xl bg-white p-6 shadow-xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 transition hover:text-slate-700"
          aria-label="Close"
        >
          <FiX className="text-xl" />
        </button>

        <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">
          Cash at centre
        </p>
        <h2 className="mt-1 text-xl font-bold text-slate-900">Record cash payment</h2>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-slate-900">{studentName}</p>
              <p className="truncate text-xs text-slate-500">{due.student?.email || "—"}</p>
            </div>
            <p className="flex-shrink-0 text-right text-lg font-bold text-slate-900">
              {formatInr(collectAmount)}
              {discountAmount > 0 && (
                <span className="block text-xs font-medium text-slate-400 line-through">
                  {formatInr(amountDue)}
                </span>
              )}
            </p>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
            <div>
              <dt className="text-slate-400">Course</dt>
              <dd className="font-medium text-slate-700">{due.course?.name || "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Installment</dt>
              <dd className="font-medium text-slate-700">
                {installmentNo} of {due.installmentTotal || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-400">Was due</dt>
              <dd className="font-medium text-slate-700">
                {due.dueDate ? dayjs(due.dueDate).format("D MMM YYYY") : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-400">Batch</dt>
              <dd className="font-medium text-slate-700">
                {due.sessionType === "premium" ? "One-to-one" : "Group"}
              </dd>
            </div>
          </dl>
        </div>

        <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800 ring-1 ring-amber-200">
          The full amount must be collected. If the student paid less, either collect the balance
          or record the shortfall as a discount below — don't record a partial amount.
        </p>

        <div className="mt-4">
          <span className={labelClass}>Discount (optional)</span>
          <div className="flex flex-wrap gap-2">
            {[
              { key: "", label: "No discount" },
              { key: "percent", label: "Percent (%)" },
              { key: "flat", label: "Flat (₹)" },
            ].map((option) => (
              <button
                key={option.key || "none"}
                type="button"
                onClick={() => {
                  setDiscountType(option.key);
                  if (!option.key) setDiscountValue("");
                }}
                className={`rounded-2xl border px-4 py-2 text-sm font-medium transition ${
                  discountType === option.key
                    ? "border-orange-300 bg-orange-50 text-orange-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {discountType && (
            <div className="relative mt-3 max-w-[200px]">
              <input
                type="number"
                min="1"
                max={discountType === "percent" ? 100 : undefined}
                step="1"
                value={discountValue}
                onChange={(event) => setDiscountValue(event.target.value)}
                placeholder={discountType === "percent" ? "e.g. 10" : "e.g. 500"}
                className={`${inputClass} pr-9`}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                {discountType === "percent" ? "%" : "₹"}
              </span>
            </div>
          )}

          {discountAmount > 0 && (
            <div className="mt-3 rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-slate-200">
              <div className="flex items-center justify-between text-slate-600">
                <span>Installment due</span>
                <span>{formatInr(amountDue)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-emerald-600">
                <span>Discount</span>
                <span>− {formatInr(discountAmount)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 font-semibold text-slate-900">
                <span>To collect</span>
                <span>{formatInr(collectAmount)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className={labelClass} htmlFor="cash-date">
              Date collected
            </label>
            <input
              id="cash-date"
              type="date"
              value={paymentDate}
              max={dayjs().format("YYYY-MM-DD")}
              onChange={(e) => setPaymentDate(e.target.value)}
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="cash-receipt">
              Receipt number <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="cash-receipt"
              type="text"
              value={receiptRef}
              onChange={(e) => setReceiptRef(e.target.value)}
              placeholder="e.g. DNM-RCPT-0142"
              maxLength={120}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="cash-note">
              Note <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              id="cash-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Anything the finance team should know"
              className={inputClass}
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={
              recordCash.isPending || (Boolean(discountType) && discountAmount <= 0)
            }
            className="rounded-2xl bg-[#FF6B35] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#fd5a1f] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {recordCash.isPending ? "Recording..." : `Record ${formatInr(collectAmount)}`}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RecordCashModal;
