import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiRefreshCw, FiSearch } from "react-icons/fi";
import { useTodaySchedule } from "../../../hooks/useTodaySchedule";
import { formatTime } from "../../../utils/checkInFormat";
import AnimatedNumber from "../../../components/AnimatedNumber";
import DataCards from "../../../components/DataCards";
import PageTabBar from "../../../components/PageTabBar";
import PersonCard from "../../../components/cards/PersonCard";
import ScopeBanner from "../../../components/org/ScopeBanner";

const TABS = [
  { id: "instructors", label: "Instructors" },
  { id: "students", label: "Students" },
  { id: "staff", label: "Staff" },
];

const BADGE = {
  live: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  next: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  done: "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
  due: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  missing: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
};

const useNow = () => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
};

const classState = (item, now) => {
  if (now < new Date(item.startAt)) return "upcoming";
  return now < new Date(item.endAt) ? "live" : "done";
};

const dayBadge = (classes, now) => {
  if (classes.some((item) => classState(item, now) === "live")) {
    return { label: "In class", className: BADGE.live, dot: true, dotClass: "bg-emerald-500" };
  }
  const next = classes.find((item) => classState(item, now) === "upcoming");
  if (next) return { label: `Next ${formatTime(next.startAt)}`, className: BADGE.next };
  return { label: "Done for today", className: BADGE.done };
};

const checkInText = (checkIn) => {
  if (checkIn.status === "in") return `In since ${formatTime(checkIn.firstInAt)}`;
  if (checkIn.status === "out") {
    return checkIn.lastOutAt ? `Out at ${formatTime(checkIn.lastOutAt)}` : "Left without checking out";
  }
  return "Not checked in";
};

const staffBadge = (row, now) => {
  if (row.checkIn.status === "in") return { label: "Checked in", className: BADGE.live, dot: true, dotClass: "bg-emerald-500" };
  if (row.checkIn.status === "out") return { label: "Checked out", className: BADGE.done };
  const opens = row.branches
    .map((branch) => branch.opensAt)
    .filter(Boolean)
    .sort()[0];
  if (opens && now < new Date(opens)) return { label: `Due ${formatTime(opens)}`, className: BADGE.due };
  return { label: "Not checked in", className: BADGE.missing };
};

const plural = (n, word) => `${n} ${n === 1 ? word : word.endsWith("s") ? `${word}es` : `${word}s`}`;
const unique = (values) => [...new Set(values.filter(Boolean))];

const classCount = (classes) => {
  const demos = classes.filter((item) => item.kind === "demo").length;
  const regular = classes.length - demos;
  return [regular && plural(regular, "class"), demos && plural(demos, "demo")].filter(Boolean).join(" · ");
};

const ClassList = ({ classes, now, detail }) => (
  <ul className="space-y-2">
    {classes.map((item) => {
      const state = classState(item, now);
      const who =
        detail === "instructor"
          ? `with ${item.teacherName}`
          : item.learners
            ? item.learners.map((learner) => learner.name).join(", ")
            : plural(item.learnerCount, "learner");
      return (
        <li
          key={item.slotId}
          className={`rounded-xl border px-3 py-2 text-xs ${
            state === "live" ? "border-emerald-200 bg-emerald-50/60" : "border-slate-100"
          } ${state === "done" ? "opacity-60" : ""}`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold tabular-nums text-slate-800">
              {formatTime(item.startAt)} – {formatTime(item.endAt)}
            </span>
            {item.kind === "demo" && (
              <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 ring-1 ring-violet-200">
                Demo
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-slate-600" title={item.courseName}>
            {item.courseName} · {item.branchName || "Online"}
          </p>
          <p className="mt-0.5 truncate text-slate-400" title={who}>
            {who}
          </p>
        </li>
      );
    })}
  </ul>
);

const BranchList = ({ branches }) => (
  <ul className="space-y-2 pb-4 sm:pb-5">
    {branches.map((branch) => (
      <li key={branch.branchId} className="rounded-xl border border-slate-100 px-3 py-2 text-xs">
        <p className="truncate font-semibold text-slate-800" title={branch.branchName}>
          {branch.branchName}
        </p>
        <p className="mt-0.5 tabular-nums text-slate-500">
          {branch.opensAt && branch.closesAt
            ? `Open ${formatTime(branch.opensAt)} – ${formatTime(branch.closesAt)}`
            : "Hours not set"}
        </p>
      </li>
    ))}
  </ul>
);

const Tile = ({ label, value }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5">
    <p className="text-sm font-medium text-slate-500">{label}</p>
    <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
      <AnimatedNumber value={value} format={(v) => Math.round(v).toLocaleString("en-IN")} />
    </p>
  </div>
);

const rowId = (tab, row) =>
  String(
    tab === "instructors"
      ? row.teacherId
      : tab === "staff"
        ? row.userId
        : row.studentId || `guest-${row.classes[0].slotId}-${row.name}`
  );

const searchText = (row) =>
  [
    row.name,
    row.employeeId,
    row.designationLabel,
    ...(row.classes || []).flatMap((item) => [item.courseName, item.branchName, item.teacherName]),
    ...(row.branches || []).map((branch) => branch.branchName),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

export default function TodaySchedulePage() {
  const navigate = useNavigate();
  const now = useNow();
  const { data, isLoading, isError, error, refetch, isFetching } = useTodaySchedule();
  const [tab, setTab] = useState(null);
  const [search, setSearch] = useState("");

  const tabs = useMemo(
    () =>
      TABS.filter((item) => !(data?.hiddenSections || []).includes(item.id)),
    [data]
  );
  const activeTab = tabs.some((item) => item.id === tab) ? tab : tabs[0]?.id;

  const rows = useMemo(() => {
    if (!data || !activeTab) return [];
    const query = search.trim().toLowerCase();
    return data[activeTab]
      .map((row) => ({ ...row, _id: rowId(activeTab, row) }))
      .filter((row) => !query || searchText(row).includes(query));
  }, [data, activeTab, search]);

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
          <p className="font-semibold text-rose-700">Could not load today's schedule</p>
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

  const { day, totals } = data;
  const tiles = [
    { label: "Classes", value: totals.classes },
    { label: "Demos", value: totals.demos },
    { label: "Instructors", value: totals.instructors },
    { label: "Students", value: totals.students },
    { label: "Branch staff", value: totals.staff },
  ].filter((tile) => tile.value !== null);

  const renderInstructor = (row) => (
    <PersonCard
      name={row.name}
      subtitle={[row.employeeId, row.inPerson ? "In person" : "Online"].filter(Boolean).join(" · ")}
      statusBadge={dayBadge(row.classes, now)}
      meta={[
        { label: "Today", value: classCount(row.classes) },
        { label: "Learners", value: String(row.learnerCount) },
        { label: "Hours", value: `${formatTime(row.firstStartAt)} – ${formatTime(row.lastEndAt)}` },
        ...(row.checkIn ? [{ label: "Branch check-in", value: checkInText(row.checkIn) }] : []),
      ]}
      onView={() => navigate(`/admin/instructor-management/instructors/${row.teacherId}`)}
      primaryLabel="View Instructor"
    >
      <ClassList classes={row.classes} now={now} detail="learners" />
    </PersonCard>
  );

  const renderStudent = (row) => (
    <PersonCard
      name={row.name}
      subtitle={row.studentId ? unique(row.classes.map((item) => item.courseName)).join(", ") : "Demo guest (no account)"}
      statusBadge={dayBadge(row.classes, now)}
      meta={[
        { label: "Today", value: classCount(row.classes) },
        { label: "Instructor", value: unique(row.classes.map((item) => item.teacherName)).join(", ") },
      ]}
      onView={row.studentId ? () => navigate(`/admin/student-management/students/${row.studentId}`) : undefined}
      primaryLabel="View Student"
    >
      <div className={row.studentId ? "" : "pb-4 sm:pb-5"}>
        <ClassList classes={row.classes} now={now} detail="instructor" />
      </div>
    </PersonCard>
  );

  const renderStaff = (row) => (
    <PersonCard
      name={row.name}
      subtitle={[row.designationLabel, row.employeeId].filter(Boolean).join(" · ")}
      statusBadge={staffBadge(row, now)}
      meta={[
        { label: "Branches open", value: String(row.branches.length) },
        { label: "Check-in", value: checkInText(row.checkIn) },
      ]}
    >
      <BranchList branches={row.branches} />
    </PersonCard>
  );

  const render = { instructors: renderInstructor, students: renderStudent, staff: renderStaff }[activeTab];
  const emptyMessage = {
    instructors: "No instructor has a class or demo today.",
    students: "No learner has a class or demo today.",
    staff: "No offline AA or BDE has an open branch today.",
  }[activeTab];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">User management</p>
          <h1 className="text-2xl font-bold text-slate-900">Today's Schedule</h1>
          <p className="text-sm text-slate-500">
            {day.label}: instructors and learners with a class or demo today, and AAs/BDEs whose branches are open.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-orange-300 hover:text-orange-600 disabled:opacity-60"
        >
          <FiRefreshCw className={isFetching ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <ScopeBanner />

      {data.partial && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Part of today's classes could not be loaded. Refresh to try again.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((tile) => (
          <Tile key={tile.label} label={tile.label} value={tile.value} />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageTabBar tabs={tabs} activeTab={activeTab} onChange={setTab} />
        <div className="relative w-full sm:w-auto sm:max-w-xs sm:grow sm:basis-56">
          <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, course or branch"
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
          />
        </div>
      </div>

      {activeTab && (
        <DataCards
          key={activeTab}
          data={rows}
          renderCard={render}
          selectable={false}
          emptyMessage={search ? "Nobody matches that search." : emptyMessage}
        />
      )}
    </div>
  );
}
