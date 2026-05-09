import React, { useEffect, useMemo, useState } from "react";

const DEFAULT_DURATION_MONTHS = 6;

const DEFAULT_PRICING = {
    standard: {
        enabled: false,
        monthlyFee: "",
        fullPayment: "",
        discount: "10",
        totalInstallments: DEFAULT_DURATION_MONTHS,
        installments: DEFAULT_DURATION_MONTHS,
    },
    premium: {
        enabled: false,
        monthlyFee: "",
        fullPayment: "",
        discount: "10",
        totalInstallments: DEFAULT_DURATION_MONTHS,
        installments: DEFAULT_DURATION_MONTHS,
    },
};

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

const getDuration = (session = {}) => {
    const duration = Number(session.totalInstallments ?? session.installments);
    return Number.isFinite(duration) && duration > 0
        ? duration
        : DEFAULT_DURATION_MONTHS;
};

const calculateFullCourseFee = (session = {}) =>
    toNumber(session.monthlyFee) * getDuration(session);

const calculateDiscountAmount = (session = {}) =>
    Math.round((calculateFullCourseFee(session) * toNumber(session.discount)) / 100);

const calculateFeeAfterDiscount = (session = {}) =>
    Math.max(calculateFullCourseFee(session) - calculateDiscountAmount(session), 0);

const normalizeSession = (session = {}, fallback = {}) => {
    const nextSession = {
        ...fallback,
        ...session,
    };
    const duration = getDuration(nextSession);
    const hasFullPayment =
        nextSession.fullPayment !== "" &&
        nextSession.fullPayment !== null &&
        nextSession.fullPayment !== undefined;

    return {
        ...nextSession,
        discount:
            nextSession.discount === "" ||
            nextSession.discount === null ||
            nextSession.discount === undefined
                ? fallback.discount
                : nextSession.discount,
        totalInstallments: duration,
        installments: duration,
        fullPayment: hasFullPayment
            ? nextSession.fullPayment
            : calculateFeeAfterDiscount({
                  ...nextSession,
                  totalInstallments: duration,
              }) || "",
    };
};

const normalizePricing = (pricing) => ({
    standard: normalizeSession(pricing?.standard, DEFAULT_PRICING.standard),
    premium: normalizeSession(pricing?.premium, DEFAULT_PRICING.premium),
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

        const totalAfterDiscount = enabledRows.reduce(
            (total, row) => total + calculateFeeAfterDiscount(sessions[row.type]),
            0
        );

        return {
            enabledCount: enabledRows.length,
            totalAfterDiscount,
        };
    }, [sessions]);

    const commitSessions = (nextSessions) => {
        setSessions(nextSessions);
        setPricing(nextSessions);
    };

    const handleToggle = (type) => {
        const current = sessions[type] || DEFAULT_PRICING[type];
        const nextSession = normalizeSession(
            {
                ...current,
                enabled: !current.enabled,
            },
            DEFAULT_PRICING[type]
        );

        commitSessions({
            ...sessions,
            [type]: {
                ...nextSession,
                fullPayment: calculateFeeAfterDiscount(nextSession) || "",
            },
        });
    };

    const handleChange = (type, field, value) => {
        const current = sessions[type] || DEFAULT_PRICING[type];
        const patch =
            field === "totalInstallments"
                ? { totalInstallments: value, installments: value }
                : { [field]: value };
        const nextSession = normalizeSession(
            {
                ...current,
                ...patch,
            },
            DEFAULT_PRICING[type]
        );
        const nextFullPayment = calculateFeeAfterDiscount(nextSession);

        commitSessions({
            ...sessions,
            [type]: {
                ...nextSession,
                fullPayment: nextFullPayment || "",
            },
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
                                Build pricing from monthly fee, duration, and discount.
                            </h3>
                            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
                                The final course fee is calculated automatically and saved as
                                the full payment amount students will see during enrollment.
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
                                    Final total
                                </p>
                                <p className="mt-2 text-2xl font-semibold">
                                    {summary.totalAfterDiscount
                                        ? toCurrency(summary.totalAfterDiscount)
                                        : "-"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <div className="grid gap-5 xl:grid-cols-2">
                {SESSION_ROWS.map((row) => {
                    const session = sessions[row.type] || DEFAULT_PRICING[row.type];
                    const isEnabled = Boolean(session.enabled);
                    const duration = getDuration(session);
                    const fullCourseFee = calculateFullCourseFee(session);
                    const discountAmount = calculateDiscountAmount(session);
                    const feeAfterDiscount = calculateFeeAfterDiscount(session);

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
                                    onClick={() => handleToggle(row.type)}
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

                            <div className="mt-6 grid gap-4 sm:grid-cols-3">
                                <label className="block">
                                    <span className="mb-2 block text-sm font-medium text-slate-700">
                                        Duration {isEnabled && <span className="text-red-500">*</span>}
                                    </span>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="1"
                                            required={isEnabled}
                                            disabled={!isEnabled}
                                            value={session.totalInstallments ?? session.installments ?? ""}
                                            onChange={(event) =>
                                                handleChange(row.type, "totalInstallments", event.target.value)
                                            }
                                            className={`w-full rounded-2xl border px-4 py-3 pr-16 text-sm font-semibold outline-none transition ${
                                                isEnabled
                                                    ? "border-slate-200 bg-white text-slate-950 focus:border-orange-400 focus:ring-4 focus:ring-orange-50"
                                                    : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                                            }`}
                                        />
                                        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                                            months
                                        </span>
                                    </div>
                                </label>

                                <label className="block">
                                    <span className="mb-2 block text-sm font-medium text-slate-700">
                                        Monthly Fee {isEnabled && <span className="text-red-500">*</span>}
                                    </span>
                                    <div className="relative">
                                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                                            ₹
                                        </span>
                                        <input
                                            type="number"
                                            min="1"
                                            step="1"
                                            required={isEnabled}
                                            disabled={!isEnabled}
                                            value={session.monthlyFee}
                                            onChange={(event) =>
                                                handleChange(row.type, "monthlyFee", event.target.value)
                                            }
                                            className={`w-full rounded-2xl border py-3 pl-8 pr-4 text-sm font-semibold outline-none transition ${
                                                isEnabled
                                                    ? "border-slate-200 bg-white text-slate-950 focus:border-orange-400 focus:ring-4 focus:ring-orange-50"
                                                    : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                                            }`}
                                        />
                                    </div>
                                </label>

                                <label className="block">
                                    <span className="mb-2 block text-sm font-medium text-slate-700">
                                        Discount
                                    </span>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="1"
                                            disabled={!isEnabled}
                                            value={session.discount}
                                            onChange={(event) =>
                                                handleChange(row.type, "discount", event.target.value)
                                            }
                                            className={`w-full rounded-2xl border px-4 py-3 pr-10 text-sm font-semibold outline-none transition ${
                                                isEnabled
                                                    ? "border-slate-200 bg-white text-slate-950 focus:border-orange-400 focus:ring-4 focus:ring-orange-50"
                                                    : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                                            }`}
                                        />
                                        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                                            %
                                        </span>
                                    </div>
                                </label>
                            </div>

                            <div className="mt-6 rounded-[26px] border border-slate-200 bg-slate-50 p-4">
                                <div className="grid gap-3 sm:grid-cols-3">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                            Full course fee
                                        </p>
                                        <p className="mt-2 text-lg font-semibold text-slate-950">
                                            {fullCourseFee ? toCurrency(fullCourseFee) : "-"}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            {duration} x monthly fee
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                            Discount
                                        </p>
                                        <p className="mt-2 text-lg font-semibold text-slate-950">
                                            {discountAmount ? toCurrency(discountAmount) : "-"}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            {toNumber(session.discount)}% off
                                        </p>
                                    </div>
                                    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-500">
                                            Fee after discount
                                        </p>
                                        <p className="mt-2 text-2xl font-bold text-slate-950">
                                            {feeAfterDiscount ? toCurrency(feeAfterDiscount) : "-"}
                                        </p>
                                        <input
                                            type="hidden"
                                            value={session.fullPayment || ""}
                                            readOnly
                                        />
                                    </div>
                                </div>
                            </div>
                        </article>
                    );
                })}
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-500 shadow-sm">
                <span className="font-semibold text-slate-900">Pricing rule:</span>{" "}
                full course fee = monthly fee x duration. The saved full payment
                amount is the calculated fee after discount.
            </div>
        </div>
    );
};

export default PricingForm;
