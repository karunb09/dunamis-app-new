"use client";

import { LOGIN_PORTALS } from "@/lib/roleRouting";

export default function PortalSelector({ value, onChange, compact = false }) {
  return (
    <div className={compact ? "grid grid-cols-3 gap-2" : "grid gap-3 sm:grid-cols-3"}>
      {LOGIN_PORTALS.map((portal) => {
        const active = value === portal.id;

        return (
          <button
            key={portal.id}
            type="button"
            onClick={() => onChange(portal.id)}
            className={`rounded-2xl border text-left transition ${
              compact ? "px-3 py-2" : "px-4 py-4"
            } ${
              active
                ? "border-orange-500 bg-orange-50 text-orange-800 shadow-sm"
                : "border-stone-200 bg-white text-slate-700 hover:border-orange-200 hover:bg-orange-50/40"
            }`}
            aria-pressed={active}
          >
            <span className="block text-sm font-bold">{portal.label}</span>
            {!compact ? (
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                {portal.description}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
