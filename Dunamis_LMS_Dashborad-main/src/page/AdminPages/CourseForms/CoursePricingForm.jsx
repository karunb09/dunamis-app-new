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
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-900 bg-yellow-300 px-5 py-4">
                    <h3 className="text-xl font-bold tracking-[0.18em] text-slate-950">
                        Course Fees Model
                    </h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-[980px] w-full border-collapse text-sm">
                        <thead>
                            <tr className="text-slate-950">
                                <th className="border border-slate-900 bg-rose-50 px-4 py-4 text-left text-base font-bold">
                                    Session
                                </th>
                                <th className="border border-slate-900 bg-white px-4 py-4 text-left text-base font-bold">
                                    Course Type
                                </th>
                                <th className="border border-slate-900 bg-white px-4 py-4 text-center text-base font-bold">
                                    Course Duration
                                    <span className="block">(Months)</span>
                                </th>
                                <th className="border border-slate-900 bg-white px-4 py-4 text-center text-base font-bold">
                                    Monthly Fee
                                    <span className="block text-xs font-medium text-emerald-700">
                                        6 Installments
                                    </span>
                                </th>
                                <th className="border border-slate-900 bg-violet-100 px-4 py-4 text-center text-base font-bold">
                                    Full Course Fee
                                    <span className="block">(x duration)</span>
                                </th>
                                <th className="border border-slate-900 bg-violet-100 px-4 py-4 text-center text-base font-bold">
                                    Discount
                                    <span className="block">(%)</span>
                                </th>
                                <th className="border border-slate-900 bg-violet-100 px-4 py-4 text-center text-base font-bold">
                                    Course Fee
                                    <span className="block">After Discount</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {SESSION_ROWS.map((row, index) => {
                                const session = sessions[row.type] || DEFAULT_PRICING[row.type];
                                const isEnabled = Boolean(session.enabled);
                                const fullCourseFee = calculateFullCourseFee(session);
                                const discountAmount = calculateDiscountAmount(session);
                                const feeAfterDiscount = calculateFeeAfterDiscount(session);

                                return (
                                    <tr
                                        key={row.type}
                                        className={isEnabled ? "bg-white" : "bg-slate-50 text-slate-400"}
                                    >
                                        {index === 0 ? (
                                            <td
                                                rowSpan={SESSION_ROWS.length}
                                                className="border border-slate-900 bg-fuchsia-200 px-4 py-5 text-center text-base font-bold text-slate-950"
                                            >
                                                Pricing
                                            </td>
                                        ) : null}

                                        <td className="border border-slate-900 px-4 py-4">
                                            <label className="flex items-start gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={isEnabled}
                                                    onChange={() => handleToggle(row.type)}
                                                    className="mt-1 h-4 w-4 rounded border-slate-300"
                                                />
                                                <span>
                                                    <span className="block text-base font-semibold text-slate-950">
                                                        {row.label}
                                                    </span>
                                                    <span className="mt-1 block text-xs text-slate-500">
                                                        {row.helper}
                                                    </span>
                                                </span>
                                            </label>
                                        </td>

                                        <td className="border border-slate-900 px-4 py-4 text-center">
                                            <input
                                                type="number"
                                                min="1"
                                                disabled={!isEnabled}
                                                value={session.totalInstallments ?? session.installments ?? ""}
                                                onChange={(event) =>
                                                    handleChange(row.type, "totalInstallments", event.target.value)
                                                }
                                                className={`mx-auto w-24 rounded-xl border px-3 py-2 text-center outline-none transition ${
                                                    isEnabled
                                                        ? "border-slate-300 bg-white focus:border-orange-400"
                                                        : "cursor-not-allowed border-slate-200 bg-slate-100"
                                                }`}
                                            />
                                        </td>

                                        <td className="border border-slate-900 bg-emerald-50 px-4 py-4 text-center">
                                            <input
                                                type="number"
                                                min="0"
                                                step="1"
                                                disabled={!isEnabled}
                                                value={session.monthlyFee}
                                                onChange={(event) =>
                                                    handleChange(row.type, "monthlyFee", event.target.value)
                                                }
                                                className={`mx-auto w-32 rounded-xl border px-3 py-2 text-center outline-none transition ${
                                                    isEnabled
                                                        ? "border-slate-300 bg-white focus:border-orange-400"
                                                        : "cursor-not-allowed border-slate-200 bg-slate-100"
                                                }`}
                                            />
                                        </td>

                                        <td className="border border-slate-900 bg-violet-100 px-4 py-4 text-center text-lg font-semibold text-slate-950">
                                            {fullCourseFee ? toCurrency(fullCourseFee) : "-"}
                                        </td>

                                        <td className="border border-slate-900 bg-violet-100 px-4 py-4 text-center">
                                            <div className="flex flex-col items-center gap-1">
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
                                                    className={`w-24 rounded-xl border px-3 py-2 text-center outline-none transition ${
                                                        isEnabled
                                                            ? "border-slate-300 bg-white focus:border-orange-400"
                                                            : "cursor-not-allowed border-slate-200 bg-slate-100"
                                                    }`}
                                                />
                                                <span className="text-xs font-medium text-slate-500">
                                                    {discountAmount ? toCurrency(discountAmount) : "No discount"}
                                                </span>
                                            </div>
                                        </td>

                                        <td className="border border-slate-900 bg-violet-100 px-4 py-4 text-center text-lg font-bold text-slate-950">
                                            {feeAfterDiscount ? toCurrency(feeAfterDiscount) : "-"}
                                            <input
                                                type="hidden"
                                                value={session.fullPayment || ""}
                                                readOnly
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Active pricing rows
                    </p>
                    <p className="mt-1 text-2xl font-bold text-slate-950">
                        {summary.enabledCount}
                    </p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Total fee after discount
                    </p>
                    <p className="mt-1 text-2xl font-bold text-slate-950">
                        {summary.totalAfterDiscount
                            ? toCurrency(summary.totalAfterDiscount)
                            : "-"}
                    </p>
                </div>
            </div>

            <p className="text-sm leading-6 text-slate-500">
                Full course fee is calculated as monthly fee multiplied by course
                duration. The saved full payment amount is the course fee after
                discount, matching the model shown above.
            </p>
        </div>
    );
};

export default PricingForm;
