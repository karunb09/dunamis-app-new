import React, { useEffect, useRef, useState } from "react";
import { FiMoreVertical } from "react-icons/fi";
import { FaArrowRight } from "react-icons/fa";

const getInitials = (name = "") =>
    name.split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase() || "").join("") || "?";

const PersonCard = ({
    avatarSrc,
    avatarFallback = "/profile-photo.png",
    name,
    subtitle,
    statusBadge,
    meta = [],
    children,
    onView,
    primaryLabel = "View Details",
    menuItems = [],
    selected = false,
    onSelect,
}) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
        };
        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, []);

    const hasFooter = onView || menuItems.length > 0;

    return (
        <div
            onClick={onView || undefined}
            className={`flex flex-col rounded-[24px] border bg-white shadow-[0_4px_16px_-8px_rgba(15,23,42,0.10)] transition-shadow hover:shadow-[0_12px_32px_-8px_rgba(15,23,42,0.16)] ${
                selected ? "border-orange-300 ring-1 ring-orange-200" : "border-slate-200"
            } ${onView ? "cursor-pointer" : ""}`}
        >
            {/* Header */}
            <div className="flex items-start gap-3 p-5 pb-3">
                {onSelect && (
                    <input
                        type="checkbox"
                        checked={selected}
                        onChange={onSelect}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-200 accent-orange-500 focus:ring-orange-300"
                    />
                )}
                <div className="shrink-0">
                    {avatarSrc ? (
                        <img
                            src={avatarSrc}
                            alt={name}
                            className="h-11 w-11 rounded-2xl object-cover object-top"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = avatarFallback;
                            }}
                        />
                    ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FFD9C7] to-[#FFF1EB] text-sm font-bold text-[#FF6B35]">
                            {getInitials(name)}
                        </div>
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{name || "—"}</p>
                    {subtitle && (
                        <p className="mt-0.5 truncate text-xs text-slate-500" title={subtitle}>
                            {subtitle}
                        </p>
                    )}
                </div>
                {statusBadge && (
                    <span
                        className={`ml-1 shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                            statusBadge.className || "bg-slate-100 text-slate-600"
                        }`}
                    >
                        {statusBadge.dot && (
                            <span className={`h-1.5 w-1.5 rounded-full ${statusBadge.dotClass || "bg-current"}`} />
                        )}
                        {statusBadge.label}
                    </span>
                )}
            </div>

            {/* Meta grid */}
            {meta.length > 0 && (
                <div className="mx-5 grid grid-cols-2 gap-x-4 gap-y-2.5 rounded-2xl bg-slate-50/70 px-4 py-3">
                    {meta.map((item, i) => (
                        <div key={i} className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                {item.label}
                            </p>
                            <div
                                className="mt-0.5 truncate text-xs font-medium text-slate-700"
                                title={typeof item.value === "string" ? item.value : undefined}
                            >
                                {item.render ? item.render(item.value) : (item.value ?? "—")}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Custom children */}
            {children && <div className="px-5 pt-3">{children}</div>}

            {/* Footer */}
            {hasFooter && (
                <div className="mt-auto flex items-center gap-2 p-5 pt-4">
                    {onView && (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onView(); }}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#FF6B35] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#fd5a1f]"
                        >
                            {primaryLabel}
                            <FaArrowRight className="text-[10px]" />
                        </button>
                    )}
                    {menuItems.length > 0 && (
                        <div className="relative" ref={menuRef}>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setMenuOpen((o) => !o);
                                }}
                                aria-label="More actions"
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                            >
                                <FiMoreVertical size={20} />
                            </button>
                            {menuOpen && (
                                <div className="absolute bottom-full mb-1 right-0 z-40 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
                                    {menuItems.map((item, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            disabled={item.disabled}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setMenuOpen(false);
                                                item.onClick(e);
                                            }}
                                            className={`flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
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
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PersonCard;
