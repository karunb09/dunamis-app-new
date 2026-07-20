import React, { useEffect, useRef, useState } from "react";
import { FiMoreVertical } from "react-icons/fi";

const RowActionsMenu = ({ items = [] }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handleOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, []);

    if (!items.length) return null;

    return (
        <div className="relative inline-block" ref={ref}>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    setOpen((o) => !o);
                }}
                aria-label="Row actions"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
            >
                <FiMoreVertical size={16} />
            </button>
            {open && (
                <div className="absolute right-0 top-full z-40 mt-1 w-48 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-lg shadow-slate-200/50">
                    <div className="max-h-64 overflow-y-auto">
                        {items.map((item, i) => (
                            <button
                                key={i}
                                type="button"
                                disabled={item.disabled}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setOpen(false);
                                    item.onClick(e);
                                }}
                                className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                                    item.danger
                                        ? "text-rose-600 hover:bg-rose-50"
                                        : "text-slate-700 hover:bg-slate-50"
                                }`}
                            >
                                {item.icon && <span className="text-sm">{item.icon}</span>}
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default RowActionsMenu;
