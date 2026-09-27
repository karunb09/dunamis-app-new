import React from "react";
import { DEPARTMENT_LABELS, WORK_MODES, designationLabel } from "../../constants/orgStructure";

const SCOPE_NAMES = [
  ["branches", (item) => item.branchName],
  ["zones", (item) => item.name],
  ["cities", (item) => item.cityName],
  ["courses", (item) => item.name],
  ["subCategories", (item) => item.name],
  ["categories", (item) => item.name],
];

const personName = (person) =>
  person ? `${person.name?.firstName || ""} ${person.name?.lastName || ""}`.trim() : "";

// Read-only "where I sit" for a profile page. Expects User.org with its
// references populated (GET /user/:id does this).
const OrgPlacementSummary = ({ org }) => {
  if (!org?.designation && !org?.reportsTo) return null;

  const responsibleFor = SCOPE_NAMES.flatMap(([key, nameOf]) => (org[key] || []).map(nameOf)).filter(Boolean);
  const rows = [
    ["Designation", designationLabel(org.designation)],
    ["Department", DEPARTMENT_LABELS[org.department]],
    ["Reports to", personName(org.reportsTo)],
    ["Works", WORK_MODES.find((mode) => mode.value === org.workMode)?.label],
  ].filter(([, value]) => value);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">Organisation</p>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-slate-400">{label}</dt>
            <dd className="font-medium text-slate-800">{value}</dd>
          </div>
        ))}
      </dl>
      {responsibleFor.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-slate-400">Responsible for</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {responsibleFor.map((name) => (
              <span key={name} className="rounded-lg bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700">
                {name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrgPlacementSummary;
