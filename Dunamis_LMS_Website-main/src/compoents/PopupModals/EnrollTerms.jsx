'use client';

import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  HiOutlineLocationMarker,
  HiOutlineCalendar,
  HiUser,
  HiX,
} from 'react-icons/hi';
import { fetchAvailableSlots } from '@/store/demoBookingSlice';
import { getCurrentSelection, upsertEnrollSelection } from '@/helpers/session';
import {
  buildBranchOptions,
  buildInstructorOptions,
  buildModeOptions,
  filterSlotsForSelection,
  normalizeMode,
} from '@/helpers/courseSlots';

export default function EnrollTerm({ isOpen, onClose, course, onNext }) {
  const dispatch = useDispatch();
  const {
    availableSlots = [],
    slotsStatus = 'idle',
    slotsError = null,
  } = useSelector((state) => state.demoBooking || {});

  const courseId = course?._id || course?.id || null;
  const courseTitle = course?.name || course?.title || 'Course';
  const modeOptions = useMemo(
    () => buildModeOptions(course, availableSlots),
    [availableSlots, course]
  );
  const branchOptions = useMemo(
    () => buildBranchOptions(course, availableSlots),
    [availableSlots, course]
  );
  const instructors = useMemo(
    () => buildInstructorOptions(course, availableSlots, 'enrolled'),
    [availableSlots, course]
  );

  const [selectedDeliveryMode, setSelectedDeliveryMode] = useState('online');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedInstructorId, setSelectedInstructorId] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState('');

  useEffect(() => {
    if (!isOpen || !courseId) return;
    dispatch(fetchAvailableSlots({ courseId, slotType: 'enrolled' }));
  }, [courseId, dispatch, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const current = getCurrentSelection() || {};
    const initialMode =
      normalizeMode(current.deliveryMode) ||
      modeOptions[0] ||
      normalizeMode(course?.mode) ||
      'online';

    setSelectedDeliveryMode(initialMode);
    setSelectedBranchId(current.branchId || '');
    setSelectedInstructorId(current.instructorId || '');
    setSelectedSlotId(current.slot?.slotId || current.slot?.id || '');
  }, [course?.mode, isOpen, modeOptions]);

  useEffect(() => {
    if (selectedDeliveryMode === 'offline') return;
    if (!selectedBranchId) return;
    setSelectedBranchId('');
  }, [selectedBranchId, selectedDeliveryMode]);

  useEffect(() => {
    if (selectedBranchId) return;

    const current = getCurrentSelection() || {};
    if (!current.branchLabel || !branchOptions.length) return;

    const matchedBranch = branchOptions.find(
      (branch) => branch.label === current.branchLabel
    );

    if (matchedBranch) {
      setSelectedBranchId(matchedBranch.id);
    }
  }, [branchOptions, selectedBranchId]);

  const visibleInstructors = useMemo(() => {
    return instructors.filter((instructor) =>
      filterSlotsForSelection(instructor.slots, {
        deliveryMode: selectedDeliveryMode,
        branchId: selectedBranchId,
      }).length > 0
    );
  }, [instructors, selectedBranchId, selectedDeliveryMode]);

  const selectedInstructor = useMemo(
    () =>
      visibleInstructors.find(
        (instructor) => instructor.id === selectedInstructorId
      ) ||
      instructors.find((instructor) => instructor.id === selectedInstructorId) ||
      null,
    [instructors, selectedInstructorId, visibleInstructors]
  );

  const visibleSlots = useMemo(
    () =>
      filterSlotsForSelection(selectedInstructor?.slots || [], {
        deliveryMode: selectedDeliveryMode,
        branchId: selectedBranchId,
      }),
    [selectedBranchId, selectedDeliveryMode, selectedInstructor]
  );

  const selectedSlot = useMemo(
    () => visibleSlots.find((slot) => slot.id === selectedSlotId) || null,
    [selectedSlotId, visibleSlots]
  );

  useEffect(() => {
    if (!selectedInstructorId) return;
    if (
      visibleInstructors.some((instructor) => instructor.id === selectedInstructorId)
    ) {
      return;
    }

    setSelectedInstructorId('');
    setSelectedSlotId('');
  }, [selectedInstructorId, visibleInstructors]);

  useEffect(() => {
    if (!selectedSlotId) return;
    if (visibleSlots.some((slot) => slot.id === selectedSlotId)) return;
    setSelectedSlotId('');
  }, [selectedSlotId, visibleSlots]);

  if (!isOpen) return null;

  const selectedBranch =
    branchOptions.find((branch) => branch.id === selectedBranchId) || null;
  const shouldPickBranch =
    selectedDeliveryMode === 'offline' && branchOptions.length > 0;
  const canProceed =
    Boolean(selectedInstructorId) &&
    Boolean(selectedSlot?.slotId) &&
    (!shouldPickBranch || Boolean(selectedBranchId)) &&
    slotsStatus !== 'loading';
  const slotsErrorMessage =
    typeof slotsError === 'string'
      ? slotsError
      : slotsError?.message || slotsError?.error || '';

  const handleNext = () => {
    if (!canProceed) return;

    upsertEnrollSelection({
      courseId,
      courseName: courseTitle,
      deliveryMode: selectedDeliveryMode || null,
      branchId: selectedBranch?.id || null,
      branchLabel: selectedBranch?.label || null,
      branch: selectedBranch?.label || null,
      instructorId: selectedInstructor?.id || null,
      instructorLabel: selectedInstructor?.name || null,
      slot: selectedSlot,
      sessionType: selectedSlot?.sessionType || null,
      slotType: selectedSlot?.slotType || null,
    });

    onNext?.({
      branchId: selectedBranch?.id || null,
      branchLabel: selectedBranch?.label || null,
      branch: selectedBranch?.label || null,
      instructorId: selectedInstructor?.id || null,
      instructorLabel: selectedInstructor?.name || null,
      slot: selectedSlot,
      sessionType: selectedSlot?.sessionType || null,
      deliveryMode: selectedDeliveryMode || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 cursor-pointer text-xl text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          <HiX />
        </button>

        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold">Confirm Enrolment Details</h2>
          <p className="mt-1 text-gray-500">
            Choose delivery mode, instructor, and your preferred class slot.
          </p>
          <p className="mt-1 text-sm text-gray-600">Course: {courseTitle}</p>
        </div>

        {modeOptions.length > 1 ? (
          <div className="mb-6">
            <label className="mb-3 block text-sm font-medium text-gray-700">
              Select Delivery Mode
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              {modeOptions.map((mode) => {
                const active = selectedDeliveryMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setSelectedDeliveryMode(mode);
                      setSelectedSlotId('');
                    }}
                    className={`rounded-xl border px-4 py-3 text-left transition ${
                      active
                        ? 'border-purple-300 bg-purple-50 text-purple-700'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <p className="font-semibold capitalize">{mode}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {mode === 'offline'
                        ? 'Attend at the selected branch.'
                        : 'Attend the session online.'}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mb-6 rounded-xl border border-purple-100 bg-purple-50 px-4 py-3 text-sm text-purple-700">
            Delivery mode: <span className="font-semibold capitalize">{selectedDeliveryMode}</span>
          </div>
        )}

        {shouldPickBranch ? (
          <div className="mb-6">
            <label className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-700">
              <HiOutlineLocationMarker />
              Select Branch
            </label>
            <select
              value={selectedBranchId}
              onChange={(event) => {
                setSelectedBranchId(event.target.value);
                setSelectedSlotId('');
              }}
              className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-300"
            >
              <option value="">Choose a branch</option>
              {branchOptions.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="mb-6">
          <label className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-700">
            <HiUser />
            Select Instructor
          </label>
          <select
            value={selectedInstructorId}
            onChange={(event) => {
              setSelectedInstructorId(event.target.value);
              setSelectedSlotId('');
            }}
            disabled={slotsStatus === 'loading' || visibleInstructors.length === 0}
            className={`w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 ${
              slotsStatus === 'loading' || visibleInstructors.length === 0
                ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                : 'bg-gray-50 focus:ring-purple-300'
            }`}
          >
            <option value="">
              {slotsStatus === 'loading'
                ? 'Loading instructors...'
                : visibleInstructors.length === 0
                  ? 'No instructors available'
                  : 'Choose an instructor'}
            </option>
            {visibleInstructors.map((instructor) => (
              <option key={instructor.id} value={instructor.id}>
                {instructor.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <label className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-700">
            <HiOutlineCalendar />
            Select Date & Time
          </label>

          {slotsStatus === 'loading' ? (
            <div className="rounded-lg bg-gray-100 p-4 text-sm text-gray-500">
              Loading available class slots...
            </div>
          ) : selectedInstructorId && visibleSlots.length > 0 ? (
            <div className="space-y-3">
              {visibleSlots.map((slot) => {
                const active = selectedSlotId === slot.id;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setSelectedSlotId(slot.id)}
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      active
                        ? 'border-purple-300 bg-purple-50 text-purple-700'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <p className="font-semibold">{slot.label}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {slot.branchLabel
                        ? `Branch: ${slot.branchLabel}`
                        : 'Online class'}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Session: {slot.sessionType || 'standard'}
                    </p>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg bg-gray-100 p-4 text-sm text-gray-500">
              {selectedInstructorId
                ? 'No slots are currently available for this instructor and delivery mode.'
                : 'Choose an instructor first to view available slots.'}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {slotsErrorMessage ? (
              <span className="text-red-500">{slotsErrorMessage}</span>
            ) : null}
          </div>

          <button
            onClick={handleNext}
            disabled={!canProceed}
            className={`rounded-full px-6 py-2 font-medium transition ${
              !canProceed
                ? 'cursor-not-allowed bg-gray-200 text-gray-500'
                : 'bg-purple-500 text-white hover:bg-purple-600'
            }`}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
