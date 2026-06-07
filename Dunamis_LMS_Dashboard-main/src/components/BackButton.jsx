import React from "react";
import { useNavigate } from "react-router-dom";
import { HiArrowLeft } from "react-icons/hi";
import { goBackPath } from "../utils/navHistory";

/**
 * Reusable Back control.
 * Pops the localStorage navigation history and navigates to the previous
 * screen. Falls back to the provided `fallback` route (or the router's own
 * history) when there is nothing recorded — e.g. on a hard page reload.
 */
const BackButton = ({
    fallback = null,
    label = "Back",
    className = "",
}) => {
    const navigate = useNavigate();

    const handleBack = () => {
        const previous = goBackPath();
        if (previous) {
            navigate(previous);
        } else if (fallback) {
            navigate(fallback);
        } else {
            navigate(-1);
        }
    };

    return (
        <button
            type="button"
            onClick={handleBack}
            className={`inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 ${className}`}
            aria-label={label}
        >
            <HiArrowLeft className="text-base" />
            {label}
        </button>
    );
};

export default BackButton;
