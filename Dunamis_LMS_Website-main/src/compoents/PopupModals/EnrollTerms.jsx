// EnrollTerm.jsx
'use client';

import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { HiOutlineLocationMarker, HiOutlineCalendar, HiUser, HiX } from 'react-icons/hi';
import { upsertEnrollSelection } from '@/helpers/session';

export default function EnrollTerm({ isOpen, onClose, course, onNext }) {
    const dispatch = useDispatch();
    const { status, items, error } = useSelector((s) => s.demoBooking || {});

    const [selectedBranch, setSelectedBranch] = useState('');
    const [selectedInstructor, setSelectedInstructor] = useState(''); // store id
    const [selectedSlot, setSelectedSlot] = useState(null);

    const courseTitle = useMemo(() => course?.name || course?.title || 'Course', [course]);

    const dynamicBranches = useMemo(() => {
        const arr = course?.branches || [];
        const names = arr.map((b) => b?.branchName).filter(Boolean);
        return names.length ? names : null;
    }, [course]);

    // Build instructors as { id, label }
    const dynamicInstructors = useMemo(() => {
        const t = Array.isArray(course?.teacher) ? course.teacher : [];
        const list = t
            .map((it) => {
                const id = it?._id || it?.id || it?.teacherDetail?._id || it?.userId?._id || null;
                const f = it?.teacherDetail?.name?.firstName || '';
                const l = it?.teacherDetail?.name?.lastName || '';
                const label = `${f} ${l}`.trim() || 'Instructor';
                return id ? { id: String(id), label } : null;
            })
            .filter(Boolean);
        const seen = new Set();
        return list.filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true)));
    }, [course]);

    const dynamicDates = useMemo(() => {
        const teachers = Array.isArray(course?.teacher) ? course.teacher : [];
        const avail = teachers
            .filter((t) => Array.isArray(t.weeklyAvailability) && t.weeklyAvailability.length)
            .flatMap((t) => t.weeklyAvailability);

        const onlyEnrolled = avail.filter((s) => s.slotType === 'enrolled');
        if (!onlyEnrolled.length) return null;

        const byDay = new Map();

        const addSlot = (dayStr, start, end, id) => {
            const dayLabel = capitalize(dayStr);
            const time = start && end ? `${start} - ${end}` : 'Time TBD';
            if (!byDay.has(dayLabel)) byDay.set(dayLabel, []);
            byDay.get(dayLabel).push({
                slotId: id || null,
                label: `${dayLabel} | ${time}`,
                startTime: start || null,
                endTime: end || null,
            });
        };

        for (const s of onlyEnrolled) {
            if (s.day) addSlot(s.day, s.startTime, s.endTime, s._id);
            else if (Array.isArray(s.days) && s.days.length) {
                s.days.forEach((d) => addSlot(d, s.startTime, s.endTime, s._id));
            }
        }

        const out = [];
        for (const [day, slots] of byDay.entries()) out.push({ day, slots });

        const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        out.sort((a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day));
        return out.length ? out : null;
    }, [course]);

    const branches = Array.isArray(dynamicBranches) ? dynamicBranches : [];
    const instructors = Array.isArray(dynamicInstructors) ? dynamicInstructors : [];
    const dates = Array.isArray(dynamicDates) ? dynamicDates : [];

    const noBranches = branches.length === 0;
    const noInstructors = instructors.length === 0;
    const noDates = dates.length === 0;

    const canProceed =
        !noBranches &&
        !noInstructors &&
        !noDates &&
        !!selectedBranch &&
        !!selectedInstructor &&
        !!selectedSlot?.slotId &&
        status !== 'loading';

    if (!isOpen) return null;

    const selectedInstructorLabel =
        instructors.find((x) => x.id === selectedInstructor)?.label || '';

    const handleNext = () => {
        if (!canProceed) return;
        upsertEnrollSelection({
            courseId: course?._id || course?.id || null,
            courseName: course?.name || course?.title || null,
            branch: selectedBranch,
            instructorId: selectedInstructor, // store id
            instructorLabel: selectedInstructorLabel, // optional for UI
            slot: selectedSlot,
        });
        onNext?.({
            branch: selectedBranch,
            instructorId: selectedInstructor,
            instructorLabel: selectedInstructorLabel,
            slot: selectedSlot,
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 relative overflow-y-auto max-h-[90vh]">
                <button
                    onClick={onClose}
                    className="cursor-pointer absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl"
                    aria-label="Close"
                >
                    <HiX />
                </button>

                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold">Confirm Enrolment Details</h2>
                    <p className="text-gray-500 mt-1">
                        Select branch, instructor, and a suitable date & time slot before continuing.
                    </p>
                    <p className="text-sm text-gray-600 mt-1">Course: {courseTitle}</p>
                </div>

                <div className="mb-6">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                        <HiOutlineLocationMarker />
                        Select Branch
                    </label>
                    <select
                        value={selectedBranch}
                        onChange={(e) => {
                            const value = e.target.value;
                            setSelectedBranch(value);
                            setSelectedSlot(null);
                            upsertEnrollSelection({ branch: value });
                        }}
                        disabled={noBranches}
                        className={`w-full border rounded-lg px-4 py-2 bg-gray-50 focus:outline-none focus:ring-2 ${noBranches ? 'text-gray-400 bg-gray-100 cursor-not-allowed' : 'focus:ring-purple-300'
                            }`}
                    >
                        <option value="">{noBranches ? 'Not available' : 'Choose a branch'}</option>
                        {branches.map((branch, index) => (
                            <option key={index} value={branch}>
                                {branch}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="mb-6">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                        <HiUser />
                        Select Instructor
                    </label>
                    <select
                        value={selectedInstructor}
                        onChange={(e) => {
                            const id = e.target.value;
                            setSelectedInstructor(id);
                            upsertEnrollSelection({ instructorId: id });
                        }}
                        disabled={noInstructors}
                        className={`w-full border rounded-lg px-4 py-2 bg-gray-50 focus:outline-none focus:ring-2 ${noInstructors ? 'text-gray-400 bg-gray-100 cursor-not-allowed' : 'focus:ring-purple-300'
                            }`}
                    >
                        <option value="">{noInstructors ? 'Not available' : 'Choose an instructor'}</option>
                        {instructors.map((it) => (
                            <option key={it.id} value={it.id}>
                                {it.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="mb-6">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-4">
                        <HiOutlineCalendar />
                        Select Date & Time
                    </label>

                    {noDates ? (
                        <div className="text-sm text-gray-400 bg-gray-100 p-4 rounded-lg">Not available</div>
                    ) : (
                        <div className="space-y-4">
                            {dates.map((day, i) => (
                                <div key={i} className="border border-gray-200 rounded-xl p-4">
                                    <p className="font-semibold mb-3 text-gray-800">{day.day}</p>
                                    <div className="flex flex-wrap gap-3">
                                        {day.slots.map((slot, j) => {
                                            const value =
                                                typeof slot === 'string'
                                                    ? { slotId: null, label: `${day.day} | ${slot}` }
                                                    : slot;
                                            const active = selectedSlot?.slotId
                                                ? selectedSlot.slotId === value.slotId
                                                : selectedSlot?.label === value.label;
                                            const disabled = !value.slotId;

                                            return (
                                                <button
                                                    key={j}
                                                    type="button"
                                                    onClick={() => {
                                                        if (disabled) return;
                                                        setSelectedSlot(value);
                                                        upsertEnrollSelection({ slot: value });
                                                    }}
                                                    disabled={disabled}
                                                    className={`px-4 py-2 rounded-lg border text-sm transition ${disabled
                                                            ? 'text-gray-400 bg-gray-100 border-gray-200 cursor-not-allowed'
                                                            : active
                                                                ? 'bg-purple-100 border-purple-300 text-purple-700'
                                                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    {value.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                        {status === 'loading' ? 'Loading recent bookings…' : null}
                        {error ? (
                            <span className="text-red-500">
                                {typeof error === 'string' ? error : error?.message || 'Failed to load'}
                            </span>
                        ) : null}
                    </div>

                    <button
                        onClick={handleNext}
                        disabled={!canProceed}
                        className={`px-6 py-2 rounded-full font-medium transition ${!canProceed ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-purple-500 text-white hover:bg-purple-600'
                            }`}
                    >
                        Next
                    </button>
                </div>

                {Array.isArray(items) && items.length > 0 ? (
                    <div className="mt-6">
                        <p className="text-sm text-gray-600 mb-2">Recent bookings (for reference):</p>
                        <div className="max-h-40 overflow-auto border rounded-lg">
                            <ul className="divide-y">
                                {items
                                    .filter((b) => b.slotId?.slotType === 'enrolled' || b.enrollmentStatus === 'Enrolled')
                                    .slice(0, 5)
                                    .map((b) => (
                                        <li key={b._id} className="p-3 text-sm text-gray-700">
                                            <div className="flex justify-between">
                                                <span>{b.slotId?.date ? new Date(b.slotId.date).toDateString() : '—'}</span>
                                                <span className="text-gray-500">{b.enrollmentStatus || '—'}</span>
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {b.slotId?.startTime || '—'} - {b.slotId?.endTime || '—'} • {b.slotId?.location || '—'}
                                            </div>
                                        </li>
                                    ))}
                            </ul>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}

function capitalize(s) {
    if (!s || typeof s !== 'string') return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
}
