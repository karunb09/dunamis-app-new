import React from "react";
import { FiRefreshCw } from "react-icons/fi";

// List pages keep showing cached rows during a refetch, so the spinning icon is
// the only acknowledgement that a manual refresh actually started.
const RefreshButton = ({ onRefresh, busy = false, label = "Refresh" }) => (
    <button
        type="button"
        onClick={onRefresh}
        disabled={busy}
        title="Fetch the latest data"
        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
    >
        <FiRefreshCw className={busy ? "animate-spin" : ""} />
        {label}
    </button>
);

export default RefreshButton;
