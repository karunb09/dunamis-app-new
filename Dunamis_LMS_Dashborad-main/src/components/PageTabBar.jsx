import React from "react";

const PageTabBar = ({ tabs, activeTab, onChange }) => (
    <div className="flex flex-wrap gap-1 rounded-2xl bg-slate-100 p-1 w-fit">
        {tabs.map((tab) => {
            const key = typeof tab === "string" ? tab : tab.id;
            const label = typeof tab === "string" ? tab : tab.label;
            const isActive = activeTab === key;
            return (
                <button
                    key={key}
                    type="button"
                    onClick={() => onChange(key)}
                    className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                        isActive
                            ? "bg-white text-orange-600 shadow-sm ring-1 ring-orange-100"
                            : "text-slate-500 hover:text-slate-800"
                    }`}
                >
                    {label}
                </button>
            );
        })}
    </div>
);

export default PageTabBar;
