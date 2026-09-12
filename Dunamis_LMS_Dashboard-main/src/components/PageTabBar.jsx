import React, { useLayoutEffect, useRef, useState } from "react";

const PageTabBar = ({ tabs, activeTab, onChange }) => {
    const barRef = useRef(null);
    const [pill, setPill] = useState(null);

    // Callers often rebuild `tabs` every render, so measure on activeTab and let the
    // ResizeObserver catch label/font-load width changes instead of depending on `tabs`.
    useLayoutEffect(() => {
        const bar = barRef.current;
        const measure = () => {
            const active = bar.querySelector('[aria-selected="true"]');
            if (!active) {
                setPill(null);
                return;
            }
            const { offsetLeft: left, offsetWidth: width } = active;
            setPill((prev) => (prev?.left === left && prev?.width === width ? prev : { left, width }));
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(bar);
        return () => observer.disconnect();
    }, [activeTab]);

    return (
        <div
            ref={barRef}
            role="tablist"
            className="relative flex w-fit max-w-full gap-1 overflow-x-auto rounded-full bg-white p-1.5 shadow-sm ring-1 ring-slate-200/70 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
            {pill && (
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute bottom-1.5 left-0 top-1.5 rounded-full bg-slate-900 shadow-md shadow-slate-900/20 transition-[transform,width] duration-500 ease-out-expo motion-reduce:transition-none"
                    style={{ width: pill.width, transform: `translateX(${pill.left}px)` }}
                />
            )}
            {tabs.map((tab) => {
                const key = typeof tab === "string" ? tab : tab.id;
                const label = typeof tab === "string" ? tab : tab.label;
                const isActive = activeTab === key;
                return (
                    <button
                        key={key}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => onChange(key)}
                        className={`relative shrink-0 whitespace-nowrap rounded-full px-5 py-2.5 text-sm transition-[color,transform] duration-300 active:scale-[0.97] ${
                            isActive
                                ? `font-semibold text-white ${pill ? "" : "bg-slate-900"}`
                                : "font-medium text-slate-500 hover:text-slate-900"
                        }`}
                    >
                        {label}
                    </button>
                );
            })}
        </div>
    );
};

export default PageTabBar;
