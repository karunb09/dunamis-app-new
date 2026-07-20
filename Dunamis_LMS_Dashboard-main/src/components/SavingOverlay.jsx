import React, { useEffect, useState } from "react";

const SavingOverlay = ({ show, label = "Saving changes…", delay = 400 }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!show) {
            setVisible(false);
            return undefined;
        }
        const timer = setTimeout(() => setVisible(true), delay);
        return () => clearTimeout(timer);
    }, [show, delay]);

    if (!visible) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white/60 backdrop-blur-sm">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-6 py-4 shadow-lg shadow-slate-200/60">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-[#FF6B35]" />
                <p className="text-sm font-medium text-slate-700">{label}</p>
            </div>
        </div>
    );
};

export default SavingOverlay;
