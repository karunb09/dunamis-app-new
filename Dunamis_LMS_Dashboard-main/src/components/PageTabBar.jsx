import React from "react";

const PageTabBar = ({ tabs, activeTab, onChange }) => (
    <div className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-full bg-white p-1.5 shadow-sm ring-1 ring-slate-200/70 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => {
            const key = typeof tab === "string" ? tab : tab.id;
            const label = typeof tab === "string" ? tab : tab.label;
            const isActive = activeTab === key;
            return (
                <button
                    key={key}
                    type="button"
                    onClick={() => onChange(key)}
                    className={`shrink-0 whitespace-nowrap rounded-full px-5 py-2.5 text-sm transition-all ${
                        isActive
                            ? "bg-slate-900 font-semibold text-white shadow-sm"
                            : "font-medium text-slate-500 hover:text-slate-900"
                    }`}
                >
                    {label}
                </button>
            );
        })}
    </div>
);

export default PageTabBar;
