import React, { useEffect, useMemo } from "react";
import ReactSelect from "react-select";
import { useDispatch, useSelector } from "react-redux";
import { fetchAllBranches } from "../../redux/Branch/branchSlice";
import { useStaffDirectory } from "../../hooks/useOrg";
import { INSTRUCTOR_MANAGERS, SELECT_STYLES, designationLabel } from "../../constants/orgStructure";

const FIELD =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100";

const idOf = (value) => String(value?._id || value || "");

const personName = (person) =>
  `${person.name?.firstName || ""} ${person.name?.lastName || ""}`.trim() || person.email;

// Who an instructor reports to, and — for offline/hybrid instructors — the
// branches they teach at (Branch.teachers).
const InstructorPlacementFields = ({ reportsTo, branchIds, mode, onChange }) => {
  const dispatch = useDispatch();
  const { branches, listStatus } = useSelector((state) => state.branch);
  const { data: staff = [] } = useStaffDirectory();

  useEffect(() => {
    if (listStatus === "idle") dispatch(fetchAllBranches());
  }, [listStatus, dispatch]);

  const managers = useMemo(
    () => staff.filter((person) => INSTRUCTOR_MANAGERS.includes(person.org?.designation)),
    [staff]
  );
  const branchOptions = useMemo(
    () =>
      branches.map((branch) => ({
        value: idOf(branch._id),
        label: [branch.branchName, branch.city?.cityName].filter(Boolean).join(" · "),
      })),
    [branches]
  );
  const selected = new Set((branchIds || []).map(idOf));
  const teachesAtBranches = mode !== "online";

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Reports to</label>
        <select
          value={idOf(reportsTo)}
          onChange={(e) => onChange({ reportsTo: e.target.value, branchIds })}
          className={FIELD}
        >
          <option value="">Not set yet</option>
          {managers.map((person) => (
            <option key={person._id} value={person._id}>
              {personName(person)} · {designationLabel(person.org.designation)}
              {person.employeeId ? ` · ${person.employeeId}` : ""}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-500">
          Offline instructors report to their Branch Manager (BDE).
          {!managers.length && " No BDE, BDM or course manager is placed yet."}
        </p>
      </div>
      {teachesAtBranches && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Teaches at branches</label>
          <ReactSelect
            isMulti
            options={branchOptions}
            value={branchOptions.filter((option) => selected.has(option.value))}
            onChange={(picked) => onChange({ reportsTo, branchIds: (picked || []).map((option) => option.value) })}
            placeholder="Select branches"
            styles={SELECT_STYLES}
            backspaceRemovesValue={false}
            isClearable={false}
          />
        </div>
      )}
    </div>
  );
};

export default InstructorPlacementFields;
