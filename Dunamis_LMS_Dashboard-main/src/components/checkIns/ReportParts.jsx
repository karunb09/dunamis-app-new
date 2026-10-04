import React, { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import { FiExternalLink, FiInbox, FiMapPin } from "react-icons/fi";
import {
  formatDay,
  formatDistance,
  formatTime,
  fromIstInputValue,
  istDayKey,
  mapsUrl,
  rangePresets,
  toIstInputValue,
} from "../../utils/checkInFormat";
import { Pill } from "./VisitFlags";

// The pieces the instructor and staff check-in reports share.

export const SectionCard = ({ title, subtitle, children, id, action }) => (
  <div id={id} className="rounded-2xl border border-slate-200 bg-white p-5">
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </div>
);

export const ReportEmpty = ({ text }) => (
  <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white py-10 text-slate-400">
    <FiInbox className="text-2xl" />
    <p className="text-sm">{text}</p>
  </div>
);

export const Th = ({ children }) => <th className="py-2 pr-4 font-medium">{children}</th>;

export const ReportLoading = () => (
  <div className="animate-pulse space-y-4">
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-24 rounded-2xl bg-slate-100" />
      ))}
    </div>
    <div className="h-64 rounded-2xl bg-slate-100" />
  </div>
);

export const RangePicker = ({ from, to, today, onChange }) => {
  const presets = rangePresets(today);
  const active = presets.find((p) => p.range.from === from && p.range.to === to)?.id;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map((preset) => (
        <button
          key={preset.id}
          onClick={() => onChange(preset.range)}
          className={`rounded-2xl border px-4 py-2.5 text-sm font-medium ${
            active === preset.id
              ? "border-orange-300 bg-orange-50 text-orange-700"
              : "border-slate-200 bg-white text-slate-600 hover:border-orange-300"
          }`}
        >
          {preset.label}
        </button>
      ))}
      <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white px-2 py-1">
        <input
          type="date"
          value={from}
          max={to}
          onChange={(e) => e.target.value && onChange({ from: e.target.value, to })}
          className="rounded-xl border-0 bg-transparent px-1 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-100"
          aria-label="From"
        />
        <span className="text-slate-400">–</span>
        <input
          type="date"
          value={to}
          min={from}
          max={today}
          onChange={(e) => e.target.value && onChange({ from, to: e.target.value })}
          className="rounded-xl border-0 bg-transparent px-1 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-100"
          aria-label="To"
        />
      </div>
    </div>
  );
};

export const UnpinnedBanner = ({ branches }) =>
  branches.length ? (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
      <FiMapPin className="mt-0.5 shrink-0 text-lg" />
      <span>
        <strong>
          {branches.length} {branches.length === 1 ? "branch has" : "branches have"} no location pin
        </strong>
        , so check-ins there can't be verified:{" "}
        {branches.map((branch, index) => (
          <React.Fragment key={branch._id}>
            {index > 0 && ", "}
            <Link
              to={`/admin/centers/edit-branch/${branch._id}`}
              className="font-medium underline underline-offset-2 hover:text-amber-900"
            >
              {branch.branchName}
            </Link>
          </React.Fragment>
        ))}
        . Open the branch at the centre and use "Use my current location".
      </span>
    </div>
  ) : null;

export const LocationRow = ({ label, fix }) => (
  <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 p-3">
    <div>
      <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
      <p className="text-sm font-medium text-slate-800">{formatTime(fix.at, { seconds: true })}</p>
      <p className="text-xs text-slate-500">
        {fix.distanceM != null ? `${formatDistance(fix.distanceM)} from the branch pin` : "Branch had no pin"}{" "}
        · ±{fix.accuracyM} m
      </p>
    </div>
    <a
      href={mapsUrl(fix.lat, fix.lng)}
      target="_blank"
      rel="noreferrer"
      className="flex shrink-0 items-center gap-1 rounded-2xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:border-orange-300 hover:text-orange-600"
    >
      <FiMapPin /> Map <FiExternalLink />
    </a>
  </div>
);

export const AdminNotesList = ({ notes }) =>
  notes.length ? (
    <div>
      <p className="text-xs uppercase tracking-wider text-slate-400">Admin notes</p>
      <ul className="mt-2 space-y-2">
        {notes.map((note, index) => (
          <li key={index} className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <p>{note.note}</p>
            <p className="mt-1 text-xs text-slate-400">
              {note.by} · {formatDay(istDayKey(new Date(note.at)))} {formatTime(note.at)}
              {note.correctedCheckOutAt && (
                <>
                  {" · "}
                  <Pill tone="sky">Left {formatTime(note.correctedCheckOutAt)}</Pill>
                </>
              )}
            </p>
          </li>
        ))}
      </ul>
    </div>
  ) : null;

// mutation: the report's add-note mutation; who: how the copy names the person.
export const NoteForm = ({ visit, mutation, who = "The instructor" }) => {
  const [note, setNote] = useState("");
  const [corrected, setCorrected] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    try {
      await mutation.mutateAsync({
        id: visit._id,
        note,
        correctedCheckOutAt: fromIstInputValue(corrected)?.toISOString() || null,
      });
      toast.success("Note added");
      setNote("");
      setCorrected("");
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-slate-200 p-4">
      <p className="text-sm font-semibold text-slate-800">Add a note</p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        maxLength={500}
        placeholder="e.g. Confirmed by phone — left at 5:05 pm"
        className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
      />
      <label className="block text-xs font-medium text-slate-600">
        Corrected check-out time (IST, optional)
        <input
          type="datetime-local"
          value={corrected}
          onChange={(e) => setCorrected(e.target.value)}
          disabled={visit.isOpen}
          min={toIstInputValue(visit.checkIn.at)}
          max={toIstInputValue(new Date())}
          className="mt-1 block w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100 disabled:bg-slate-50"
        />
      </label>
      {visit.isOpen && (
        <p className="text-xs text-slate-400">
          {who} is still checked in — a corrected time can be added once they check out or the day
          ends.
        </p>
      )}
      <p className="text-xs text-slate-400">
        Notes sit beside the original record; the original times are never changed.
      </p>
      <button
        type="submit"
        disabled={!note.trim() || mutation.isPending}
        className="rounded-2xl bg-[#FF6B35] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#fd5a1f] active:scale-[0.97] disabled:opacity-60"
      >
        {mutation.isPending ? "Saving…" : "Save note"}
      </button>
    </form>
  );
};
