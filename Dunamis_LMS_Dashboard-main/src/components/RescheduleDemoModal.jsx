import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "react-hot-toast";
import { FiX } from "react-icons/fi";
import DemoSlotCalendar from "./DemoSlotCalendar";
import { rescheduleBooking } from "../redux/DemoBooking/DemoBookingSlice";
import { getStoredToken } from "../utils/authSession";

const BASE_URL = import.meta.env.VITE_BASE_URL;

const idOf = (value) => String(value?._id || value || "");

// Staff-side reschedule. Unlike the student flow this has no 24-hour cutoff —
// same-day moves are exactly what admins and instructors need it for.
const RescheduleDemoModal = ({ booking, onClose, onDone }) => {
  const dispatch = useDispatch();
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const courseId = idOf(booking?.courseId);
  const currentSlotId = idOf(booking?.slotId);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `${BASE_URL}/slots/available?courseId=${courseId}&slotType=demo`,
          { headers: { Authorization: `Bearer ${getStoredToken()}` } }
        );
        const data = await res.json();
        if (!res.ok || data.success === false) {
          throw new Error(data.message || "Could not load available times.");
        }
        if (cancelled) return;
        setSlots((data.slots || []).filter((slot) => idOf(slot) !== currentSlotId));
      } catch (err) {
        if (!cancelled) setError(err.message || "Could not load available times.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [courseId, currentSlotId]);

  const submit = async () => {
    if (!selectedId) {
      setError("Pick a new time first.");
      return;
    }
    setSaving(true);
    try {
      const result = await dispatch(
        rescheduleBooking({
          id: booking._id,
          slotId: selectedId,
          reason: reason.trim() || undefined,
        })
      ).unwrap();
      toast.success(result.message || "Demo rescheduled");
      onDone();
    } catch (err) {
      const message = err?.message || err?.hint || "Could not reschedule this demo.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Reschedule demo</h2>
            <p className="mt-1 text-sm text-slate-500">
              {booking?.courseId?.name || "Demo class"} · pick a new time or instructor
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <p className="text-sm text-slate-500">Loading available times…</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-slate-500">
              No other demo slots are open for this course. Add availability for an
              instructor first.
            </p>
          ) : (
            <div className="space-y-5">
              <DemoSlotCalendar
                slots={slots}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Reason (optional)
                </span>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="Recorded on the booking's history"
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />
              </label>
            </div>
          )}

          {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving || !selectedId}
            className="rounded-2xl bg-[#FF6B35] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#fd5a1f] disabled:opacity-50"
          >
            {saving ? "Saving…" : "Confirm new time"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RescheduleDemoModal;
