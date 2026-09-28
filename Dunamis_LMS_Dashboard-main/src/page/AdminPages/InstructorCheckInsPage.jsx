import React, { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  FiAlertTriangle,
  FiExternalLink,
  FiInbox,
  FiMapPin,
  FiRefreshCw,
  FiSearch,
} from "react-icons/fi";
import { useAddCheckInNote, useCheckInReport } from "../../hooks/useCheckIns";
import { exportToExcel } from "../../utils/exportToExcel";
import {
  formatDay,
  formatDistance,
  formatDuration,
  formatTime,
  fromIstInputValue,
  istDayKey,
  mapsUrl,
  monthRange,
  shiftDayKey,
  shiftMonthKey,
  toIstInputValue,
} from "../../utils/checkInFormat";
import VisitFlags, { Pill } from "../../components/checkIns/VisitFlags";
import { visitFlags } from "../../components/checkIns/visitFlagList";
import CountTile from "../../components/checkIns/CountTile";
import ExportMenu from "../../components/ExportMenu";
import SlideOver from "../../components/SlideOver";
import ScopeBanner from "../../components/org/ScopeBanner";

const FLAG_FILTERS = [
  { id: "all", label: "All" },
  { id: "late", label: "Late login" },
  { id: "early", label: "Early logout" },
  { id: "missing", label: "Missing logout" },
  { id: "offSite", label: "Off-site check-out" },
  { id: "unverified", label: "Unverified" },
];

const presetsFor = (today) => [
  { id: "today", label: "Today", range: { from: today, to: today } },
  { id: "yesterday", label: "Yesterday", range: { from: shiftDayKey(today, -1), to: shiftDayKey(today, -1) } },
  { id: "month", label: "This month", range: { from: `${today.slice(0, 7)}-01`, to: today } },
  { id: "lastMonth", label: "Last month", range: monthRange(shiftMonthKey(today.slice(0, 7), -1)) },
];

const timeWithSeconds = (value) => formatTime(value, { seconds: true });

const checkOutText = (visit) => {
  if (visit.checkOut) return timeWithSeconds(visit.checkOut.at);
  if (visit.isOpen) return "Still checked in";
  return "No check-out";
};

const SectionCard = ({ title, subtitle, children, id, action }) => (
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

const EmptyBox = ({ text }) => (
  <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white py-10 text-slate-400">
    <FiInbox className="text-2xl" />
    <p className="text-sm">{text}</p>
  </div>
);

const Th = ({ children }) => <th className="py-2 pr-4 font-medium">{children}</th>;

const buildSheets = (data) => [
  {
    name: "Visits",
    columns: [
      { header: "Date", value: (v) => v.dayKey, width: 12 },
      { header: "Instructor", value: (v) => v.teacher.name, width: 22 },
      { header: "Employee ID", value: (v) => v.teacher.employeeId, width: 14 },
      { header: "Branch", value: (v) => v.branch.branchName, width: 22 },
      { header: "Check-in", value: (v) => timeWithSeconds(v.checkIn.at), width: 13 },
      { header: "Late by (min)", value: (v) => (v.flags.lateCheckIn ? v.flags.lateByMinutes : 0), width: 13 },
      { header: "Check-out", value: (v) => checkOutText(v), width: 16 },
      { header: "Early by (min)", value: (v) => (v.flags.earlyCheckOut ? v.flags.earlyByMinutes : 0), width: 14 },
      { header: "Missing logout", value: (v) => (v.missingLogout ? "Yes" : "No"), width: 14 },
      { header: "Late logout", value: (v) => (v.flags.lateCheckOut ? "Yes" : "No"), width: 12 },
      {
        header: "Check-out distance",
        value: (v) => (v.checkOut?.distanceM != null ? formatDistance(v.checkOut.distanceM) : ""),
        width: 16,
      },
      { header: "Location unverified", value: (v) => (v.flags.locationUnverified ? "Yes" : "No"), width: 17 },
      {
        header: "Corrected check-out",
        value: (v) => (v.correctedCheckOutAt ? formatTime(v.correctedCheckOutAt) : ""),
        width: 18,
      },
      { header: "Minutes on site", value: (v) => v.minutesOnSite ?? "", width: 14 },
      {
        header: "Classes",
        value: (v) => v.classes.map((c) => `${formatTime(c.startAt)} ${c.courseName}`).join("; "),
        width: 40,
      },
      { header: "Check-in location", value: (v) => mapsUrl(v.checkIn.lat, v.checkIn.lng), width: 44 },
      {
        header: "Check-out location",
        value: (v) => (v.checkOut ? mapsUrl(v.checkOut.lat, v.checkOut.lng) : ""),
        width: 44,
      },
      { header: "Admin notes", value: (v) => v.adminNotes.map((n) => `${n.by}: ${n.note}`).join(" | "), width: 40 },
    ],
    rows: data.visits,
  },
  {
    name: "By Instructor",
    columns: [
      { header: "Instructor", value: (r) => r.name, width: 22 },
      { header: "Employee ID", value: (r) => r.employeeId, width: 14 },
      { header: "Visits", value: (r) => r.visits, width: 9 },
      { header: "Late logins", value: (r) => r.lateCheckIns, width: 12 },
      { header: "Late minutes", value: (r) => r.lateMinutes, width: 13 },
      { header: "Early logouts", value: (r) => r.earlyCheckOuts, width: 13 },
      { header: "Early minutes", value: (r) => r.earlyMinutes, width: 13 },
      { header: "Missing logouts", value: (r) => r.missingLogouts, width: 15 },
      { header: "Late logouts", value: (r) => r.lateCheckOuts, width: 12 },
      { header: "Off-site check-outs", value: (r) => r.offSiteCheckOuts, width: 18 },
      { header: "Unverified", value: (r) => r.unverified, width: 11 },
      { header: "Classes covered", value: (r) => r.classesCovered, width: 15 },
      { header: "Classes with no check-in", value: (r) => r.classesMissed, width: 22 },
      { header: "Hours on site", value: (r) => (r.minutesOnSite / 60).toFixed(2), width: 13 },
    ],
    rows: data.summary,
  },
  {
    name: "No Check-in",
    columns: [
      { header: "Date", value: (c) => istDayKey(new Date(c.startAt)), width: 12 },
      { header: "Time", value: (c) => `${formatTime(c.startAt)} – ${formatTime(c.endAt)}`, width: 20 },
      { header: "Instructor", value: (c) => c.teacher.name, width: 22 },
      { header: "Employee ID", value: (c) => c.teacher.employeeId, width: 14 },
      { header: "Branch", value: (c) => c.branch.branchName, width: 22 },
      { header: "Course", value: (c) => c.courseName, width: 26 },
      { header: "Type", value: (c) => (c.slotType === "demo" ? "Demo" : "Class"), width: 8 },
      { header: "Learners", value: (c) => c.learners, width: 10 },
    ],
    rows: data.missedClasses,
  },
];

const matchesFlag = (visit, filter) => {
  if (filter === "all") return true;
  if (filter === "offSite") return Boolean(visit.checkOut?.offSite);
  if (filter === "unverified") return Boolean(visit.flags.locationUnverified);
  return visitFlags(visit).some((flag) => flag.key === filter);
};

const LocationRow = ({ label, fix }) => (
  <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 p-3">
    <div>
      <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
      <p className="text-sm font-medium text-slate-800">{timeWithSeconds(fix.at)}</p>
      <p className="text-xs text-slate-500">
        {fix.distanceM != null
          ? `${formatDistance(fix.distanceM)} from the branch pin`
          : "Branch had no pin"}{" "}
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

const NoteForm = ({ visit }) => {
  const [note, setNote] = useState("");
  const [corrected, setCorrected] = useState("");
  const mutation = useAddCheckInNote();

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
          The instructor is still checked in — a corrected time can be added once they check out or
          the day ends.
        </p>
      )}
      <p className="text-xs text-slate-400">
        Notes sit beside the instructor's record; the original times are never changed.
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

const InstructorCheckInsPage = () => {
  const today = istDayKey();
  const presets = presetsFor(today);
  const [searchParams, setSearchParams] = useSearchParams();
  const from = searchParams.get("from") || today;
  const to = searchParams.get("to") || from;
  // Query keys are hashed structurally, so a fresh object each render is fine.
  const { data, isLoading, isError, error, refetch, isFetching } = useCheckInReport({ from, to });

  const [search, setSearch] = useState("");
  const [teacherFilter, setTeacherFilter] = useState("");
  const [flagFilter, setFlagFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [slideOpen, setSlideOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const setRange = (range) => setSearchParams({ from: range.from, to: range.to });
  const activePreset = presets.find((p) => p.range.from === from && p.range.to === to)?.id;

  const allVisits = data?.visits;
  const visits = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (allVisits || []).filter((visit) => {
      if (teacherFilter && String(visit.teacher._id) !== teacherFilter) return false;
      if (!matchesFlag(visit, flagFilter)) return false;
      if (!term) return true;
      return [visit.teacher.name, visit.teacher.employeeId, visit.branch.branchName]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(term));
    });
  }, [allVisits, search, teacherFilter, flagFilter]);

  // Snapshot for the slide-over, re-read from live data so a saved note shows up.
  const selected = data?.visits.find((visit) => visit._id === selectedId) || null;

  const openVisit = (visit) => {
    setSelectedId(visit._id);
    setSlideOpen(true);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportToExcel({ fileName: `dunamis-check-ins-${from}_${to}`, sheets: buildSheets(data) });
      toast.success("Report exported");
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 rounded-2xl bg-slate-200" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-slate-100" />
            ))}
          </div>
          <div className="h-64 rounded-2xl bg-slate-100" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
          <p className="font-semibold text-rose-700">Could not load instructor check-ins</p>
          <p className="mt-1 text-sm text-rose-600">{error?.message}</p>
          <button
            onClick={() => refetch()}
            className="mt-4 rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { totals, summary, missedClasses, unpinnedBranches } = data;
  const rangeLabel = from === to ? formatDay(from) : `${formatDay(from)} – ${formatDay(to)}`;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">Analytics</p>
          <h1 className="text-2xl font-bold text-slate-900">Instructor Check-ins</h1>
          <p className="text-sm text-slate-500">
            When offline instructors arrived at and left their branches, {rangeLabel}. Times are IST,
            to the second.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-orange-300 hover:text-orange-600 disabled:opacity-60"
          >
            <FiRefreshCw className={isFetching ? "animate-spin" : ""} />
            Refresh
          </button>
          <ExportMenu
            onExportAll={handleExport}
            totalCount={data.visits.length + missedClasses.length}
            selectedCount={0}
            exporting={exporting}
          />
        </div>
      </div>

      <ScopeBanner />

      <div className="flex flex-wrap items-center gap-2">
        {presets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => setRange(preset.range)}
            className={`rounded-2xl border px-4 py-2.5 text-sm font-medium ${
              activePreset === preset.id
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
            onChange={(e) => e.target.value && setRange({ from: e.target.value, to })}
            className="rounded-xl border-0 bg-transparent px-1 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-100"
            aria-label="From"
          />
          <span className="text-slate-400">–</span>
          <input
            type="date"
            value={to}
            min={from}
            max={today}
            onChange={(e) => e.target.value && setRange({ from, to: e.target.value })}
            className="rounded-xl border-0 bg-transparent px-1 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-100"
            aria-label="To"
          />
        </div>
      </div>

      {totals.classesMissed > 0 && (
        <a
          href="#missed"
          className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 hover:border-rose-300"
        >
          <FiAlertTriangle className="shrink-0 text-lg" />
          <span>
            <strong>
              {totals.classesMissed} {totals.classesMissed === 1 ? "class had" : "classes had"} no
              check-in
            </strong>{" "}
            — the class started and no instructor was checked in at the branch.
          </span>
        </a>
      )}

      {unpinnedBranches.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <FiMapPin className="mt-0.5 shrink-0 text-lg" />
          <span>
            <strong>
              {unpinnedBranches.length} {unpinnedBranches.length === 1 ? "branch has" : "branches have"} no
              location pin
            </strong>
            , so check-ins there can't be verified:{" "}
            {unpinnedBranches.map((branch, index) => (
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
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <CountTile label="Visits" value={totals.visits} hint={`${totals.openNow} checked in now`} />
        <CountTile label="Late logins" value={totals.lateCheckIns} alert hint={`${totals.lateMinutes} min in total`} />
        <CountTile label="Early logouts" value={totals.earlyCheckOuts} alert hint={`${totals.earlyMinutes} min in total`} />
        <CountTile label="Missing logouts" value={totals.missingLogouts} alert />
        <CountTile label="Classes with no check-in" value={totals.classesMissed} alert />
        <CountTile label="Off-site check-outs" value={totals.offSiteCheckOuts} />
        <CountTile label="Unverified locations" value={totals.unverified} />
        <CountTile
          label="Hours on site"
          value={Math.round((totals.minutesOnSite / 60) * 10) / 10}
          format={(v) => v.toLocaleString("en-IN")}
        />
      </div>

      <SectionCard title="By instructor" subtitle="Most late logins first">
        {summary.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400">
                  <Th>Instructor</Th>
                  <Th>Visits</Th>
                  <Th>Late logins</Th>
                  <Th>Early logouts</Th>
                  <Th>Missing logouts</Th>
                  <Th>No check-in</Th>
                  <Th>On site</Th>
                </tr>
              </thead>
              <tbody>
                {summary.map((row) => (
                  <tr
                    key={String(row.teacherId)}
                    onClick={() => setTeacherFilter(String(row.teacherId))}
                    className="cursor-pointer border-b border-slate-50 hover:bg-orange-50/40"
                  >
                    <td className="py-2.5 pr-4 text-slate-700">
                      {row.name}
                      {row.employeeId && <span className="text-xs text-slate-400"> · {row.employeeId}</span>}
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums text-slate-700">{row.visits}</td>
                    <td className={`py-2.5 pr-4 tabular-nums ${row.lateCheckIns ? "font-semibold text-rose-600" : "text-slate-700"}`}>
                      {row.lateCheckIns}
                      {row.lateMinutes > 0 && <span className="text-xs font-normal text-slate-400"> ({row.lateMinutes}m)</span>}
                    </td>
                    <td className={`py-2.5 pr-4 tabular-nums ${row.earlyCheckOuts ? "font-semibold text-rose-600" : "text-slate-700"}`}>
                      {row.earlyCheckOuts}
                      {row.earlyMinutes > 0 && <span className="text-xs font-normal text-slate-400"> ({row.earlyMinutes}m)</span>}
                    </td>
                    <td className={`py-2.5 pr-4 tabular-nums ${row.missingLogouts ? "font-semibold text-rose-600" : "text-slate-700"}`}>
                      {row.missingLogouts}
                    </td>
                    <td className={`py-2.5 pr-4 tabular-nums ${row.classesMissed ? "font-semibold text-rose-600" : "text-slate-700"}`}>
                      {row.classesMissed}
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums text-slate-700">{formatDuration(row.minutesOnSite)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyBox text="No check-ins or offline classes in this range." />
        )}
      </SectionCard>

      <SectionCard
        title="Visits"
        subtitle={`${visits.length} of ${data.visits.length} shown`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Instructor, ID, branch…"
                className="rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <select
              value={teacherFilter}
              onChange={(e) => setTeacherFilter(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
            >
              <option value="">All instructors</option>
              {summary.map((row) => (
                <option key={String(row.teacherId)} value={String(row.teacherId)}>
                  {row.name}
                </option>
              ))}
            </select>
          </div>
        }
      >
        <div className="mb-4 flex flex-wrap gap-2">
          {FLAG_FILTERS.map((item) => (
            <button
              key={item.id}
              onClick={() => setFlagFilter(item.id)}
              className={`rounded-2xl border px-3 py-2 text-xs font-medium ${
                flagFilter === item.id
                  ? "border-orange-300 bg-orange-50 text-orange-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-orange-300"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        {visits.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400">
                  <Th>Date</Th>
                  <Th>Instructor</Th>
                  <Th>Branch</Th>
                  <Th>Check-in</Th>
                  <Th>Check-out</Th>
                  <Th>On site</Th>
                  <Th>Flags</Th>
                </tr>
              </thead>
              <tbody>
                {visits.map((visit, index) => (
                  <tr
                    key={visit._id}
                    onClick={() => openVisit(visit)}
                    className="cursor-pointer border-b border-slate-50 hover:bg-orange-50/40 motion-safe:animate-fade-in"
                    style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
                  >
                    <td className="whitespace-nowrap py-2.5 pr-4 text-slate-700">{formatDay(visit.dayKey)}</td>
                    <td className="py-2.5 pr-4 text-slate-700">{visit.teacher.name}</td>
                    <td className="py-2.5 pr-4 text-slate-700">{visit.branch.branchName}</td>
                    <td className="whitespace-nowrap py-2.5 pr-4 tabular-nums text-slate-700">
                      {timeWithSeconds(visit.checkIn.at)}
                    </td>
                    <td className="whitespace-nowrap py-2.5 pr-4 tabular-nums text-slate-700">{checkOutText(visit)}</td>
                    <td className="whitespace-nowrap py-2.5 pr-4 tabular-nums text-slate-700">
                      {formatDuration(visit.minutesOnSite)}
                    </td>
                    <td className="py-2.5 pr-4">
                      <VisitFlags visit={visit} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyBox text={data.visits.length ? "No visits match these filters." : "Nothing here yet"} />
        )}
      </SectionCard>

      <SectionCard
        id="missed"
        title="Classes with no check-in"
        subtitle={
          data.liveSince
            ? `Offline classes that started with no instructor checked in at the branch. Counted from ${formatDay(data.liveSince)}, the first day check-in was used.`
            : "Counted once the first instructor checks in — before that, check-in wasn't in use."
        }
      >
        {missedClasses.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400">
                  <Th>Date</Th>
                  <Th>Time</Th>
                  <Th>Instructor</Th>
                  <Th>Branch</Th>
                  <Th>Course</Th>
                  <Th>Learners</Th>
                </tr>
              </thead>
              <tbody>
                {missedClasses.map((cls) => (
                  <tr key={cls.slotId} className="border-b border-slate-50">
                    <td className="whitespace-nowrap py-2.5 pr-4 text-slate-700">
                      {formatDay(istDayKey(new Date(cls.startAt)))}
                    </td>
                    <td className="whitespace-nowrap py-2.5 pr-4 text-slate-700">
                      {formatTime(cls.startAt)} – {formatTime(cls.endAt)}
                    </td>
                    <td className="py-2.5 pr-4 text-slate-700">{cls.teacher.name}</td>
                    <td className="py-2.5 pr-4 text-slate-700">{cls.branch.branchName}</td>
                    <td className="py-2.5 pr-4 text-slate-700">
                      {cls.courseName}
                      {cls.slotType === "demo" && <span className="text-xs text-slate-400"> · demo</span>}
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums text-slate-700">{cls.learners}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-4 text-center text-xs text-slate-400">Every class that started had a check-in.</p>
        )}
      </SectionCard>

      <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)}>
        {selected && (
          <div>
            <div className="bg-gradient-to-br from-[#FF6B35] to-[#fd8c5f] px-6 py-8 text-white">
              <p className="text-xs uppercase tracking-widest text-white/70">{formatDay(selected.dayKey)}</p>
              <h3 className="mt-1 text-xl font-bold">{selected.teacher.name}</h3>
              <p className="text-sm text-white/80">
                {selected.branch.branchName}
                {selected.teacher.employeeId ? ` · ${selected.teacher.employeeId}` : ""}
              </p>
            </div>

            <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 text-center">
              {[
                ["Checked in", timeWithSeconds(selected.checkIn.at)],
                ["Checked out", checkOutText(selected)],
                ["On site", formatDuration(selected.minutesOnSite)],
              ].map(([label, value]) => (
                <div key={label} className="px-3 py-4">
                  <p className="text-sm font-bold tabular-nums text-slate-900">{value}</p>
                  <p className="text-xs text-slate-500">{label}</p>
                </div>
              ))}
            </div>

            <div className="space-y-4 px-6 py-5">
              <VisitFlags visit={selected} />

              <LocationRow label="Check-in location" fix={selected.checkIn} />
              {selected.checkOut && <LocationRow label="Check-out location" fix={selected.checkOut} />}

              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400">Classes</p>
                {selected.classes.length ? (
                  <ul className="mt-2 space-y-2">
                    {selected.classes.map((cls) => (
                      <li
                        key={cls.slotId}
                        className="rounded-2xl border border-slate-100 px-3 py-2 text-sm text-slate-700"
                      >
                        {formatTime(cls.startAt)} – {formatTime(cls.endAt)} · {cls.courseName}
                        {cls.slotType === "demo" && <span className="text-xs text-slate-400"> · demo</span>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-sm text-slate-500">No scheduled class was linked to this visit.</p>
                )}
              </div>

              {selected.adminNotes.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-400">Admin notes</p>
                  <ul className="mt-2 space-y-2">
                    {selected.adminNotes.map((note, index) => (
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
              )}

              <NoteForm key={selected._id} visit={selected} />
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  );
};

export default InstructorCheckInsPage;
