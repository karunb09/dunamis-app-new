import React, { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import Swal from "sweetalert2";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import { useCategoriesQuery } from "../../../hooks/useCategories";
import {
  useCreateRate,
  useDeleteRate,
  useInstructorRates,
  usePayConfig,
  useUpdatePayConfig,
  useUpdateRate,
} from "../../../hooks/useInstructorPay";
import { formatInr } from "./financeFormat";
import { EmptyBox, ErrorBox, TableSkeleton } from "./financeUi";

const LEVELS = ["beginner", "intermediate", "advanced"];
const SESSION_TYPES = [
  { value: "standard", label: "Group" },
  { value: "premium", label: "Individual" },
];

const inputClass =
  "rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100";

const titleCase = (value) => value.charAt(0).toUpperCase() + value.slice(1);

const RateCardTab = () => {
  const { data, isLoading, isError, error, refetch } = useInstructorRates();
  const { data: categoryData } = useCategoriesQuery();
  const { data: configData } = usePayConfig();
  const createRate = useCreateRate();
  const updateRate = useUpdateRate();
  const deleteRate = useDeleteRate();
  const updateConfig = useUpdatePayConfig();

  const categories = categoryData?.categories || [];
  const rates = data?.rates || [];

  const grouped = useMemo(() => {
    const byCategory = new Map();
    rates.forEach((rate) => {
      const key = rate.categoryId?._id || "unknown";
      if (!byCategory.has(key)) {
        byCategory.set(key, {
          name: rate.categoryId?.name || "Unknown category",
          rows: [],
        });
      }
      byCategory.get(key).rows.push(rate);
    });
    return [...byCategory.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [rates]);

  const runDelete = async (rate) => {
    const { isConfirmed } = await Swal.fire({
      title: "Remove this rate?",
      text: "Payouts generated after this will flag the combination as having no rate.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Remove",
      confirmButtonColor: "#e11d48",
    });
    if (!isConfirmed) return;

    try {
      await deleteRate.mutateAsync(rate._id);
      toast.success("Rate removed");
    } catch (err) {
      toast.error(err.message || "Failed to remove rate");
    }
  };

  return (
    <div className="space-y-5">
      <PayConfigCard
        config={configData?.config}
        saving={updateConfig.isPending}
        onSave={async (body) => {
          try {
            await updateConfig.mutateAsync(body);
            toast.success("Pay settings saved");
          } catch (err) {
            toast.error(err.message || "Failed to save pay settings");
          }
        }}
      />

      <AddRateForm
        categories={categories}
        saving={createRate.isPending}
        onCreate={async (body) => {
          try {
            await createRate.mutateAsync(body);
            toast.success("Rate added");
            return true;
          } catch (err) {
            toast.error(err.message || "Failed to add rate");
            return false;
          }
        }}
      />

      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <ErrorBox message={error?.message} onRetry={refetch} />
      ) : grouped.length === 0 ? (
        <EmptyBox text="Nothing here yet — add the first rate above." />
      ) : (
        grouped.map((group) => (
          <div key={group.name} className="rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-3">
              <p className="text-sm font-semibold text-slate-900">{group.name}</p>
              <p className="text-xs text-slate-500">Per learner, per month</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-2.5 font-semibold">Level</th>
                    <th className="px-5 py-2.5 font-semibold">Type</th>
                    <th className="px-5 py-2.5 font-semibold">Rate</th>
                    <th className="px-5 py-2.5 font-semibold">Sessions / month</th>
                    <th className="px-5 py-2.5 font-semibold">Per session</th>
                    <th className="px-5 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {group.rows
                    .slice()
                    .sort(
                      (a, b) =>
                        LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level) ||
                        a.sessionType.localeCompare(b.sessionType)
                    )
                    .map((rate) => (
                      <RateRow
                        key={rate._id}
                        rate={rate}
                        saving={updateRate.isPending}
                        onSave={async (body) => {
                          try {
                            await updateRate.mutateAsync({ id: rate._id, ...body });
                            toast.success("Rate updated");
                          } catch (err) {
                            toast.error(err.message || "Failed to update rate");
                          }
                        }}
                        onDelete={() => runDelete(rate)}
                      />
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

const RateRow = ({ rate, saving, onSave, onDelete }) => {
  const [amount, setAmount] = useState(String(rate.ratePerLearnerMonth));
  const [sessions, setSessions] = useState(String(rate.sessionsPerMonth));

  const dirty =
    Number(amount) !== rate.ratePerLearnerMonth ||
    Number(sessions) !== rate.sessionsPerMonth;

  const perSession = Number(sessions)
    ? Math.round(Number(amount) / Number(sessions))
    : 0;

  return (
    <tr>
      <td className="px-5 py-2.5 text-slate-800">{titleCase(rate.level)}</td>
      <td className="px-5 py-2.5 text-slate-600">
        {rate.sessionType === "premium" ? "Individual" : "Group"}
      </td>
      <td className="px-5 py-2.5">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-28 rounded-xl border border-slate-200 px-2.5 py-1.5 text-sm focus:border-orange-400 focus:outline-none"
        />
      </td>
      <td className="px-5 py-2.5">
        <input
          type="number"
          value={sessions}
          onChange={(e) => setSessions(e.target.value)}
          className="w-20 rounded-xl border border-slate-200 px-2.5 py-1.5 text-sm focus:border-orange-400 focus:outline-none"
        />
      </td>
      <td className="px-5 py-2.5 text-slate-500">{formatInr(perSession)}</td>
      <td className="px-5 py-2.5">
        <div className="flex items-center justify-end gap-2">
          {dirty && (
            <button
              type="button"
              disabled={saving}
              onClick={() =>
                onSave({
                  ratePerLearnerMonth: Number(amount),
                  sessionsPerMonth: Number(sessions),
                })
              }
              className="rounded-xl bg-[#FF6B35] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#fd5a1f] disabled:opacity-50"
            >
              Save
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            className="rounded-xl border border-rose-100 p-1.5 text-rose-600 transition hover:bg-rose-50"
            aria-label="Remove rate"
          >
            <FiTrash2 />
          </button>
        </div>
      </td>
    </tr>
  );
};

const AddRateForm = ({ categories, saving, onCreate }) => {
  const [form, setForm] = useState({
    categoryId: "",
    level: "beginner",
    sessionType: "standard",
    ratePerLearnerMonth: "",
    sessionsPerMonth: "8",
  });

  const submit = async () => {
    if (!form.categoryId) return toast.error("Pick a category");
    if (!Number(form.ratePerLearnerMonth)) return toast.error("Enter a rate");

    const created = await onCreate({
      ...form,
      ratePerLearnerMonth: Number(form.ratePerLearnerMonth),
      sessionsPerMonth: Number(form.sessionsPerMonth),
    });
    if (created) setForm((prev) => ({ ...prev, ratePerLearnerMonth: "" }));
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-900">Add a rate</p>
      <p className="mt-1 text-xs text-slate-500">
        One row per category, level and session type. Rates are absolute, not
        increments on the beginner rate.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={form.categoryId}
          onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
          className={inputClass}
        >
          <option value="">Category</option>
          {categories.map((category) => (
            <option key={category._id} value={category._id}>
              {category.name}
            </option>
          ))}
        </select>
        <select
          value={form.level}
          onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}
          className={inputClass}
        >
          {LEVELS.map((level) => (
            <option key={level} value={level}>
              {titleCase(level)}
            </option>
          ))}
        </select>
        <select
          value={form.sessionType}
          onChange={(e) => setForm((f) => ({ ...f, sessionType: e.target.value }))}
          className={inputClass}
        >
          {SESSION_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        <input
          type="number"
          value={form.ratePerLearnerMonth}
          placeholder="Rate per learner"
          onChange={(e) =>
            setForm((f) => ({ ...f, ratePerLearnerMonth: e.target.value }))
          }
          className={`${inputClass} w-40`}
        />
        <input
          type="number"
          value={form.sessionsPerMonth}
          placeholder="Sessions"
          onChange={(e) => setForm((f) => ({ ...f, sessionsPerMonth: e.target.value }))}
          className={`${inputClass} w-28`}
        />
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-2xl bg-[#FF6B35] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#fd5a1f] disabled:opacity-50"
        >
          <FiPlus />
          Add rate
        </button>
      </div>
    </div>
  );
};

const PayConfigCard = ({ config, saving, onSave }) => {
  const [form, setForm] = useState(null);

  const current = form || {
    demoConversionAmount: config?.demoConversionAmount ?? 100,
    defaultSessionsPerMonth: config?.defaultSessionsPerMonth ?? 8,
    payDueDayOfMonth: config?.payDueDayOfMonth ?? 7,
  };

  const dirty =
    config &&
    (current.demoConversionAmount !== config.demoConversionAmount ||
      current.defaultSessionsPerMonth !== config.defaultSessionsPerMonth ||
      current.payDueDayOfMonth !== config.payDueDayOfMonth);

  const set = (key, value) =>
    setForm({ ...current, [key]: value === "" ? "" : Number(value) });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-900">Pay settings</p>
      <p className="mt-1 text-xs text-slate-500">
        Applies to every category. The cycle always closes on the last day of the
        month.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <Field label="Demo conversion bonus">
          <input
            type="number"
            value={current.demoConversionAmount}
            onChange={(e) => set("demoConversionAmount", e.target.value)}
            className={`${inputClass} w-32`}
          />
        </Field>
        <Field label="Default sessions / month">
          <input
            type="number"
            value={current.defaultSessionsPerMonth}
            onChange={(e) => set("defaultSessionsPerMonth", e.target.value)}
            className={`${inputClass} w-32`}
          />
        </Field>
        <Field label="Payment due day">
          <input
            type="number"
            min={1}
            max={28}
            value={current.payDueDayOfMonth}
            onChange={(e) => set("payDueDayOfMonth", e.target.value)}
            className={`${inputClass} w-32`}
          />
        </Field>
        {dirty && (
          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              await onSave(current);
              setForm(null);
            }}
            className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            Save settings
          </button>
        )}
      </div>
    </div>
  );
};

const Field = ({ label, children }) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-medium text-slate-600">{label}</span>
    {children}
  </label>
);

export default RateCardTab;
