import React, { useState } from "react";
import { FiX } from "react-icons/fi";
import InstructorPlacementFields from "../../../../components/org/InstructorPlacementFields";

const FIELD =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100";

const fullName = (name) =>
  typeof name === "object" ? `${name?.firstName || ""} ${name?.lastName || ""}`.trim() : name || "";

// Selecting an applicant creates their instructor account, so the details
// that belong to the account — employee unit, manager, branches — are asked
// for here rather than edited in afterwards.
const HireInstructorModal = ({ application, submitting, onCancel, onConfirm }) => {
  const [unit, setUnit] = useState("DSM");
  const [placement, setPlacement] = useState({ reportsTo: "", branchIds: [] });

  const handleConfirm = () =>
    onConfirm({
      employeePrefix: `${unit}I`,
      reportsTo: placement.reportsTo || undefined,
      branchIds: application.mode === "online" ? [] : placement.branchIds,
    });

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm sm:items-center motion-safe:animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="relative my-auto w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl motion-safe:animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onCancel}
          className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close"
        >
          <FiX size={18} />
        </button>
        <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">Hire instructor</p>
        <h2 className="mt-1 text-lg font-bold text-slate-900">{fullName(application.name)}</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Creates their instructor account and emails login details.
        </p>

        <div className="mt-5 space-y-4">
          <div className="md:w-1/2 md:pr-2">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Employee unit</label>
            <select value={unit} onChange={(e) => setUnit(e.target.value)} className={FIELD}>
              <option value="DSM">DSM</option>
              <option value="DSD">DSD</option>
              <option value="DCC">DCC</option>
            </select>
            <p className="mt-1 text-xs text-slate-500">The employee ID (e.g. {unit}I001) is generated from this unit.</p>
          </div>
          <InstructorPlacementFields
            reportsTo={placement.reportsTo}
            branchIds={placement.branchIds}
            mode={application.mode}
            onChange={setPlacement}
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="rounded-2xl bg-[#FF6B35] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#fd5a1f] active:scale-[0.97] disabled:opacity-60"
          >
            {submitting ? "Hiring…" : "Hire & create account"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HireInstructorModal;
