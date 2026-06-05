import React, { useEffect, useMemo, useState } from "react";

// Fixed-duration plans the learner can choose from.
const TENURE_OPTIONS = [3, 6, 12];
const DEFAULT_PRIMARY_MONTHS = 6;
const DEFAULT_DISCOUNT = "10";

const SESSION_ROWS = [
    {
        type: "standard",
        label: "Group / Standard",
        helper: "Group class pricing",
    },
    {
        type: "premium",
        label: "Individual / Premium",
        helper: "One-on-one class pricing",
    },
];

const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const toCurrency = (value) =>
    `₹${Math.round(toNumber(value)).toLocaleString("en-IN")}`;

const normalizeDiscount = (value) =>
    value === "" || value === null || value === undefined
        ? DEFAULT_DISCOUNT
        : String(value);

// total payable for the whole tenure after discount
const planFullPayment = (plan = {}) => {
    const gross = toNumber(plan.monthlyFee) * toNumber(plan.months);
    const discountAmount = Math.round((gross * toNumber(plan.discount)) / 100);
    return Math.max(gross - discountAmount, 0);
};

// Build the three tenure plan rows for a session from either the new
// tenurePlans array or (for legacy courses) the single duration fields.
const buildPlans = (session = {}) => {
    const incoming = Array.isArray(session.tenurePlans) ? session.tenurePlans : [];
    const legacyDuration = Number(session.totalInstallments ?? session.installments);

    return TENURE_OPTIONS.map((months) => {
        const match = incoming.find((p) => Number(p.months) === months);
        if (match) {
            return {
                months,
                enabled: true,
                monthlyFee: match.monthlyFee != null ? String(match.monthlyFee || "") : "",
                discount: normalizeDiscount(match.discount),
            };
        }

        // Legacy fallback: seed the matching tenure from the old single-duration fields.
        if (
            incoming.length === 0 &&
            legacyDuration === months &&
            toNumber(session.monthlyFee) > 0
        ) {
            return {
                months,
                enabled: true,
                monthlyFee: session.monthlyFee,
                discount: normalizeDiscount(session.discount),
            };
        }

        return { months, enabled: false, monthlyFee: "", discount: DEFAULT_DISCOUNT };
    });
};

const activePlans = (plans = []) =>
    plans.filter((plan) => plan.enabled && toNumber(plan.monthlyFee) > 0);

const primaryPlan = (plans = []) => {
    const active = activePlans(plans);
    return (
        active.find((plan) => plan.months === DEFAULT_PRIMARY_MONTHS) ||
        active[0] ||
        null
    );
};

// Convert the UI session (with `plans`) into the persisted shape: the new
// `tenurePlans` array plus the legacy top-level fields derived from the primary
// plan, so older consumers and validation keep working.
const toPersistedSession = (session) => {
    const plans = session.plans || buildPlans(session);
    const active = activePlans(plans);
    const primary = primaryPlan(plans);

    return {
        ...session,
        plans,
        enabled: Boolean(session.enabled),
        monthlyFee: primary ? primary.monthlyFee : "",
        discount: primary ? primary.discount : DEFAULT_DISCOUNT,
        totalInstallments: primary ? primary.months : DEFAULT_PRIMARY_MONTHS,
        installments: primary ? primary.months : DEFAULT_PRIMARY_MONTHS,
        fullPayment: primary ? planFullPayment(primary) : "",
        tenurePlans: plans
            .filter((plan) => plan.enabled)
            .map((plan) => ({
                months: plan.months,
                monthlyFee: toNumber(plan.monthlyFee),
                discount: toNumber(plan.discount),
                fullPayment: planFullPayment(plan),
                isActive: toNumber(plan.monthlyFee) > 0,
            })),
    };
};

const normalizeSession = (session = {}) =>
    toPersistedSession({
        ...session,
        enabled: Boolean(session.enabled),
        plans: buildPlans(session),
    });

const normalizePricing = (pricing) => ({
    standard: normalizeSession(pricing?.standard),
    premium: normalizeSession(pricing?.premium),
});

const PricingForm = ({ pricing: propPricing, setPricing }) => {
    const [sessions, setSessions] = useState(() => normalizePricing(propPricing));

    useEffect(() => {
        setSessions(normalizePricing(propPricing));
    }, [propPricing]);

    const summary = useMemo(() => {
        const enabledRows = SESSION_ROWS.filter(
            (row) => sessions[row.type]?.enabled
        );
        const totalPlans = enabledRows.reduce(
            (count, row) => count + activePlans(sessions[row.type]?.plans).length,
            0
        );
        return { enabledCount: enabledRows.length, totalPlans };
    }, [sessions]);

    const commitSessions = (nextSessions) => {
        setSessions(nextSessions);
        setPricing(nextSessions);
    };

    const handleToggleSession = (type) => {
        const current = sessions[type];
        commitSessions({
            ...sessions,
            [type]: toPersistedSession({ ...current, enabled: !current.enabled }),
        });
    };

    const handlePlanToggle = (type, months) => {
        const current = sessions[type];
        const plans = current.plans.map((plan) =>
            plan.months === months ? { ...plan, enabled: !plan.enabled } : plan
        );
        commitSessions({
            ...sessions,
            [type]: toPersistedSession({ ...current, plans }),
        });
    };

    const handlePlanChange = (type, months, field, value) => {
        const current = sessions[type];
        const plans = current.plans.map((plan) =>
            plan.months === months ? { ...plan, [field]: value } : plan
        );
        commitSessions({
            ...sessions,
            [type]: toPersistedSession({ ...current, plans }),
        });
    };

    return (
        <div className="space-y-6">
            <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-slate-950 shadow-sm">
                <div className="relative p-6 text-white sm:p-8">
                    <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-orange-500/30 blur-3xl" />
                    <div className="absolute -bottom-20 left-10 h-56 w-56 rounded-full bg-emerald-400/20 blur-3xl" />
                    <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-300">
                                Course fees model
                            </p>
                            <h3 className="mt-3 text-3xl font-semibold tracking-tight">
                                Offer 3, 6 and 12-month plans.
                            </h3>
                            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
                                Set a monthly fee and discount for each duration you want to
                                offer. Learners pick a plan at enrollment and the full amount is
                                calculated automatically.
                            </p>
                        </div>

                        <div className="grid min-w-[280px] grid-cols-2 gap-3">
                            <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">
                                    Active rows
                                </p>
                                <p className="mt-2 text-3xl font-semibold">{summary.enabledCount}</p>
                            </div>
                            <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">
                                    Plans live
                                </p>
                                <p className="mt-2 text-3xl font-semibold">{summary.totalPlans}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <div className="grid gap-5 xl:grid-cols-2">
                {SESSION_ROWS.map((row) => {
                    const session = sessions[row.type];
                    const isEnabled = Boolean(session.enabled);

                    return (
                        <article
                            key={row.type}
                            className={`rounded-[30px] border bg-white p-5 shadow-sm transition ${
                                isEnabled
                                    ? "border-orange-200 ring-4 ring-orange-50"
                                    : "border-slate-200 opacity-80"
                            }`}
                        >
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                                        Course type
                                    </p>
                                    <h4 className="mt-2 text-2xl font-semibold text-slate-950">
                                        {row.label}
                                    </h4>
                                    <p className="mt-1 text-sm text-slate-500">{row.helper}</p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => handleToggleSession(row.type)}
                                    className={`inline-flex items-center gap-3 rounded-full px-3 py-2 text-sm font-semibold transition ${
                                        isEnabled
                                            ? "bg-slate-950 text-white"
                                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                    }`}
                                >
                                    <span
                                        className={`h-5 w-5 rounded-full border transition ${
                                            isEnabled
                                                ? "border-white bg-orange-400"
                                                : "border-slate-300 bg-white"
                                        }`}
                                    />
                                    {isEnabled ? "Enabled" : "Disabled"}
                                </button>
                            </div>

                            <div className="mt-6 space-y-4">
                                {session.plans.map((plan) => {
                                    const planEnabled = isEnabled && plan.enabled;
                                    const fullPayment = planFullPayment(plan);
                                    const gross = toNumber(plan.monthlyFee) * plan.months;

                                    return (
                                        <div
                                            key={plan.months}
                                            className={`rounded-[24px] border p-4 transition ${
                                                planEnabled
                                                    ? "border-orange-200 bg-orange-50/40"
                                                    : "border-slate-200 bg-slate-50"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-sm font-bold text-white">
                                                        {plan.months}
                                                    </span>
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-900">
                                                            {plan.months}-month plan
                                                        </p>
                                                        <p className="text-xs text-slate-500">
                                                            {planEnabled && fullPayment
                                                                ? `${toCurrency(fullPayment)} total`
                                                                : "Not offered"}
                                                        </p>
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    disabled={!isEnabled}
                                                    onClick={() => handlePlanToggle(row.type, plan.months)}
                                                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                                                        planEnabled
                                                            ? "bg-orange-500 text-white"
                                                            : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-100"
                                                    } ${!isEnabled ? "cursor-not-allowed opacity-50" : ""}`}
                                                >
                                                    {planEnabled ? "Offered" : "Add plan"}
                                                </button>
                                            </div>

                                            {planEnabled && (
                                                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                                    <label className="block">
                                                        <span className="mb-1.5 block text-xs font-medium text-slate-600">
                                                            Monthly Fee <span className="text-red-500">*</span>
                                                        </span>
                                                        <div className="relative">
                                                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                                                                ₹
                                                            </span>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                step="1"
                                                                required
                                                                value={plan.monthlyFee}
                                                                onChange={(event) =>
                                                                    handlePlanChange(
                                                                        row.type,
                                                                        plan.months,
                                                                        "monthlyFee",
                                                                        event.target.value
                                                                    )
                                                                }
                                                                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-7 pr-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-50"
                                                            />
                                                        </div>
                                                    </label>

                                                    <label className="block">
                                                        <span className="mb-1.5 block text-xs font-medium text-slate-600">
                                                            Discount
                                                        </span>
                                                        <div className="relative">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max="100"
                                                                step="1"
                                                                value={plan.discount}
                                                                onChange={(event) =>
                                                                    handlePlanChange(
                                                                        row.type,
                                                                        plan.months,
                                                                        "discount",
                                                                        event.target.value
                                                                    )
                                                                }
                                                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-8 text-sm font-semibold text-slate-950 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-50"
                                                            />
                                                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                                                                %
                                                            </span>
                                                        </div>
                                                    </label>

                                                    <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
                                                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-500">
                                                            Total after discount
                                                        </p>
                                                        <p className="mt-1 text-lg font-bold text-slate-950">
                                                            {fullPayment ? toCurrency(fullPayment) : "-"}
                                                        </p>
                                                        <p className="mt-0.5 text-[11px] text-slate-500">
                                                            {gross ? `${toCurrency(gross)} before discount` : ""}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </article>
                    );
                })}
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-500 shadow-sm">
                <span className="font-semibold text-slate-900">Pricing rule:</span>{" "}
                each plan total = monthly fee x months, minus the discount. Learners
                choose a plan (3 / 6 / 12 months) at enrollment; the 6-month plan is
                used as the headline price where a single figure is shown.
            </div>
        </div>
    );
};

export default PricingForm;
