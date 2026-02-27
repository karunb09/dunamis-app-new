// EnrollModal.jsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { usePathname } from 'next/navigation';
import { HiUsers, HiClock, HiCheckCircle, HiX } from 'react-icons/hi';
import { FaUser } from 'react-icons/fa';
import GroupSessionModal from './GroupSessionModal';
import IndividualSessionModal from './IndividualSessionModal';
import { fetchCourseById } from '../../store/courseSlice';
import { upsertEnrollSelection } from '../../helpers/session';

const toTimeLabel = (t) => {
    if (!t && t !== 0) return '—';
    const s = String(t).trim();
    if (/\b(AM|PM)\b/i.test(s)) return s.toUpperCase();
    const clean = s.replace(/\D/g, '');
    if (clean.length < 3) return s;
    const hh = parseInt(clean.slice(0, clean.length - 2), 10);
    const mm = clean.slice(-2);
    if (Number.isNaN(hh)) return s;
    const h12 = ((hh + 11) % 12) + 1;
    const ap = hh < 12 ? 'AM' : 'PM';
    return `${h12}:${mm} ${ap}`;
};

const toMoney = (n) => {
    const v = Number(n);
    if (!Number.isFinite(v) || v <= 0) return null;
    return `₹${v.toLocaleString('en-IN')}`;
};

export default function EnrollModal({ isOpen, onClose }) {
    const pathname = usePathname();
    const dispatch = useDispatch();

    const { course: storedCourse, loading, error } = useSelector((s) => s.course);
    const payload = storedCourse || null;

    const [isGroupModalOpen, setGroupModalOpen] = useState(false);
    const [isIndividualModalOpen, setIsIndividualModalOpen] = useState(false);

    const courseId = useMemo(() => {
        const parts = (pathname || '').split('/').filter(Boolean);
        const i = parts.findIndex((p) => p.toLowerCase() === 'courses');
        return i >= 0 ? parts[i + 1] : null;
    }, [pathname]);

    const loadedId = payload?._id || payload?.id || null;

    useEffect(() => {
        if (!courseId) return;
        if (loadedId === courseId) return;
        dispatch(fetchCourseById(courseId));
    }, [courseId, loadedId, dispatch]);

    const course = useMemo(() => {
        const d = payload || {};
        return {
            id: d?._id || d?.id,
            name: d?.name,
            code: d?.code,
            mode: d?.mode,
            level: d?.level,
            startDate: d?.startDate,
            endDate: d?.endDate,
            image: d?.image,
            totalStudents: d?.totalStudents,
        };
    }, [payload]);

    const teacher = useMemo(() => {
        const d = payload || {};
        const teachers = Array.isArray(d?.teacher) ? d.teacher : d?.teacher ? [d.teacher] : [];
        const t =
            teachers.find((x) => Array.isArray(x?.weeklyAvailability) && x.weeklyAvailability.length) ||
            teachers[0] ||
            {};
        const td = t?.teacherDetail || {};
        return {
            id: t?._id || t?.id,
            firstName: td?.name?.firstName,
            lastName: td?.name?.lastName,
            profilePicture: td?.profilePicture || t?.userId?.image || d?.image,
            averageRating: t?.averageRating ?? d?.averageRating,
            studentCount: t?.studentCount ?? d?.studentCount,
            weeklyAvailability: Array.isArray(t?.weeklyAvailability) ? t.weeklyAvailability : [],
        };
    }, [payload]);

    const schedules = useMemo(() => {
        const list = (teacher?.weeklyAvailability || []).map((s) => ({
            id: s?._id || s?.id,
            days: s?.days || s?.day,
            startTime: s?.startTime,
            endTime: s?.endTime,
            sessionType: s?.sessionType,
            slotType: s?.slotType,
            maxStudents: s?.maxStudents,
        }));
        const seen = new Set();
        return list.filter((x) => {
            const key = x.id || `${x.sessionType}-${x.days}-${x.startTime}-${x.endTime}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, [teacher]);

    const prices = useMemo(() => {
        const d = payload || {};
        const arr = Array.isArray(d?.price) ? d.price : d?.price ? [d.price] : [];
        return arr.map((x) => ({
            id: x?._id || x?.id,
            sessionType: x?.sessionType,
            monthlyFee: x?.monthlyFee,
            fullPayment: x?.fullPayment,
            discount: x?.discount ?? 0,
            isSelected: x?.isSelected ?? false,
            isActive: x?.isActive ?? true,
        }));
    }, [payload]);

    const groupPrice = useMemo(() => {
        const list = prices.filter((p) => p.sessionType === 'standard');
        return list.find((p) => p.isSelected) || list[0] || null;
    }, [prices]);

    const premiumPrice = useMemo(() => {
        const list = prices.filter((p) => p.sessionType === 'premium');
        return list.find((p) => p.isSelected) || list[0] || null;
    }, [prices]);

    const groupSchedules = useMemo(() => schedules.filter((s) => s.sessionType === 'standard'), [schedules]);
    const premiumSchedules = useMemo(() => schedules.filter((s) => s.sessionType === 'premium'), [schedules]);

    if (!isOpen) return null;

    const firstGroup = groupSchedules[0];
    const firstPremium = premiumSchedules[0];

    const groupMonthly = toMoney(groupPrice?.monthlyFee) || toMoney(groupPrice?.fullPayment);
    const premiumMonthly = toMoney(premiumPrice?.monthlyFee) || toMoney(premiumPrice?.fullPayment);

    // Use merge helper; do not write instructor/branch/slot here
    const handleOpenGroup = () => {
        upsertEnrollSelection({
            courseId: course?.id || null,
            courseName: course?.name || '',
            sessionType: 'standard',
            priceId: groupPrice?.id || null,
            scheduleId: firstGroup?.id || null,
        });
        setGroupModalOpen(true);
    };

    const handleOpenPremium = () => {
        upsertEnrollSelection({
            courseId: course?.id || null,
            courseName: course?.name || '',
            sessionType: 'premium',
            priceId: premiumPrice?.id || null,
            scheduleId: firstPremium?.id || null,
        });
        setIsIndividualModalOpen(true);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 relative">
                <button onClick={onClose} className="cursor-pointer absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xl" aria-label="Close">
                    <HiX />
                </button>

                <h2 className="text-2xl font-semibold text-center mb-1">Choose Your Learning Style</h2>
                <p className="text-center text-sm text-gray-600 mb-5">Select the type of session that best fits your learning preferences</p>

                <div onClick={handleOpenGroup} className="border border-gray-200 rounded-lg p-5 mb-4 hover:shadow-md cursor-pointer transition-all">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">Standard Sessions</h3>
                        <span className="bg-purple-100 text-purple-700 text-xs font-medium px-3 py-1 rounded-full">Popular</span>
                    </div>
                    <p className="text-2xl font-bold mt-2 mb-1">
                        {groupMonthly || '—'} <span className="text-sm font-medium text-gray-600">/month</span>
                    </p>
                    <p className="text-xs text-gray-500 mb-3">
                        Full: {toMoney(groupPrice?.fullPayment) || '—'} • Discount: {groupPrice?.discount ?? 0} • Selected: {groupPrice?.isSelected ? 'Yes' : 'No'}
                    </p>
                    <ul className="text-sm text-gray-700 space-y-2">
                        <li className="flex items-center gap-2">
                            <HiUsers className="text-gray-600" />
                            Up to {firstGroup?.maxStudents ?? 4} students
                        </li>
                        <li className="flex items-center gap-2">
                            <HiClock className="text-gray-600" />
                            {toTimeLabel(firstGroup?.startTime)} - {toTimeLabel(firstGroup?.endTime)}
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
                        course={course}
                        teacher={teacher}
                        price={groupPrice}
                        schedules={groupSchedules}
                        courseCategory={payload?.category?.name}
                    />
                )}

                <div onClick={handleOpenPremium} className="border border-green-300 rounded-lg p-5 hover:shadow-md cursor-pointer transition-all">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">Premium Sessions</h3>
                        <span className="bg-purple-100 text-purple-700 text-xs font-medium px-3 py-1 rounded-full">Personalized</span>
                    </div>
                    <div className="mt-2 mb-1">
                        <p className="text-2xl font-bold">
                            {premiumMonthly || '—'} <span className="text-sm font-medium text-gray-600">/month</span>
                        </p>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                        Full: {toMoney(premiumPrice?.fullPayment) || '—'} • Discount: {premiumPrice?.discount ?? 0} • Selected: {premiumPrice?.isSelected ? 'Yes' : 'No'}
                    </p>
                    <ul className="text-sm text-gray-700 space-y-2">
                        <li className="flex items-center gap-2">
                            <FaUser className="text-gray-600" />
                            Max {firstPremium?.maxStudents ?? 1} student
                        </li>
                        <li className="flex items-center gap-2">
                            <HiClock className="text-gray-600" />
                            {toTimeLabel(firstPremium?.startTime)} - {toTimeLabel(firstPremium?.endTime)}
                        </li>
                        <li className="flex items-center gap-2">
                            <HiCheckCircle className="text-green-600" />
                            Customized learning pace
                        </li>
                    </ul>
                </div>

                {isIndividualModalOpen && (
                    <IndividualSessionModal
                        isOpen
                        onClose={() => setIsIndividualModalOpen(false)}
                        course={course}
                        teacher={teacher}
                        price={premiumPrice}
                        schedules={premiumSchedules}
                        courseCategory={payload?.category?.name}
                    />
                )}

                <p className="text-center text-xs text-gray-500 mt-6">Click any option to continue with plan selection</p>

                {(loading || error) && (
                    <div className="absolute inset-0 bg-white/70 rounded-xl flex items-center justify-center text-sm">
                        {loading ? 'Loading course...' : error}
                    </div>
                )}
            </div>
        </div>
    );
}
