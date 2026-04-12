// EnrollModal.jsx
'use client';

import { useMemo, useState } from 'react';
import { HiUsers, HiClock, HiCheckCircle, HiX } from 'react-icons/hi';
import { FaUser } from 'react-icons/fa';
import GroupSessionModal from './GroupSessionModal';
import IndividualSessionModal from './IndividualSessionModal';
import { getCurrentSelection, upsertEnrollSelection } from '../../helpers/session';

const toTimeLabel = (value) => {
    if (!value && value !== 0) return '—';

    const raw = String(value).trim();
    if (raw === '24:00') return '12:00 AM';
    if (/\b(AM|PM)\b/i.test(raw)) {
        return raw.toUpperCase();
    }

    const parts = raw.split(':');
    if (parts.length === 2) {
        const hours = Number(parts[0]);
        const minutes = Number(parts[1]);

        if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
            const hour12 = ((hours + 11) % 12) + 1;
            const ampm = hours < 12 ? 'AM' : 'PM';
            return `${hour12}:${String(minutes).padStart(2, '0')} ${ampm}`;
        }
    }

    return raw;
};

const toMoney = (value) => {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    return `₹${amount.toLocaleString('en-IN')}`;
};

const hasPositivePrice = (price) =>
    Boolean(toMoney(price?.monthlyFee) || toMoney(price?.fullPayment));

const normalizeCourseCategory = (course) => {
    if (!course?.category) return '';
    if (typeof course.category === 'string') return course.category;
    return course.category?.name || '';
};

export default function EnrollModal({
    isOpen,
    onClose,
    selection,
    course: initialCourse,
}) {
    const [isGroupModalOpen, setGroupModalOpen] = useState(false);
    const [isIndividualModalOpen, setIsIndividualModalOpen] = useState(false);

    const selectedContext = selection || getCurrentSelection() || {};
    const payload = initialCourse || null;

    const courseDetails = useMemo(() => {
        const item = payload || {};

        return {
            id: item?._id || item?.id || '',
            name: item?.name || '',
            code: item?.code || '',
            mode: item?.mode || '',
            level: item?.level || '',
            startDate: item?.startDate || '',
            endDate: item?.endDate || '',
            image: item?.image || '',
            totalStudents: item?.totalStudents || 0,
            branches: Array.isArray(item?.branches) ? item.branches : [],
        };
    }, [payload]);

    const prices = useMemo(() => {
        const source = Array.isArray(payload?.price)
            ? payload.price
            : payload?.price
                ? [payload.price]
                : [];

        return source.map((item) => ({
            id: item?._id || item?.id || '',
            sessionType: item?.sessionType || '',
            monthlyFee: item?.monthlyFee,
            fullPayment: item?.fullPayment,
            discount: item?.discount ?? 0,
            isSelected: item?.isSelected ?? false,
            isActive: item?.isActive ?? true,
        }));
    }, [payload]);

    const groupPrice = useMemo(() => {
        const items = prices.filter(
            (price) =>
                price.isActive !== false &&
                price.sessionType === 'standard' &&
                hasPositivePrice(price)
        );

        return items.find((price) => price.isSelected) || items[0] || null;
    }, [prices]);

    const premiumPrice = useMemo(() => {
        const items = prices.filter(
            (price) =>
                price.isActive !== false &&
                price.sessionType === 'premium' &&
                hasPositivePrice(price)
        );

        return items.find((price) => price.isSelected) || items[0] || null;
    }, [prices]);

    const selectedSlot = selectedContext?.slot || null;
    const selectedSessionType =
        selectedContext?.sessionType || selectedSlot?.sessionType || null;
    const selectedBranch =
        selectedContext?.branchLabel || selectedContext?.branch || null;
    const selectedInstructorLabel =
        selectedContext?.instructorLabel || selectedContext?.instructor || 'Instructor';
    const selectedSlotId = selectedSlot?.slotId || selectedSlot?.id || '';
    const hasChosenSlot = Boolean(selectedSlotId);

    const canChooseGroup =
        hasChosenSlot &&
        Boolean(groupPrice) &&
        (!selectedSessionType || selectedSessionType === 'standard');
    const canChoosePremium =
        hasChosenSlot &&
        Boolean(premiumPrice) &&
        (!selectedSessionType || selectedSessionType === 'premium');

    const getSlotSummary = (sessionType) => {
        if (!selectedSlot || (selectedSessionType && selectedSessionType !== sessionType)) {
            return {
                maxStudents: null,
                timeRange: 'Choose a matching slot in the previous step',
            };
        }

        return {
            maxStudents: selectedSlot?.maxStudents ?? null,
            timeRange:
                selectedSlot?.startTime && selectedSlot?.endTime
                    ? `${toTimeLabel(selectedSlot.startTime)} - ${toTimeLabel(selectedSlot.endTime)}`
                    : selectedSlot?.label || 'Selected in previous step',
        };
    };

    const groupSlotSummary = getSlotSummary('standard');
    const premiumSlotSummary = getSlotSummary('premium');

    if (!isOpen) return null;

    const groupMonthly = toMoney(groupPrice?.monthlyFee) || toMoney(groupPrice?.fullPayment);
    const premiumMonthly =
        toMoney(premiumPrice?.monthlyFee) || toMoney(premiumPrice?.fullPayment);
    const courseCategory = normalizeCourseCategory(payload);

    const persistPlanContext = (sessionType, priceId) => {
        upsertEnrollSelection({
            courseId: courseDetails?.id || null,
            courseName: courseDetails?.name || '',
            deliveryMode: selectedContext?.deliveryMode || courseDetails?.mode || null,
            sessionType,
            priceId: priceId || null,
        });
    };

    const handleOpenGroup = () => {
        if (!canChooseGroup) return;
        persistPlanContext('standard', groupPrice?.id || null);
        setGroupModalOpen(true);
    };

    const handleOpenPremium = () => {
        if (!canChoosePremium) return;
        persistPlanContext('premium', premiumPrice?.id || null);
        setIsIndividualModalOpen(true);
    };

    const selectionLockedMessage = !hasChosenSlot
        ? 'Choose instructor and slot in the previous step to continue.'
        : selectedSessionType
            ? `Your selected slot is a ${selectedSessionType} session.`
            : '';
    const unavailableSelectedPlanMessage =
        selectedSessionType === 'premium' && !premiumPrice
            ? 'Premium pricing is not available for this course, so individual enrollment is hidden.'
            : selectedSessionType === 'standard' && !groupPrice
                ? 'Group pricing is not available for this course.'
                : '';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
                <button
                    onClick={onClose}
                    className="absolute right-3 top-3 cursor-pointer text-xl text-gray-400 hover:text-gray-600"
                    aria-label="Close"
                >
                    <HiX />
                </button>

                <h2 className="mb-1 text-center text-2xl font-semibold">
                    Choose Your Learning Style
                </h2>
                <p className="mb-5 text-center text-sm text-gray-600">
                    Select the type of session that best fits your learning preferences
                </p>

                {(selectedBranch || selectedContext?.instructorId || selectedSessionType) && (
                    <div className="mb-5 rounded-xl border border-orange-100 bg-orange-50 p-4 text-sm text-gray-700">
                        <p className="font-semibold text-gray-900">
                            Your selected enrollment context
                        </p>
                        <div className="mt-2 space-y-1">
                            {selectedBranch && <p>Branch: {selectedBranch}</p>}
                            {selectedContext?.instructorId && (
                                <p>Instructor: {selectedInstructorLabel}</p>
                            )}
                            {selectedSessionType && (
                                <p>Slot session: {selectedSessionType}</p>
                            )}
                            {selectedSlot?.label && <p>Selected slot: {selectedSlot.label}</p>}
                        </div>
                    </div>
                )}

                {selectionLockedMessage ? (
                    <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
                        {selectionLockedMessage}
                    </div>
                ) : null}

                {unavailableSelectedPlanMessage ? (
                    <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                        {unavailableSelectedPlanMessage}
                    </div>
                ) : null}

                <div
                    onClick={handleOpenGroup}
                    className={`mb-4 rounded-lg border p-5 transition-all ${
                        !canChooseGroup
                            ? 'cursor-not-allowed border-gray-100 bg-gray-50 opacity-60'
                            : 'cursor-pointer border-gray-200 hover:shadow-md'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Standard Sessions</h3>
                        <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">
                            Popular
                        </span>
                    </div>
                    <p className="mb-1 mt-2 text-2xl font-bold">
                        {groupMonthly || '—'}{' '}
                        <span className="text-sm font-medium text-gray-600">/month</span>
                    </p>
                    <p className="mb-3 text-xs text-gray-500">
                        Full: {toMoney(groupPrice?.fullPayment) || '—'} • Discount:{' '}
                        {groupPrice?.discount ?? 0}%
                    </p>
                    <ul className="space-y-2 text-sm text-gray-700">
                        <li className="flex items-center gap-2">
                            <HiUsers className="text-gray-600" />
                            Up to {groupSlotSummary.maxStudents ?? 4} students
                        </li>
                        <li className="flex items-center gap-2">
                            <HiClock className="text-gray-600" />
                            {groupSlotSummary.timeRange}
                        </li>
                        <li className="flex items-center gap-2">
                            <HiCheckCircle className="text-green-600" />
                            Interactive group discussions
                        </li>
                    </ul>
                </div>

                {isGroupModalOpen && (
                    <GroupSessionModal
                        isOpen
                        onClose={() => setGroupModalOpen(false)}
                        course={courseDetails}
                        price={groupPrice}
                        courseCategory={courseCategory}
                    />
                )}

                {premiumPrice ? (
                    <div
                        onClick={handleOpenPremium}
                        className={`rounded-lg border p-5 transition-all ${
                            !canChoosePremium
                                ? 'cursor-not-allowed border-gray-100 bg-gray-50 opacity-60'
                                : 'cursor-pointer border-green-300 hover:shadow-md'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">Premium Sessions</h3>
                            <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">
                                Personalized
                            </span>
                        </div>
                        <div className="mb-1 mt-2">
                            <p className="text-2xl font-bold">
                                {premiumMonthly || '—'}{' '}
                                <span className="text-sm font-medium text-gray-600">/month</span>
                            </p>
                        </div>
                        <p className="mb-3 text-xs text-gray-500">
                            Full: {toMoney(premiumPrice?.fullPayment) || '—'} • Discount:{' '}
                            {premiumPrice?.discount ?? 0}%
                        </p>
                        <ul className="space-y-2 text-sm text-gray-700">
                            <li className="flex items-center gap-2">
                                <FaUser className="text-gray-600" />
                                Max {premiumSlotSummary.maxStudents ?? 1} student
                            </li>
                            <li className="flex items-center gap-2">
                                <HiClock className="text-gray-600" />
                                {premiumSlotSummary.timeRange}
                            </li>
                            <li className="flex items-center gap-2">
                                <HiCheckCircle className="text-green-600" />
                                Customized learning pace
                            </li>
                        </ul>
                    </div>
                ) : null}

                {isIndividualModalOpen && premiumPrice ? (
                    <IndividualSessionModal
                        isOpen
                        onClose={() => setIsIndividualModalOpen(false)}
                        course={courseDetails}
                        price={premiumPrice}
                        courseCategory={courseCategory}
                    />
                ) : null}

                <p className="mt-6 text-center text-xs text-gray-500">
                    Click any option to continue with plan selection
                </p>
            </div>
        </div>
    );
}
