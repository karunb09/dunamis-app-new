import React from "react";

const IconTabBar = ({ tabs, activeTab, onChange, orientation = "horizontal" }) => {
    const normalized = tabs.map((tab) =>
        typeof tab === "string" ? { id: tab, label: tab } : tab
    );
    // "vertical" is responsive: a horizontal scroll bar on mobile, a side rail from md up.
    const vertical = orientation === "vertical";

    const outerClass = vertical
        ? "overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:overflow-x-visible md:w-60 md:shrink-0 md:rounded-2xl md:border md:border-slate-200 md:bg-white md:p-2.5 md:shadow-sm"
        : "overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

    const innerClass = vertical
        ? "flex min-w-max items-stretch gap-1 border-b border-slate-200 md:min-w-0 md:flex-col md:gap-0.5 md:border-b-0"
        : "flex min-w-max items-stretch gap-1 border-b border-slate-200";

    return (
        <div className={outerClass}>
            <div className={innerClass}>
                {normalized.map(({ id, label, icon: Icon }) => {
                    const isActive = activeTab === id;
                    return (
                        <button
                            key={id}
                            type="button"
                            onClick={() => onChange(id)}
                            aria-current={isActive ? "page" : undefined}
                            className={`group relative flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-medium outline-none ${
                                vertical
                                    ? `md:w-full md:justify-start md:gap-2.5 md:rounded-xl md:px-3 md:py-2.5 ${
                                          isActive ? "md:bg-orange-50" : "md:hover:bg-slate-50"
                                      }`
                                    : ""
                            }`}
                        >
                            {Icon && (
                                <span
                                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-all duration-200 ${
                                        isActive
                                            ? "bg-orange-100 text-orange-600"
                                            : "text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-600"
                                    }`}
                                >
                                    <Icon size={14} />
                                </span>
                            )}
                            <span
                                className={`whitespace-nowrap transition-colors duration-200 ${
                                    isActive
                                        ? "font-semibold text-slate-900"
                                        : "text-slate-500 group-hover:text-slate-800"
                                }`}
                            >
                                {label}
                            </span>
                            <span
                                className={`pointer-events-none absolute inset-x-2 -bottom-px h-[3px] rounded-full transition-all duration-200 ${
                                    vertical
                                        ? "md:inset-x-auto md:left-0 md:bottom-2 md:top-2 md:h-auto md:w-[3px]"
                                        : ""
                                } ${
                                    isActive
                                        ? `bg-gradient-to-r from-[#FF6B35] to-[#ff8c5f] opacity-100 ${vertical ? "md:bg-gradient-to-b" : ""}`
                                        : `bg-slate-300 opacity-0 group-hover:opacity-40 ${vertical ? "md:group-hover:opacity-0" : ""}`
                                }`}
                            />
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default IconTabBar;
