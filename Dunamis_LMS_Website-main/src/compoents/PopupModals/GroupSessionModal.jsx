'use client';

import { useMemo, useState } from 'react';
import { HiArrowLeft, HiCheckCircle, HiX } from 'react-icons/hi';
import { useRouter } from 'next/navigation';
import { upsertEnrollSelection } from '@/helpers/session';
import { getActiveTenurePlans, pickDefaultTenure, findTenure } from '@/helpers/tenurePlans';

const toMoney = (n) => {
    const v = Number(n);
    if (!Number.isFinite(v)) return null;
    return `₹${v.toLocaleString('en-IN')}`;
};

export default function GroupSessionModal({ isOpen, onClose, course, teacher, price, schedules = [], courseCategory }) {
    const router = useRouter();

    const tenurePlans = useMemo(() => getActiveTenurePlans(price), [price]);
    const [selectedMonths, setSelectedMonths] = useState(
        () => pickDefaultTenure(tenurePlans)?.months ?? null
    );

    if (!isOpen) return null;

    const activeTenure =
        findTenure(tenurePlans, selectedMonths) || pickDefaultTenure(tenurePlans);
    const hasTenures = tenurePlans.length > 0;

    // Tenure plan values take precedence; otherwise fall back to legacy fields.
    const monthly = activeTenure
        ? activeTenure.monthlyFee || null
        : Number(price?.monthlyFee) || null;
    const full = activeTenure
        ? activeTenure.fullPayment || null
        : Number(price?.fullPayment) || null;
    const discountPct = activeTenure
        ? Number(activeTenure.discount) || 0
        : Number(price?.discount) || 0;
    const planMonths = activeTenure
        ? activeTenure.months
        : Number(price?.installments) > 1
            ? Number(price.installments)
            : null;

    const mrpFull = full && discountPct ? Math.round(full / (1 - discountPct / 100)) : null;
    const savings = mrpFull && full ? mrpFull - full : null;

    const saveSelection = (planType) => {
        upsertEnrollSelection({
            sessionType: 'standard',
            planType, // 'monthly' | 'full'
            planMonths, // chosen 3 / 6 / 12 plan (null for legacy courses)
            courseId: course?.id || '',
            courseName: course?.name || '',
            code: course?.code || '',
            category: courseCategory || '',
            deliveryMode: course?.mode || null,
            duration: planMonths ? `${planMonths} months` : '',
            courseImage: course?.image || '',
            monthlyFee: monthly ?? null,
            fullPayment: full ?? null,
            discount: discountPct || 0,
        });
    };

    const handlePlanClick = (planType) => {
        saveSelection(planType);
        router.push('/payment-confirmation');
        onClose?.();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-3 backdrop-blur-sm sm:items-center sm:p-4">
            <div className="relative my-auto max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-xl bg-white p-4 shadow-xl sm:p-6">
                <button onClick={onClose} className="cursor-pointer absolute top-3 left-3 inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-800" aria-label="Back">
                    <HiArrowLeft /> Back
                </button>
                <button onClick={onClose} className="cursor-pointer absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xl" aria-label="Close">
                    <HiX />
                </button>

                <h2 className="text-2xl font-semibold text-center mb-1 mt-4 sm:mt-0">Choose Your Plan</h2>
                <p className="text-center text-sm text-gray-600 mb-5">
                    {course?.name || 'Course'} • Standard group sessions
                </p>

                {hasTenures && (
                    <div className="mb-5">
                        <p className="mb-2 text-sm font-medium text-gray-700">Select duration</p>
                        <div className="grid grid-cols-3 gap-2">
                            {tenurePlans.map((plan) => {
                                const isSelected = plan.months === selectedMonths;
                                return (
                                    <button
                                        key={plan.months}
                                        type="button"
                                        onClick={() => setSelectedMonths(plan.months)}
                                        className={`rounded-lg border px-3 py-2 text-center transition ${
                                            isSelected
                                                ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <span className="block text-base font-semibold text-gray-900">
                                            {plan.months} mo
                                        </span>
                                        <span className="block text-[11px] text-gray-500">
                                            {toMoney(plan.fullPayment) || '—'}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div onClick={() => handlePlanClick('monthly')} className="border border-gray-200 rounded-lg p-5 mb-4 hover:shadow-md cursor-pointer transition-all">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-semibold">Monthly Plan</h3>
                        <span className="bg-purple-100 text-purple-700 text-xs font-medium px-3 py-1 rounded-full">Flexible</span>
                    </div>
                    <p className="text-2xl font-bold mb-1">
                        {toMoney(monthly) || '—'} <span className="text-sm font-medium text-gray-600">/month</span>
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-700 mt-1">
                        <HiCheckCircle className="text-green-600" />
                        <span>{planMonths ? `Paid over ${planMonths} months` : 'Pay as you go • Cancel anytime'}</span>
                    </div>
                </div>

                <div onClick={() => handlePlanClick('full')} className="border border-green-300 rounded-lg p-5 hover:shadow-md cursor-pointer transition-all">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-semibold">
                            {planMonths ? `${planMonths}-Month Plan` : 'Full Course Plan'}
                        </h3>
                        <span className="bg-purple-100 text-purple-700 text-xs font-medium px-3 py-1 rounded-full">Best Value</span>
                    </div>
                    <div className="flex justify-between items-center mb-1">
                        <p className="text-2xl font-bold">
                            {toMoney(full) || '—'} <span className="text-sm font-medium text-gray-600">one-time</span>
                        </p>
                        {discountPct ? (
                            <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded-full">
                                Save {discountPct}%
                            </span>
                        ) : null}
                    </div>
                    {mrpFull ? <p className="text-sm line-through text-gray-400">{toMoney(mrpFull)}</p> : null}
                    {savings ? <p className="text-sm text-green-600 font-medium mb-2">Save {toMoney(savings)}</p> : null}
                    <ul className="text-sm text-gray-700 space-y-1 mt-1">
                        <li className="flex items-center gap-2">
                            <HiCheckCircle className="text-green-600" />
                            Best overall price
                        </li>
                        <li className="flex items-center gap-2">
                            <HiCheckCircle className="text-green-600" />
                            Priority support
                        </li>
                        <li className="flex items-center gap-2">
                            <HiCheckCircle className="text-green-600" />
                            Certificate
                        </li>
                    </ul>
                </div>
                <p className="text-center text-xs text-gray-500 mt-6">Select a plan to continue</p>
            </div>
        </div>
    );
}
