'use client';

import { HiCheckCircle, HiX } from 'react-icons/hi';
import { useRouter } from 'next/navigation';
import { upsertEnrollSelection } from '@/helpers/session';

const toMoney = (n) => {
    const v = Number(n);
    if (!Number.isFinite(v)) return null;
    return `₹${v.toLocaleString('en-IN')}`;
};

export default function GroupSessionModal({
    isOpen,
    onClose,
    course,
    teacher,
    price,
    schedules = [],
    courseCategory
}) {
    const router = useRouter();
    if (!isOpen) return null;

    const monthly = Number(price?.monthlyFee) || null;
    const full = Number(price?.fullPayment) || null;
    const discountPct = Number(price?.discount) || 0;

    const mrpFull = full && discountPct ? Math.round(full / (1 - discountPct / 100)) : null;
    const savings = mrpFull && full ? mrpFull - full : null;

    const handlePlanClick = (planType) => {
        upsertEnrollSelection({
            sessionType: 'premium',                // or 'standard' depending on this modal
            planType,                              // 'monthly' | 'full'
            courseId: String(course?.id || ''),
            courseName: course?.name || '',
            code: course?.code || '',
            category: courseCategory || '',
            deliveryMode: course?.mode || null,
            duration:
                course?.startDate && course?.endDate
                    ? `${new Date(course.startDate).toLocaleDateString()} - ${new Date(course.endDate).toLocaleDateString()}`
                    : '',
            courseImage: course?.image || '',
            monthlyFee: monthly ?? null,
            fullPayment: full ?? null,
            discount: discountPct || 0,
            // intentionally no instructor/instructorId/branch/slot here
        });

        router.push('/payment-confirmation');
        onClose?.();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-3 backdrop-blur-sm sm:items-center sm:p-4">
            <div className="relative my-auto max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-xl bg-white p-4 shadow-xl sm:p-6">
                <button onClick={onClose} className="cursor-pointer absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xl" aria-label="Close">
                    <HiX />
                </button>

                <h2 className="text-2xl font-semibold text-center mb-1">Choose Your Plan</h2>
                <p className="text-center text-sm text-gray-600 mb-5">
                    {course?.name || 'Course'} • Premium 1:1 sessions
                </p>

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
                        <span>Pay as you go • Cancel anytime</span>
                    </div>
                </div>

                <div onClick={() => handlePlanClick('full')} className="border border-green-300 rounded-lg p-5 hover:shadow-md cursor-pointer transition-all">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-semibold">Full Course Plan</h3>
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
                        <li className="flex items-center gap-2"><HiCheckCircle className="text-green-600" /> Best overall price</li>
                        <li className="flex items-center gap-2"><HiCheckCircle className="text-green-600" /> Priority support</li>
                        <li className="flex items-center gap-2"><HiCheckCircle className="text-green-600" /> Certificate</li>
                    </ul>
                </div>

                <p className="text-center text-xs text-gray-500 mt-6">Click any plan to continue with enrollment</p>
            </div>
        </div>
    );
}
