"use client";

import { HiCalendar, HiExternalLink, HiLocationMarker, HiMail, HiUser } from "react-icons/hi";
import SuccessSplash from "@/components/auth/SuccessSplash";

const directionsUrl = (branch) => {
  const geo = branch?.raw?.geo;
  const query =
    geo?.lat != null && geo?.lng != null
      ? `${geo.lat},${geo.lng}`
      : [branch?.label, branch?.raw?.location, branch?.city].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
};

export default function DemoConfirmation({ booked, onDone, onBookAnother }) {
  const { when, teacher, durationMinutes, email, branch } = booked;
  const hours = Array.isArray(branch?.raw?.branchTimings) ? branch.raw.branchTimings : [];

  return (
    <div className="py-4">
      <SuccessSplash title="Your free demo is booked!">
        <div className="w-full max-w-md space-y-4 text-left">
          <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
            <p className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <HiCalendar aria-hidden="true" className="shrink-0 text-[#CC3700]" />
              {when}
            </p>
            {durationMinutes ? (
              <p className="mt-1 pl-7 text-[15px] text-slate-700">Free · {durationMinutes} minutes</p>
            ) : null}
            <p className="mt-3 flex items-center gap-2 text-[15px] text-slate-800">
              <HiUser aria-hidden="true" className="shrink-0 text-[#CC3700]" />
              with {teacher}
            </p>
          </div>

          {branch ? (
            <div className="rounded-2xl bg-orange-50 p-5 ring-1 ring-orange-100">
              <p className="flex items-start gap-2 text-[15px] font-semibold text-slate-900">
                <HiLocationMarker aria-hidden="true" className="mt-0.5 shrink-0 text-[#CC3700]" />
                <span>
                  {branch.label}
                  {branch.raw?.location ? (
                    <span className="block font-normal text-slate-700">{branch.raw.location}</span>
                  ) : null}
                </span>
              </p>
              {hours.length === 2 ? (
                <p className="mt-2 pl-7 text-sm text-slate-700">
                  Open {hours[0]} – {hours[1]}
                </p>
              ) : null}
              <p className="mt-2 pl-7 text-sm text-slate-700">Please arrive 5 minutes early.</p>
              <a
                href={directionsUrl(branch)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-white px-4 text-[15px] font-semibold text-[#B83100] ring-1 ring-orange-200 transition hover:bg-orange-100"
              >
                Get directions
                <HiExternalLink aria-hidden="true" />
              </a>
            </div>
          ) : (
            <p className="flex items-start gap-2 rounded-2xl bg-orange-50 p-4 text-[15px] text-slate-800 ring-1 ring-orange-100">
              <HiMail aria-hidden="true" className="mt-0.5 shrink-0 text-[#CC3700]" />
              <span>
                We&apos;ll email you the joining link{email ? <> at <strong>{email}</strong></> : null}.
              </span>
            </p>
          )}

          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={onDone}
              className="min-h-12 w-full rounded-2xl bg-[#CC3700] text-base font-semibold text-white transition hover:bg-[#B83100] active:scale-[0.97]"
            >
              Done
            </button>
            <button
              type="button"
              onClick={onBookAnother}
              className="min-h-12 w-full rounded-2xl text-[15px] font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Book another demo
            </button>
          </div>
        </div>
      </SuccessSplash>
    </div>
  );
}
