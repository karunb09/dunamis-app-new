'use client';

import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { HiOutlineLocationMarker, HiOutlineCalendar, HiX, HiUser, HiCheckCircle } from 'react-icons/hi';
import { createDemoBooking } from '@/store/demoBookingSlice';

export default function BookDemoModal({ isOpen, onClose, course }) {
  const dispatch = useDispatch();
  const { createStatus, error, message } = useSelector((s) => s.demoBooking || {});

  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedInstructor, setSelectedInstructor] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const dynamicBranches = useMemo(() => {
    const arr = course?.branches || [];
    const names = arr.map((b) => b?.branchName).filter(Boolean);
    return names.length ? names : null;
  }, [course]);

  const dynamicInstructors = useMemo(() => {
    const t = course?.teacher || [];
    const names = t
      .map((it) => {
        const f = it?.teacherDetail?.name?.firstName || '';
        const l = it?.teacherDetail?.name?.lastName || '';
        const full = `${f} ${l}`.trim();
        return full || null;
      })
      .filter(Boolean);
    return names.length ? names : null;
  }, [course]);

  const dynamicDates = useMemo(() => {
    const teachers = course?.teacher || [];
    const avail = teachers
      .filter((t) => Array.isArray(t.weeklyAvailability) && t.weeklyAvailability.length)
      .flatMap((t) => t.weeklyAvailability);

    const onlyDemo = avail.filter((s) => s.slotType === 'demo');
    if (!onlyDemo.length) return null;

    const byDay = new Map();

    const addSlot = (dayStr, start, end, id) => {
      const dayLabel = capitalize(dayStr);
      const time = start && end ? `${start} - ${end}` : 'Time TBD';
      if (!byDay.has(dayLabel)) byDay.set(dayLabel, []);
      byDay.get(dayLabel).push({ slotId: id || null, label: `${dayLabel} | ${time}` });
    };

    for (const s of onlyDemo) {
      if (s.day) addSlot(s.day, s.startTime, s.endTime, s._id);
      else if (Array.isArray(s.days) && s.days.length) {
        s.days.forEach((d) => addSlot(d, s.startTime, s.endTime, s._id));
      }
    }

    const out = [];
    for (const [day, slots] of byDay.entries()) {
      out.push({ day, slots });
    }

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

  const handleBook = async () => {
    if (!selectedBranch || !selectedInstructor || !selectedSlot) return;

    const courseId = course?._id || course?.id || null;
    const slotId = selectedSlot?.slotId || null;

    if (!courseId || !slotId) return;

    const res = await dispatch(createDemoBooking({ slotId, courseId }));
    if (res.meta.requestStatus === 'fulfilled') setIsConfirmed(true);
  };

  if (!isOpen) return null;

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

        {isConfirmed ? (
          <div className="text-center py-10">
            <HiCheckCircle className="text-green-300 mx-auto text-5xl mb-4" />
            <h2 className="text-2xl font-bold mb-2">Demo Booked Successfully!</h2>
            <p className="text-gray-500 mb-6">{message || 'Your demo session has been confirmed.'}</p>

            <div className="border rounded-lg border-orange-200 p-4 inline-block text-left bg-gray-50">
              <p><span className="font-semibold">Branch:</span> DUNAMIS Music Centre - {selectedBranch}</p>
              <p><span className="font-semibold">Instructor:</span> {selectedInstructor}</p>
              <p><span className="font-semibold">Date & Time:</span> {selectedSlot?.label || ''}</p>
            </div>

            <button
              onClick={onClose}
              className="mt-6 px-6 py-2 bg-green-300 hover:bg-green-400 text-white rounded-full font-medium transition"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold">Book Your Free Demo</h2>
              <p className="text-gray-500 mt-1">Choose a convenient branch, instructor, date and time slot for your free demo session</p>
            </div>

            <div className="mb-6">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                <HiOutlineLocationMarker />
                Select Branch
              </label>
              <select
                value={selectedBranch}
                onChange={(e) => {
                  setSelectedBranch(e.target.value);
                  setSelectedSlot(null);
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
                onChange={(e) => setSelectedInstructor(e.target.value)}
                disabled={noInstructors}
                className={`w-full border rounded-lg px-4 py-2 bg-gray-50 focus:outline-none focus:ring-2 ${noInstructors ? 'text-gray-400 bg-gray-100 cursor-not-allowed' : 'focus:ring-purple-300'
                  }`}
              >
                <option value="">{noInstructors ? 'Not available' : 'Choose an instructor'}</option>
                {instructors.map((name, index) => (
                  <option key={index} value={name}>
                    {name}
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
                <div className="text-sm text-gray-400 bg-gray-100 p-4 rounded-lg">
                  Not available
                </div>
              ) : (
                <div className="space-y-4">
                  {dates.map((day, i) => (
                    <div key={i} className="border border-gray-200 rounded-xl p-4">
                      <p className="font-semibold mb-3 text-gray-800">{day.day}</p>
                      <div className="flex flex-wrap gap-3">
                        {day.slots.map((slot, j) => {
                          const value = typeof slot === 'string' ? { slotId: null, label: `${day.day} | ${slot}` } : slot;
                          const isActive = selectedSlot?.slotId
                            ? selectedSlot.slotId === value.slotId
                            : selectedSlot?.label === value.label;
                          const disabled = !value.slotId;

                          return (
                            <button
                              key={j}
                              type="button"
                              onClick={() => !disabled && setSelectedSlot(value)}
                              disabled={disabled}
                              className={`px-4 py-2 rounded-lg border text-sm transition ${disabled
                                  ? 'text-gray-400 bg-gray-100 border-gray-200 cursor-not-allowed'
                                  : isActive
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

            <div className="text-center">
              <button
                disabled={
                  noBranches ||
                  noInstructors ||
                  noDates ||
                  !selectedBranch ||
                  !selectedInstructor ||
                  !selectedSlot?.slotId ||
                  createStatus === 'loading'
                }
                onClick={handleBook}
                className={`px-6 py-3 rounded-full font-medium transition ${noBranches ||
                    noInstructors ||
                    noDates ||
                    !selectedBranch ||
                    !selectedInstructor ||
                    !selectedSlot?.slotId ||
                    createStatus === 'loading'
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-purple-500 text-white hover:bg-purple-600'
                  }`}
              >
                {createStatus === 'loading' ? 'Booking…' : 'Book Demo Slot'}
              </button>
              {error ? (
                <p className="mt-3 text-sm text-red-500">
                  {typeof error === 'string' ? error : (error?.message || 'Something went wrong')}
                </p>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function capitalize(s) {
  if (!s || typeof s !== 'string') return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}
