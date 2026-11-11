import React, { useState } from "react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import { FiCheck, FiEdit2, FiPlus, FiTrash2, FiX } from "react-icons/fi";
import { useCreateUnit, useDeleteUnit, useEmployeeUnits, useUpdateUnit } from "../../hooks/useEmployeeUnits";

const FIELD =
  "rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100";
const GHOST_BUTTON =
  "inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50";

const UnitRow = ({ unit, index }) => {
  const updateUnit = useUpdateUnit();
  const deleteUnit = useDeleteUnit();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(unit.name);
  const busy = updateUnit.isPending || deleteUnit.isPending;

  const saveName = () => {
    const next = name.trim();
    if (!next || next === unit.name) {
      setEditing(false);
      setName(unit.name);
      return;
    }
    updateUnit.mutate(
      { id: unit._id, name: next },
      {
        onSuccess: () => {
          toast.success(`${unit.code} renamed`);
          setEditing(false);
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const toggleActive = async () => {
    if (unit.isActive) {
      const { isConfirmed } = await Swal.fire({
        icon: "question",
        title: `Deactivate ${unit.code}?`,
        text: "It disappears from the admin and instructor forms, so no new IDs are issued from it. Staff who already hold one keep it.",
        showCancelButton: true,
        confirmButtonText: "Deactivate",
        confirmButtonColor: "#FF6B35",
      });
      if (!isConfirmed) return;
    }
    updateUnit.mutate(
      { id: unit._id, isActive: !unit.isActive },
      {
        onSuccess: () => toast.success(`${unit.code} ${unit.isActive ? "deactivated" : "reactivated"}`),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const remove = async () => {
    const { isConfirmed } = await Swal.fire({
      icon: "warning",
      title: `Delete ${unit.code}?`,
      text: "Nobody holds an ID from this unit, so it can be removed.",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#dc2626",
    });
    if (!isConfirmed) return;
    deleteUnit.mutate(unit._id, {
      onSuccess: () => toast.success(`${unit.code} deleted`),
      onError: (err) => toast.error(err.message),
    });
  };

  const canDelete = !unit.isDefault && unit.staffCount === 0;

  return (
    <li
      className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 motion-safe:animate-fade-in-up"
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
    >
      <span
        className={`rounded-xl px-3 py-1.5 font-mono text-sm font-bold ${
          unit.isActive ? "bg-orange-50 text-orange-700" : "bg-slate-100 text-slate-400"
        }`}
      >
        {unit.code}
      </span>

      <div className="min-w-0 flex-1 basis-48">
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveName();
                if (e.key === "Escape") {
                  setEditing(false);
                  setName(unit.name);
                }
              }}
              className={`${FIELD} w-full`}
            />
            <button type="button" onClick={saveName} disabled={busy} className={GHOST_BUTTON} aria-label="Save name">
              <FiCheck size={14} />
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setName(unit.name);
              }}
              className={GHOST_BUTTON}
              aria-label="Cancel"
            >
              <FiX size={14} />
            </button>
          </div>
        ) : (
          <>
            <p className="truncate text-sm font-semibold text-slate-900">{unit.name}</p>
            <p className="text-xs text-slate-500">
              {unit.code}A · {unit.code}B · {unit.code}I — {unit.staffCount} staff with IDs
              {unit.isDefault ? " · built in" : ""}
            </p>
          </>
        )}
      </div>

      <span
        className={`rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${
          unit.isActive ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-rose-200"
        }`}
      >
        {unit.isActive ? "Active" : "Inactive"}
      </span>

      {!editing && (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setEditing(true)} disabled={busy} className={GHOST_BUTTON}>
            <FiEdit2 size={12} /> Rename
          </button>
          <button type="button" onClick={toggleActive} disabled={busy} className={GHOST_BUTTON}>
            {unit.isActive ? "Deactivate" : "Reactivate"}
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-rose-200 px-3 py-2 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
            >
              <FiTrash2 size={12} /> Delete
            </button>
          )}
        </div>
      )}
    </li>
  );
};

// Admins → Employee units. Shown to All Access only; the API refuses everyone else.
const EmployeeUnits = () => {
  const { data: units = [], isLoading, error } = useEmployeeUnits();
  const createUnit = useCreateUnit();
  const [form, setForm] = useState({ code: "", name: "" });

  const handleSubmit = (e) => {
    e.preventDefault();
    const code = form.code.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(code)) return toast.error("The unit code must be exactly 3 letters, e.g. DLH.");
    if (!form.name.trim()) return toast.error("Give the unit a name.");
    createUnit.mutate(
      { code, name: form.name.trim() },
      {
        onSuccess: () => {
          toast.success(`Unit ${code} added`);
          setForm({ code: "", name: "" });
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((row) => (
          <div key={row} className="h-16 rounded-2xl bg-slate-100 motion-safe:animate-pulse" />
        ))}
      </div>
    );
  }
  if (error) {
    return <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error.message}</p>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[30px] border border-slate-200 bg-slate-50/60 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">Employee units</p>
        <p className="mt-1 text-sm text-slate-600">
          A unit's code starts its staff's employee IDs: admin <span className="font-mono">A</span>, BD{" "}
          <span className="font-mono">B</span>, instructor <span className="font-mono">I</span> (e.g.{" "}
          <span className="font-mono">DLHI001</span>). Central Office staff use <span className="font-mono">DMPL</span>.
          A code can't be changed once added, because issued IDs carry it.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-600">Code</span>
            <input
              value={form.code}
              maxLength={3}
              placeholder="DLH"
              onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value.replace(/[^a-z]/gi, "").toUpperCase() }))}
              className={`${FIELD} w-24 font-mono uppercase`}
            />
          </label>
          <label className="block min-w-0 flex-1 basis-56">
            <span className="mb-1.5 block text-xs font-medium text-slate-600">Name</span>
            <input
              value={form.name}
              placeholder="Dunamis Language Hub"
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className={`${FIELD} w-full`}
            />
          </label>
          <button
            type="submit"
            disabled={createUnit.isPending}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#FF6B35] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#fd5a1f] active:scale-[0.97] disabled:opacity-60"
          >
            <FiPlus size={14} /> {createUnit.isPending ? "Adding…" : "Add unit"}
          </button>
        </form>
      </section>

      <ul className="space-y-2">
        {units.map((unit, index) => (
          <UnitRow key={unit._id} unit={unit} index={index} />
        ))}
      </ul>
    </div>
  );
};

export default EmployeeUnits;
