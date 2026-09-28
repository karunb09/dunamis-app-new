import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiAlertTriangle, FiChevronDown, FiEdit2, FiUsers } from "react-icons/fi";
import { useOrgChart } from "../../hooks/useOrg";
import { designationLabel } from "../../constants/orgStructure";

const idOf = (value) => String(value?._id || value || "");

const nameOf = (person) =>
  `${person?.name?.firstName || ""} ${person?.name?.lastName || ""}`.trim() || person?.email || "—";

const initials = (person) =>
  `${person?.name?.firstName?.[0] || ""}${person?.name?.lastName?.[0] || ""}`.toUpperCase() || "?";

const SCOPE_LABELS = [
  ["branches", (item) => item.branchName],
  ["zones", (item) => item.name],
  ["cities", (item) => item.cityName],
  ["courses", (item) => item.name],
  ["subCategories", (item) => item.name],
  ["categories", (item) => item.name],
];

const scopeChips = (person) =>
  person.kind === "instructor"
    ? (person.branches || []).map((branch) => branch.branchName)
    : SCOPE_LABELS.flatMap(([key, label]) => (person.org?.[key] || []).map(label)).filter(Boolean);

const editLink = (person) =>
  person.kind === "instructor"
    ? person.teacherId && `/admin/instructor-management/instructors/${person.teacherId}`
    : person.adminId && `/admin/add-admin/${person.adminId}`;

const roleLine = (person) => {
  if (person.kind === "instructor") {
    return person.instructorMode === "online" ? "Online Instructor" : "Offline Instructor";
  }
  const designation = designationLabel(person.org?.designation);
  if (!designation) return person.jobTitle || "Not placed";
  return person.jobTitle && person.jobTitle !== designation ? `${designation} · ${person.jobTitle}` : designation;
};

const PersonRow = ({ person, reportCount, expanded, onToggle }) => {
  const chips = scopeChips(person);
  const link = editLink(person);
  const isMarketing = person.org?.department === "marketing";
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:border-slate-300">
      <button
        type="button"
        onClick={onToggle}
        disabled={!reportCount}
        aria-label={expanded ? "Collapse team" : "Expand team"}
        className="mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 disabled:invisible"
      >
        <FiChevronDown className={`transition-transform duration-300 ${expanded ? "" : "-rotate-90"}`} size={14} />
      </button>
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
          person.kind === "instructor"
            ? "bg-sky-50 text-sky-700"
            : "bg-gradient-to-br from-[#FFD9C7] to-[#FFF1EB] text-[#FF6B35]"
        }`}
      >
        {initials(person)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="truncate text-sm font-semibold text-slate-900">{nameOf(person)}</p>
          {person.employeeId && <span className="font-mono text-[11px] text-slate-400">{person.employeeId}</span>}
          {person.accountStatus && person.accountStatus !== "active" && (
            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 ring-1 ring-rose-200">
              Inactive
            </span>
          )}
        </div>
        <p className={`text-xs ${isMarketing ? "text-orange-600" : "text-slate-500"}`}>{roleLine(person)}</p>
        {chips.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {chips.slice(0, 6).map((chip) => (
              <span key={chip} className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                {chip}
              </span>
            ))}
            {chips.length > 6 && (
              <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                +{chips.length - 6} more
              </span>
            )}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {reportCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
            <FiUsers size={11} /> {reportCount}
          </span>
        )}
        {link && (
          <Link
            to={link}
            className="rounded-full p-1.5 text-slate-400 transition hover:bg-orange-50 hover:text-orange-600"
            aria-label={`Edit ${nameOf(person)}`}
          >
            <FiEdit2 size={14} />
          </Link>
        )}
      </div>
    </div>
  );
};

const TreeNode = ({ person, childrenOf, depth }) => {
  const reports = childrenOf.get(idOf(person._id)) || [];
  const [expanded, setExpanded] = useState(depth < 2);
  return (
    <li>
      <PersonRow
        person={person}
        reportCount={reports.length}
        expanded={expanded}
        onToggle={() => setExpanded((open) => !open)}
      />
      {/* The server refuses reporting loops; the cap only guards older data. */}
      {expanded && reports.length > 0 && depth < 12 && (
        <ul className="ml-5 mt-2 space-y-2 border-l border-dashed border-slate-200 pl-4 motion-safe:animate-fade-in">
          {reports.map((report) => (
            <TreeNode key={report._id} person={report} childrenOf={childrenOf} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
};

const AttentionGroup = ({ title, items }) =>
  items.length > 0 && (
    <div>
      <p className="text-xs font-semibold text-amber-900">
        {title} <span className="font-normal text-amber-700">({items.length})</span>
      </p>
      <ul className="mt-1 flex flex-wrap gap-1.5">
        {items.map((item) => (
          <li key={item.key} className="rounded-lg bg-white/70 px-2 py-0.5 text-xs text-amber-900 ring-1 ring-amber-200">
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );

const missingText = (missing) => `no ${missing.map((level) => designationLabel(level)).join(", no ")}`;

const NeedsAttention = ({ needsAttention, peopleById }) => {
  const names = (ids) =>
    ids.map((id) => ({ key: idOf(id), label: nameOf(peopleById.get(idOf(id))) }));
  const groups = [
    ["Staff not placed yet", names(needsAttention.unplaced)],
    ["No manager set", names(needsAttention.noManager)],
    ["Responsibility not set", names(needsAttention.missingScope)],
    [
      "Branches with nobody assigned",
      needsAttention.uncoveredBranches.map((branch) => ({
        key: branch._id,
        label: `${branch.branchName} — ${missingText(branch.missing)}`,
      })),
    ],
    [
      "Online courses with nobody assigned",
      needsAttention.uncoveredCourses.map((course) => ({
        key: course._id,
        label: `${course.name} — ${missingText(course.missing)}`,
      })),
    ],
    [
      "Zones without a BDE",
      needsAttention.zonesWithoutBde.map((zone) => ({
        key: zone._id,
        label: [zone.name, zone.city?.cityName].filter(Boolean).join(" · "),
      })),
    ],
    ["Cities without a BDM", needsAttention.citiesWithoutBdm.map((city) => ({ key: city._id, label: city.cityName }))],
    [
      "Categories without a BDM",
      needsAttention.categoriesWithoutBdm.map((category) => ({ key: category._id, label: category.name })),
    ],
  ];
  const total = groups.reduce((sum, [, items]) => sum + items.length, 0);
  if (!total) return null;

  return (
    <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 motion-safe:animate-fade-in-up">
      <div className="flex items-start gap-3">
        <FiAlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={18} />
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-amber-900">Needs attention</p>
            <p className="text-xs text-amber-800">
              Messages about a learner go to the AA and BDE responsible for their branch or course. Where nobody is
              assigned they go up to the BDM, then the Marketing Head, then every admin.
            </p>
          </div>
          {groups.map(([title, items]) => (
            <AttentionGroup key={title} title={title} items={items} />
          ))}
        </div>
      </div>
    </div>
  );
};

const OrgChart = () => {
  const { data, isLoading, error } = useOrgChart();

  const { roots, detached, childrenOf, peopleById } = useMemo(() => {
    const people = data?.people || [];
    const byId = new Map(people.map((person) => [idOf(person._id), person]));
    const children = new Map();
    for (const person of people) {
      const managerId = idOf(person.org?.reportsTo);
      if (!managerId || !byId.has(managerId)) continue;
      if (!children.has(managerId)) children.set(managerId, []);
      children.get(managerId).push(person);
    }
    // Staff before instructors, then by name, at every level.
    for (const list of children.values()) {
      list.sort((a, b) => (a.kind === b.kind ? nameOf(a).localeCompare(nameOf(b)) : a.kind === "staff" ? -1 : 1));
    }
    const hasManager = (person) => byId.has(idOf(person.org?.reportsTo));
    return {
      roots: people.filter((person) => person.org?.designation === "ceo"),
      detached: people.filter(
        (person) => person.org?.designation !== "ceo" && !hasManager(person) && person.accountStatus !== "inactive"
      ),
      childrenOf: children,
      peopleById: byId,
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((row) => (
          <div key={row} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    );
  }
  if (error) {
    return <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error.message}</p>;
  }

  return (
    <div className="space-y-6">
      <NeedsAttention needsAttention={data.needsAttention} peopleById={peopleById} />

      <section className="rounded-[30px] border border-slate-200 bg-slate-50/60 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">Reporting structure</p>
        {roots.length ? (
          <ul className="mt-4 space-y-2">
            {roots.map((person) => (
              <TreeNode key={person._id} person={person} childrenOf={childrenOf} depth={0} />
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            Nobody is placed as CEO yet. Edit the CEO's admin account and set the designation to CEO.
          </p>
        )}
      </section>

      {detached.length > 0 && (
        <section className="rounded-[30px] border border-dashed border-slate-300 p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Not in the tree yet</p>
          <p className="mt-1 text-xs text-slate-500">
            No designation, or no manager set. Their team (if any) is shown under them.
          </p>
          <ul className="mt-4 space-y-2">
            {detached.map((person) => (
              <TreeNode key={person._id} person={person} childrenOf={childrenOf} depth={1} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

export default OrgChart;
