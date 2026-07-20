import React, { useEffect, useRef, useState } from "react";
import { FiChevronDown, FiDownload } from "react-icons/fi";

const ExportMenu = ({
    onExportAll,
    onExportSelected,
    totalCount = 0,
    selectedCount = 0,
    exporting = false,
}) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handleOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, []);

    const run = (fn) => {
        setOpen(false);
        fn();
    };

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                disabled={exporting || totalCount === 0}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
                <FiDownload size={15} />
                {exporting ? "Exporting…" : "Export"}
                <FiChevronDown
                    size={14}
                    className={`transition-transform ${open ? "rotate-180" : ""}`}
                />
            </button>
            {open && (
                <div className="absolute right-0 top-full z-40 mt-1 w-56 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-lg shadow-slate-200/50">
                    <button
                        type="button"
                        onClick={() => run(onExportAll)}
                        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                    >
                        All filtered
                        <span className="text-xs text-slate-400">{totalCount}</span>
                    </button>
                    <button
                        type="button"
                        disabled={selectedCount === 0}
                        onClick={() => run(onExportSelected)}
                        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        Selected
                        <span className="text-xs text-slate-400">{selectedCount}</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default ExportMenu;
