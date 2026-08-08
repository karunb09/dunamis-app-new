export const TONES = {
  rose: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
  amber: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  slate: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  emerald: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  sky: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
};

export const STATUS_TONES = {
  fulfilled: "emerald",
  paid: "amber",
  paid_pending_fulfillment: "amber",
  refunded: "slate",
  failed: "rose",
  dropped: "rose",
  expired: "slate",
  created: "sky",
  pending: "sky",
};

export const REASON_META = {
  unfulfilled_after_payment: { label: "Paid, not fulfilled", tone: "rose" },
  paid_never_fulfilled: { label: "Paid, never fulfilled", tone: "rose" },
  expired_unpaid: { label: "Expired unpaid", tone: "slate" },
  stale_pending: { label: "Stale pending", tone: "amber" },
};

export const BUCKET_META = {
  "0-7": { label: "0–7 days", tone: "amber" },
  "8-30": { label: "8–30 days", tone: "rose" },
  "30+": { label: "30+ days", tone: "rose" },
};

export const formatInr = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

export const formatAge = (ms) => {
  if (ms == null) return "—";
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d ${hrs % 24}h`;
};
