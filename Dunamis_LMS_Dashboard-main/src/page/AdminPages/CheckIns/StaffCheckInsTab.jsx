import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import { FiRefreshCw, FiSearch } from "react-icons/fi";
import { useAddStaffCheckInNote, useStaffCheckInReport } from "../../../hooks/useStaffCheckIns";
import { exportToExcel } from "../../../utils/exportToExcel";
import { formatDay, formatDuration, formatTime, mapsUrl } from "../../../utils/checkInFormat";
import { getStoredUser } from "../../../utils/authSession";
import VisitFlags, { DayFlags } from "../../../components/checkIns/VisitFlags";
import { dayFlags } from "../../../components/checkIns/visitFlagList";
import CountTile from "../../../components/checkIns/CountTile";
import ExportMenu from "../../../components/ExportMenu";
import SlideOver from "../../../components/SlideOver";
import {
  AdminNotesList,
  LocationRow,
  NoteForm,
  ReportEmpty,
  ReportLoading,
  SectionCard,
  Th,
  UnpinnedBanner,
} from "../../../components/checkIns/ReportParts";

const FLAG_FILTERS = [
  { id: "all", label: "All" },
  { id: "late", label: "Late login" },
  { id: "early", label: "Early logout" },
  { id: "missing", label: "Missing logout" },
  { id: "offSite", label: "Off-site check-out" },
  { id: "unverified", label: "Unverified" },
];

const seconds = (value) => formatTime(value, { seconds: true });

const lastOutText = (day) => {
  if (day.lastOutAt) return seconds(day.lastOutAt);
  if (day.isOpen) return "Still checked in";
  return "No check-out";
};

const personLabel = (person) =>
  [person.designationLabel, person.employeeId].filter(Boolean).join(" · ");

const visitOutText = (visit) => {
  if (visit.checkOut) return seconds(visit.checkOut.at);
  if (visit.isOpen) return "still checked in";
  return "no check-out";
};

const buildSheets = (data) => [
  {
    name: "Days",
    columns: [
      { header: "Date", value: (d) => d.dayKey, width: 12 },
      { header: "Name", value: (d) => d.person.name, width: 22 },
      { header: "Role", value: (d) => d.person.designationLabel, width: 22 },
      { header: "Employee ID", value: (d) => d.person.employeeId, width: 14 },
      { header: "Branches", value: (d) => d.branches.join(", "), width: 30 },
      { header: "First check-in", value: (d) => seconds(d.firstInAt), width: 14 },
      { header: "Late by (min)", value: (d) => (d.lateCheckIn ? d.lateByMinutes : 0), width: 13 },
      { header: "Last check-out", value: (d) => lastOutText(d), width: 16 },
      { header: "Early by (min)", value: (d) => (d.earlyCheckOut ? d.earlyByMinutes : 0), width: 14 },
      { header: "Missing logout", value: (d) => (d.missingLogout ? "Yes" : "No"), width: 14 },
      { header: "Late logout", value: (d) => (d.lateCheckOut ? "Yes" : "No"), width: 12 },
      { header: "Off-site check-out", value: (d) => (d.offSite ? "Yes" : "No"), width: 17 },
      { header: "Location unverified", value: (d) => (d.locationUnverified ? "Yes" : "No"), width: 17 },
      { header: "Branch closed", value: (d) => (d.branchClosedToday ? "Yes" : "No"), width: 13 },
      {
        header: "Corrected last check-out",
        value: (d) => (d.lastOutCorrectedAt ? formatTime(d.lastOutCorrectedAt) : ""),
        width: 22,
      },
      { header: "Minutes on site", value: (d) => d.minutesOnSite, width: 14 },
      {
        header: "Visits",
        value: (d) =>
          d.visits
            .map((v) => `${v.branch.branchName} ${seconds(v.checkIn.at)}–${visitOutText(v)} (${mapsUrl(v.checkIn.lat, v.checkIn.lng)})`)
            .join("; "),
        width: 60,
      },
      {
        header: "Admin notes",
        value: (d) =>
          d.visits.flatMap((v) => v.adminNotes || []).map((n) => `${n.by}: ${n.note}`).join(" | "),
        width: 40,
      },
    ],
    rows: data.days,
  },
  {
    name: "By Person",
    columns: [
      { header: "Name", value: (r) => r.name, width: 22 },
      { header: "Role", value: (r) => r.designationLabel, width: 22 },
      { header: "Employee ID", value: (r) => r.employeeId, width: 14 },
      { header: "Days", value: (r) => r.days, width: 8 },
      { header: "Late logins", value: (r) => r.lateDays, width: 12 },
      { header: "Late minutes", value: (r) => r.lateMinutes, width: 13 },
      { header: "Early logouts", value: (r) => r.earlyDays, width: 13 },
      { header: "Early minutes", value: (r) => r.earlyMinutes, width: 13 },
      { header: "Missing logouts", value: (r) => r.missingLogouts, width: 15 },
      { header: "Days with no check-in", value: (r) => r.noCheckInDays, width: 20 },
      { header: "Off-site check-outs", value: (r) => r.offSiteCheckOuts, width: 18 },
      { header: "Unverified", value: (r) => r.unverified, width: 11 },
      { header: "Hours on site", value: (r) => (r.minutesOnSite / 60).toFixed(2), width: 13 },
    ],
    rows: data.summary,
  },
  {
    name: "No Check-in Days",
    columns: [
      { header: "Date", value: (d) => d.dayKey, width: 12 },
      { header: "Name", value: (d) => d.person.name, width: 22 },
      { header: "Role", value: (d) => d.person.designationLabel, width: 22 },
      { header: "Employee ID", value: (d) => d.person.employeeId, width: 14 },
      { header: "Branches open", value: (d) => d.branches.join(", "), width: 36 },
    ],
    rows: data.noCheckInDays,
  },
];

const matchesFlag = (day, filter) =>
  filter === "all" || dayFlags(day).some((flag) => flag.key === filter);

const dayKeyOf = (day) => `${day.person._id}|${day.dayKey}`;

const countCell = (value, extra) => (
  <td className={`py-2.5 pr-4 tabular-nums ${value ? "font-semibold text-rose-600" : "text-slate-700"}`}>
    {value}
    {extra > 0 && <span className="text-xs font-normal text-slate-400"> ({extra}m)</span>}
  </td>
);

const StaffCheckInsTab = ({ from, to }) => {
  const { data, isLoading, isError, error, refetch, isFetching } = useStaffCheckInReport({ from, to });
  const addNote = useAddStaffCheckInNote();
  const authUser = useSelector((state) => state.auth.user);
  const viewerId = String((authUser || getStoredUser())?._id || "");

  const [search, setSearch] = useState("");
  const [personFilter, setPersonFilter] = useState("");
  const [flagFilter, setFlagFilter] = useState("all");
  const [selectedKey, setSelectedKey] = useState(null);
  const [slideOpen, setSlideOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const allDays = data?.days;
  const days = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (allDays || []).filter((day) => {
      if (personFilter && String(day.person._id) !== personFilter) return false;
      if (!matchesFlag(day, flagFilter)) return false;
      if (!term) return true;
      return [day.person.name, day.person.employeeId, ...day.branches]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(term));
    });
  }, [allDays, search, personFilter, flagFilter]);

  // Re-read from live data so a saved note shows up in the open panel.
  const selected = data?.days.find((day) => dayKeyOf(day) === selectedKey) || null;

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportToExcel({ fileName: `dunamis-staff-check-ins-${from}_${to}`, sheets: buildSheets(data) });
      toast.success("Report exported");
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  if (isLoading) return <ReportLoading />;

  if (isError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
        <p className="font-semibold text-rose-700">Could not load staff check-ins</p>
        <p className="mt-1 text-sm text-rose-600">{error?.message}</p>
        <button
          onClick={() => refetch()}
          className="mt-4 rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const { totals, summary, noCheckInDays, unpinnedBranches } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-slate-500">
          When AAs and BDEs arrived at and left their branches. Each day is judged at its ends: the
          first check-in against that branch's opening time, the last check-out against its closing
          time. Times are IST, to the second.
        </p>
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
            totalCount={data.days.length + noCheckInDays.length}
            selectedCount={0}
            exporting={exporting}
          />
        </div>
      </div>

      <UnpinnedBanner branches={unpinnedBranches} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <CountTile label="Days worked" value={totals.days} hint={`${totals.openNow} checked in now`} />
        <CountTile label="Late logins" value={totals.lateDays} alert hint={`${totals.lateMinutes} min in total`} />
        <CountTile label="Early logouts" value={totals.earlyDays} alert hint={`${totals.earlyMinutes} min in total`} />
        <CountTile label="Missing logouts" value={totals.missingLogouts} alert />
        <CountTile label="Days with no check-in" value={totals.noCheckInDays} alert />
        <CountTile label="Off-site check-outs" value={totals.offSiteCheckOuts} />
        <CountTile label="Unverified locations" value={totals.unverified} />
        <CountTile
          label="Hours on site"
          value={Math.round((totals.minutesOnSite / 60) * 10) / 10}
          format={(v) => v.toLocaleString("en-IN")}
        />
      </div>

      <SectionCard title="By person" subtitle="Most late logins first">
        {summary.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400">
                  <Th>Name</Th>
                  <Th>Days</Th>
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
                    key={String(row._id)}
                    onClick={() => setPersonFilter(String(row._id))}
                    className="cursor-pointer border-b border-slate-50 hover:bg-orange-50/40"
                  >
                    <td className="py-2.5 pr-4 text-slate-700">
                      {row.name}
                      {personLabel(row) && <span className="text-xs text-slate-400"> · {personLabel(row)}</span>}
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums text-slate-700">{row.days}</td>
                    {countCell(row.lateDays, row.lateMinutes)}
                    {countCell(row.earlyDays, row.earlyMinutes)}
                    {countCell(row.missingLogouts)}
                    {countCell(row.noCheckInDays)}
                    <td className="py-2.5 pr-4 tabular-nums text-slate-700">{formatDuration(row.minutesOnSite)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <ReportEmpty text="No staff check-ins in this range." />
        )}
      </SectionCard>

      <SectionCard
        title="Days"
        subtitle={`${days.length} of ${data.days.length} shown`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, ID, branch…"
                className="rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <select
              value={personFilter}
              onChange={(e) => setPersonFilter(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
            >
              <option value="">Everyone</option>
              {summary.map((row) => (
                <option key={String(row._id)} value={String(row._id)}>
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
        {days.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400">
                  <Th>Date</Th>
                  <Th>Name</Th>
                  <Th>Branches</Th>
                  <Th>First in</Th>
                  <Th>Last out</Th>
                  <Th>On site</Th>
                  <Th>Flags</Th>
                </tr>
              </thead>
              <tbody>
                {days.map((day, index) => (
                  <tr
                    key={dayKeyOf(day)}
                    onClick={() => {
                      setSelectedKey(dayKeyOf(day));
                      setSlideOpen(true);
                    }}
                    className="cursor-pointer border-b border-slate-50 hover:bg-orange-50/40 motion-safe:animate-fade-in"
                    style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
                  >
                    <td className="whitespace-nowrap py-2.5 pr-4 text-slate-700">{formatDay(day.dayKey)}</td>
                    <td className="py-2.5 pr-4 text-slate-700">{day.person.name}</td>
                    <td className="py-2.5 pr-4 text-slate-700">{day.branches.join(", ")}</td>
                    <td className="whitespace-nowrap py-2.5 pr-4 tabular-nums text-slate-700">{seconds(day.firstInAt)}</td>
                    <td className="whitespace-nowrap py-2.5 pr-4 tabular-nums text-slate-700">{lastOutText(day)}</td>
                    <td className="whitespace-nowrap py-2.5 pr-4 tabular-nums text-slate-700">
                      {formatDuration(day.minutesOnSite)}
                    </td>
                    <td className="py-2.5 pr-4">
                      <DayFlags day={day} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <ReportEmpty text={data.days.length ? "No days match these filters." : "Nothing here yet"} />
        )}
      </SectionCard>

      <SectionCard
        title="Days with no check-in"
        subtitle={
          data.liveSince
            ? `Finished days when at least one of the person's branches was open and they checked in nowhere. Counted from ${formatDay(data.liveSince)}, the first day staff check-in was used.`
            : "Counted once the first AA or BDE checks in — before that, staff check-in wasn't in use."
        }
      >
        {noCheckInDays.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400">
                  <Th>Date</Th>
                  <Th>Name</Th>
                  <Th>Branches open</Th>
                </tr>
              </thead>
              <tbody>
                {noCheckInDays.map((day) => (
                  <tr key={`${day.person._id}|${day.dayKey}`} className="border-b border-slate-50">
                    <td className="whitespace-nowrap py-2.5 pr-4 text-slate-700">{formatDay(day.dayKey)}</td>
                    <td className="py-2.5 pr-4 text-slate-700">
                      {day.person.name}
                      {personLabel(day.person) && (
                        <span className="text-xs text-slate-400"> · {personLabel(day.person)}</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-slate-700">{day.branches.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-4 text-center text-xs text-slate-400">Nobody missed a day in this range.</p>
        )}
      </SectionCard>

      <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)}>
        {selected && (
          <div>
            <div className="bg-gradient-to-br from-[#FF6B35] to-[#fd8c5f] px-6 py-8 text-white">
              <p className="text-xs uppercase tracking-widest text-white/70">{formatDay(selected.dayKey)}</p>
              <h3 className="mt-1 text-xl font-bold">{selected.person.name}</h3>
              <p className="text-sm text-white/80">{personLabel(selected.person)}</p>
            </div>

            <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 text-center">
              {[
                ["First in", seconds(selected.firstInAt)],
                ["Last out", lastOutText(selected)],
                ["On site", formatDuration(selected.minutesOnSite)],
              ].map(([label, value]) => (
                <div key={label} className="px-3 py-4">
                  <p className="text-sm font-bold tabular-nums text-slate-900">{value}</p>
                  <p className="text-xs text-slate-500">{label}</p>
                </div>
              ))}
            </div>

            <div className="space-y-5 px-6 py-5">
              <DayFlags day={selected} />

              {selected.visits.map((visit, index) => (
                <div key={visit._id} className="space-y-3 rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-slate-400">
                        Visit {index + 1} of {selected.visits.length}
                      </p>
                      <p className="text-sm font-semibold text-slate-800">{visit.branch.branchName}</p>
                      <p className="text-xs text-slate-500">
                        {visit.branchClosedToday
                          ? "Branch closed this day"
                          : visit.branchOpensAt
                            ? `Branch open ${formatTime(visit.branchOpensAt)} – ${formatTime(visit.branchClosesAt)}`
                            : "Branch hours not set"}
                      </p>
                    </div>
                    <VisitFlags visit={visit} />
                  </div>
                  <LocationRow label="Check-in" fix={visit.checkIn} />
                  {visit.checkOut && <LocationRow label="Check-out" fix={visit.checkOut} />}
                  <AdminNotesList notes={visit.adminNotes || []} />
                  {String(selected.person._id) === viewerId ? (
                    <p className="text-xs text-slate-400">
                      Notes and corrections on your own check-ins are added by another admin.
                    </p>
                  ) : (
                    <NoteForm key={visit._id} visit={visit} mutation={addNote} who="They" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  );
};

export default StaffCheckInsTab;
