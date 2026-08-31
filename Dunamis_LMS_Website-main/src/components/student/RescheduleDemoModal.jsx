"use client";

import { useEffect, useState } from "react";
import { HiX } from "react-icons/hi";
import DemoSlotCalendar from "./DemoSlotCalendar";
import { getWebsiteToken } from "@/lib/authSession";
import { API_BASE } from "@/lib/apiBase";

// Picking a slot owned by a different instructor is how a student changes
// instructor — there is no separate control, and the server reassigns.
const RescheduleDemoModal = ({ booking, onClose, onDone }) => {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const courseId = booking?.courseId?._id || booking?.courseId;
  const currentSlotId = booking?.slotId?._id || booking?.slotId;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `${API_BASE}/v1/slots/available?courseId=${courseId}&slotType=demo`
        );
        const data = await res.json();
        if (!res.ok || data.success === false) {
          throw new Error(data.message || "Could not load available times.");
        }
        if (cancelled) return;
        setSlots((data.slots || []).filter((slot) => String(slot._id) !== String(currentSlotId)));
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
    setError("");
    try {
      const token = getWebsiteToken();
      const res = await fetch(`${API_BASE}/v1/demoBookings/${booking._id}/reschedule`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ slotId: selectedId, reason: reason.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error([data.message, data.hint].filter(Boolean).join(" "));
      }
      onDone(data.message || "Demo rescheduled.");
    } catch (err) {
      setError(err.message || "Could not reschedule this demo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-[2rem] bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-stone-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Reschedule demo</h2>
            <p className="mt-1 text-sm text-slate-500">
              {booking?.courseId?.name || "Demo class"} · pick a new time or instructor
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-500 transition hover:bg-stone-100"
          >
            <HiX className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <p className="text-sm text-slate-500">Loading available times…</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-slate-500">
              No other demo times are open for this course right now. Please contact us and
              we will find you a slot.
            </p>
          ) : (
            <div className="space-y-5">
              <DemoSlotCalendar
                slots={slots}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Reason (optional)
                </span>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="Let your instructor know why"
                  className="mt-1 w-full rounded-2xl border border-stone-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-orange-400"
                />
              </label>
            </div>
          )}

          {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-stone-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-stone-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving || !selectedId}
            className="rounded-full bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Confirm new time"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RescheduleDemoModal;
