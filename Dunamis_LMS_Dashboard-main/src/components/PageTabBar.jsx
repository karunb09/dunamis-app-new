import React from "react";

const PageTabBar = ({ tabs, activeTab, onChange }) => (
    <div className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-2xl bg-slate-100 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => {
            const key = typeof tab === "string" ? tab : tab.id;
            const label = typeof tab === "string" ? tab : tab.label;
            const isActive = activeTab === key;
            return (
                <button
                    key={key}
                    type="button"
                    onClick={() => onChange(key)}
                    className={`shrink-0 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all ${
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
