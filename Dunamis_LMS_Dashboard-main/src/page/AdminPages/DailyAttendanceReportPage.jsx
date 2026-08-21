import React, { useMemo, useState } from "react";
import dayjs from "dayjs";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  FiRefreshCw,
  FiChevronLeft,
  FiChevronRight,
  FiInbox,
  FiAlertTriangle,
  FiSearch,
} from "react-icons/fi";
import { useDailyAttendance } from "../../hooks/useAttendanceReport";
import { exportToExcel } from "../../utils/exportToExcel";
import StatTile from "../../components/insights/StatTile";
import BarRow from "../../components/insights/BarRow";
import ExportMenu from "../../components/ExportMenu";
import SlideOver from "../../components/SlideOver";

const COVERAGE = {
  Full: { label: "Marked", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  Partial: { label: "Partial", className: "bg-amber-50 text-amber-700 ring-amber-200" },
  Missing: { label: "Not marked", className: "bg-rose-50 text-rose-700 ring-rose-200" },
  NoStudents: { label: "No students", className: "bg-slate-50 text-slate-500 ring-slate-200" },
};

const FILTERS = [
  { id: "all", label: "All" },
  { id: "Missing", label: "Not marked" },
  { id: "Partial", label: "Partial" },
  { id: "Full", label: "Marked" },
  { id: "NoStudents", label: "No students" },
];

const formatPct = (value) => (value == null ? "—" : `${value}%`);
const timeRange = (row) => `${row.startTime} – ${row.endTime}`;

const Pill = ({ className, children }) => (
  <span
    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${className}`}
  >
    {children}
  </span>
);

const CoverageBadge = ({ status }) => {
  const meta = COVERAGE[status] || COVERAGE.NoStudents;
  return <Pill className={meta.className}>{meta.label}</Pill>;
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

const ClassTable = ({ rows, onSelect, emptyText }) =>
  rows.length ? (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400">
            {["Instructor", "Course", "Time", "Students", "Present", "Absent", "Status"].map((h) => (
              <th key={h} className="py-2 pr-4 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.slotId}
              onClick={() => onSelect(row)}
              className="cursor-pointer border-b border-slate-50 hover:bg-orange-50/40"
            >
              <td className="py-2.5 pr-4 text-slate-700">{row.teacherName}</td>
              <td className="py-2.5 pr-4 text-slate-700">
                {row.courseName}
                {row.branchName && <span className="text-xs text-slate-400"> · {row.branchName}</span>}
              </td>
              <td className="py-2.5 pr-4 text-slate-700">{timeRange(row)}</td>
              <td className="py-2.5 pr-4 text-slate-700">
                {row.markedStudents}/{row.expectedStudents}
              </td>
              <td className="py-2.5 pr-4 text-slate-700">{row.present}</td>
              <td className="py-2.5 pr-4 text-slate-700">{row.absent}</td>
              <td className="py-2.5 pr-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  <CoverageBadge status={row.coverageStatus} />
                  {row.markedLate && (
                    <Pill className="bg-sky-50 text-sky-700 ring-sky-200">Marked late</Pill>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <p className="py-4 text-center text-xs text-slate-400">{emptyText}</p>
  );

const buildSheets = (data) => [
  {
    name: "Summary",
    columns: [
      { header: "Metric", value: (r) => r[0], width: 26 },
      { header: "Value", value: (r) => r[1], width: 16 },
    ],
    rows: [
      ["Date", data.day.label],
      ["Classes scheduled", data.totals.classesScheduled],
      ["Fully marked", data.totals.fullyMarked],
      ["Partially marked", data.totals.partiallyMarked],
      ["Not marked", data.totals.unmarked],
      ["Sections without students", data.totals.withoutStudents],
      ["Students expected", data.totals.studentsExpected],
      ["Students marked", data.totals.studentsMarked],
      ["Present", data.totals.present],
      ["Absent", data.totals.absent],
      ["Marking rate", formatPct(data.totals.markingRate)],
      ["Attendance rate", formatPct(data.totals.attendanceRate)],
      ["Homework assigned", data.totals.homeworkAssigned],
      ["Classes marked late", data.totals.classesMarkedLate],
    ],
  },
  {
    name: "Classes",
    columns: [
      { header: "Instructor", value: (r) => r.teacherName, width: 22 },
      { header: "Employee ID", value: (r) => r.employeeId || "", width: 14 },
      { header: "Course", value: (r) => r.courseName, width: 26 },
      { header: "Branch", value: (r) => r.branchName || "Online", width: 18 },
      { header: "Time", value: (r) => timeRange(r), width: 16 },
      { header: "Session", value: (r) => r.sessionType, width: 12 },
      { header: "Expected", value: (r) => r.expectedStudents, width: 10 },
      { header: "Marked", value: (r) => r.markedStudents, width: 10 },
      { header: "Present", value: (r) => r.present, width: 10 },
      { header: "Absent", value: (r) => r.absent, width: 10 },
      { header: "Status", value: (r) => COVERAGE[r.coverageStatus]?.label || r.coverageStatus, width: 14 },
      { header: "Marked late", value: (r) => (r.markedLate ? "Yes" : "No"), width: 12 },
    ],
    rows: data.classes,
  },
  {
    name: "Students",
    columns: [
      { header: "Student", value: (r) => r.name, width: 24 },
      { header: "Course", value: (r) => r.courseName, width: 26 },
      { header: "Instructor", value: (r) => r.teacherName, width: 22 },
      { header: "Time", value: (r) => r.time, width: 16 },
      { header: "Attendance", value: (r) => r.attendanceStatus || "Not marked", width: 14 },
      { header: "Homework", value: (r) => r.homework || "", width: 40 },
    ],
    rows: data.classes.flatMap((cls) =>
      cls.students.map((s) => ({
        ...s,
        courseName: cls.courseName,
        teacherName: cls.teacherName,
        time: timeRange(cls),
      }))
    ),
  },
  {
    name: "By Instructor",
    columns: [
      { header: "Instructor", value: (r) => r.teacherName, width: 22 },
      { header: "Employee ID", value: (r) => r.employeeId || "", width: 14 },
      { header: "Email", value: (r) => r.teacherEmail || "", width: 26 },
      { header: "Scheduled", value: (r) => r.scheduled, width: 11 },
      { header: "Marked", value: (r) => r.fullyMarked, width: 10 },
      { header: "Partial", value: (r) => r.partiallyMarked, width: 10 },
      { header: "Not marked", value: (r) => r.unmarked, width: 12 },
      { header: "Present", value: (r) => r.present, width: 10 },
      { header: "Absent", value: (r) => r.absent, width: 10 },
    ],
    rows: data.byInstructor,
  },
];

const DailyAttendanceReportPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [slideOpen, setSlideOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Absent from the URL means "today" — resolved server-side in IST, never from
  // the browser clock.
  const date = searchParams.get("date") || "";
  const params = useMemo(() => (date ? { date } : {}), [date]);
  const { data, isLoading, isError, error, refetch, isFetching } = useDailyAttendance(params);

  const goToDate = (next) => setSearchParams(next ? { date: next } : {});

  const filtered = useMemo(() => {
    const rows = data?.classes || [];
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter !== "all" && row.coverageStatus !== filter) return false;
      if (!term) return true;
      return [row.teacherName, row.courseName, row.branchName, row.batchLabel]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(term));
    });
  }, [data, search, filter]);

  const openClass = (row) => {
    setSelected(row);
    setSlideOpen(true);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportToExcel({ fileName: `dunamis-attendance-${data.day.key}`, sheets: buildSheets(data) });
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-slate-100" />
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
          <p className="font-semibold text-rose-700">Could not load the attendance report</p>
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

  const { day, bounds, totals, byInstructor } = data;
  const unmarkedRows = data.classes.filter((row) => row.coverageStatus === "Missing");
  const partialRows = data.classes.filter((row) => row.coverageStatus === "Partial");
  const maxScheduled = Math.max(...byInstructor.map((row) => row.scheduled), 1);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">Analytics</p>
          <h1 className="text-2xl font-bold text-slate-900">Daily Attendance</h1>
          <p className="text-sm text-slate-500">
            Every class scheduled on {day.label}, and whether anyone marked it. Generated{" "}
            {dayjs(data.generatedAt).format("D MMM YYYY, h:mm A")}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => goToDate(dayjs(day.key).subtract(1, "day").format("YYYY-MM-DD"))}
              disabled={day.key <= bounds.earliest}
              className="rounded-xl p-1.5 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <FiChevronLeft />
            </button>
            <input
              type="date"
              value={day.key}
              min={bounds.earliest}
              max={bounds.latest}
              onChange={(e) => goToDate(e.target.value)}
              className="rounded-xl border-0 bg-transparent px-2 py-1.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-100"
            />
            <button
              type="button"
              onClick={() => goToDate(dayjs(day.key).add(1, "day").format("YYYY-MM-DD"))}
              disabled={day.key >= bounds.latest}
              className="rounded-xl p-1.5 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <FiChevronRight />
            </button>
          </div>
          {!day.isToday && (
            <button
              onClick={() => goToDate("")}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-orange-300 hover:text-orange-600"
            >
              Today
            </button>
          )}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-orange-300 hover:text-orange-600 disabled:opacity-60"
          >
            <FiRefreshCw className={isFetching ? "animate-spin" : ""} />
            Refresh
          </button>
          <ExportMenu onExportAll={handleExport} totalCount={1} selectedCount={0} exporting={exporting} />
        </div>
      </div>

      {data.partial && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          ⚠️ Some sections could not be computed this run: {data.failedSections.join(", ")}. Those figures may read as
          zero — try refreshing.
        </div>
      )}

      {totals.classesScheduled === 0 ? (
        <EmptyBox text="No classes were scheduled on this day." />
      ) : (
        <>
          {totals.unmarked > 0 && (
            <a
              href="#unmarked"
              className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 hover:border-rose-300"
            >
              <FiAlertTriangle className="shrink-0 text-lg" />
              <span>
                <strong>
                  {totals.unmarked} {totals.unmarked === 1 ? "class was" : "classes were"} not marked
                </strong>{" "}
                on {day.label}. Attendance for these students was never recorded.
              </span>
            </a>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Classes scheduled" current={totals.classesScheduled} />
            <StatTile label="Not marked" current={totals.unmarked} />
            <StatTile label="Marking rate" current={totals.markingRate ?? 0} format={(v) => `${v}%`} />
            <StatTile label="Attendance rate" current={totals.attendanceRate ?? 0} format={(v) => `${v}%`} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Fully marked" current={totals.fullyMarked} />
            <StatTile label="Partially marked" current={totals.partiallyMarked} />
            <StatTile label="Present" current={totals.present} />
            <StatTile label="Absent" current={totals.absent} />
          </div>

          <SectionCard
            id="unmarked"
            title="Not marked"
            subtitle="Classes that ran with students but have no attendance record"
          >
            <ClassTable rows={unmarkedRows} onSelect={openClass} emptyText="Every class was marked." />
          </SectionCard>

          {partialRows.length > 0 && (
            <SectionCard title="Partially marked" subtitle="Some students in the class were left unmarked">
              <ClassTable rows={partialRows} onSelect={openClass} emptyText="" />
            </SectionCard>
          )}

          <SectionCard
            title="All classes"
            subtitle={`${filtered.length} of ${totals.classesScheduled} shown`}
            action={
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Instructor, course, branch…"
                    className="rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                  />
                </div>
                {FILTERS.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setFilter(item.id)}
                    className={`rounded-2xl border px-4 py-2.5 text-sm font-medium ${
                      filter === item.id
                        ? "border-orange-300 bg-orange-50 text-orange-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-orange-300"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            }
          >
            <ClassTable rows={filtered} onSelect={openClass} emptyText="No classes match this filter." />
          </SectionCard>

          <SectionCard title="By instructor" subtitle="Sorted by unmarked classes first">
            {byInstructor.map((row) => (
              <BarRow
                key={String(row.teacherId)}
                label={row.teacherName}
                value={row.fullyMarked}
                max={maxScheduled}
                tone={row.unmarked > 0 ? "rose" : "emerald"}
                displayValue={`${row.fullyMarked}/${row.scheduled}`}
              />
            ))}
          </SectionCard>
        </>
      )}

      <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)}>
        {selected && (
          <div>
            <div className="bg-gradient-to-br from-[#FF6B35] to-[#fd8c5f] px-6 py-8 text-white">
              <p className="text-xs uppercase tracking-widest text-white/70">
                {timeRange(selected)} · {selected.sessionType}
              </p>
              <h3 className="mt-1 text-xl font-bold">{selected.courseName}</h3>
              <p className="text-sm text-white/80">
                {selected.teacherName}
                {selected.branchName ? ` · ${selected.branchName}` : ""}
              </p>
            </div>

            <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 text-center">
              {[
                ["Expected", selected.expectedStudents],
                ["Present", selected.present],
                ["Absent", selected.absent],
              ].map(([label, value]) => (
                <div key={label} className="px-4 py-4">
                  <p className="text-lg font-bold text-slate-900">{value}</p>
                  <p className="text-xs text-slate-500">{label}</p>
                </div>
              ))}
            </div>

            <div className="space-y-3 px-6 py-5">
              <div className="flex items-center gap-2">
                <CoverageBadge status={selected.coverageStatus} />
                {selected.markedLate && (
                  <Pill className="bg-sky-50 text-sky-700 ring-sky-200">
                    Marked {dayjs(selected.firstMarkedAt).format("D MMM, h:mm A")}
                  </Pill>
                )}
                {selected.expectedSource === "roster" && (
                  <Pill className="bg-slate-50 text-slate-500 ring-slate-200">Roster estimate</Pill>
                )}
              </div>

              {selected.students.map((student) => (
                <div
                  key={student.studentId}
                  className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800">{student.name}</p>
                    {student.homework && (
                      <p className="mt-0.5 text-xs text-slate-500">{student.homework}</p>
                    )}
                  </div>
                  {student.marked ? (
                    <Pill
                      className={
                        student.attendanceStatus === "Present"
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          : "bg-rose-50 text-rose-700 ring-rose-200"
                      }
                    >
                      {student.attendanceStatus}
                    </Pill>
                  ) : (
                    <Pill className="bg-slate-50 text-slate-500 ring-slate-200">Not marked</Pill>
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

export default DailyAttendanceReportPage;
