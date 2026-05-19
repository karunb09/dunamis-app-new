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
import { getInitialsImage } from '@/lib/resolveImageUrl';
import {
  buildBranchOptions,
  buildInstructorOptions,
  buildModeOptions,
  filterSlotsForSelection,
  normalizeCityName,
  normalizeEntityId,
  normalizeMode,
} from '@/helpers/courseSlots';

const DAY_PAIR_OPTIONS = [
  { id: 'mon-thu', label: 'Mon - Thu', days: ['monday', 'thursday'] },
  { id: 'tue-fri', label: 'Tue - Fri', days: ['tuesday', 'friday'] },
  { id: 'wed-sat', label: 'Wed - Sat', days: ['wednesday', 'saturday'] },
  { id: 'sat-sun', label: 'Sat - Sun', days: ['saturday', 'sunday'] },
];

const STEPS = ['Delivery', 'Instructor', 'Schedule'];

const hasPositivePrice = (price) => {
  const monthly = Number(price?.monthlyFee);
  const full = Number(price?.fullPayment);
  return (
    (Number.isFinite(monthly) && monthly > 0) ||
    (Number.isFinite(full) && full > 0)
  );
};

const getPricedSessionTypes = (course) => {
  const prices = Array.isArray(course?.price)
    ? course.price
    : course?.price
      ? [course.price]
      : [];

  return new Set(
    prices
      .filter((price) => price?.isActive !== false && hasPositivePrice(price))
      .map((price) => price?.sessionType)
      .filter(Boolean)
  );
};

const normalizeDays = (days = []) =>
  (Array.isArray(days) ? days : [])
    .map((day) => String(day || '').trim().toLowerCase())
    .filter(Boolean);

const getWeekdayFromDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date
    .toLocaleDateString('en-US', { weekday: 'long' })
    .toLowerCase();
};

const getPairForDays = (days = []) => {
  const normalizedDays = normalizeDays(days).sort();
  if (!normalizedDays.length) return null;

  return (
    DAY_PAIR_OPTIONS.find((option) => {
      const normalizedPair = option.days.slice().sort();
      return (
        normalizedPair.length === normalizedDays.length &&
        normalizedPair.every((day, index) => day === normalizedDays[index])
      );
    }) || null
  );
};

const getPairForSlot = (slot) => {
  const sourceDays =
    normalizeDays(slot?.availabilityDays).length > 0
      ? normalizeDays(slot.availabilityDays)
      : normalizeDays(slot?.recurringDays).length > 0
        ? normalizeDays(slot.recurringDays)
        : normalizeDays(slot?.raw?.availabilityDays).length > 0
          ? normalizeDays(slot.raw.availabilityDays)
          : normalizeDays(slot?.raw?.recurringDays);

  const exactPair = getPairForDays(sourceDays);
  if (exactPair) return exactPair;

  const dateDay = getWeekdayFromDate(slot?.date);
  return (
    DAY_PAIR_OPTIONS.find((option) => option.days.includes(dateDay)) ||
    DAY_PAIR_OPTIONS[0]
  );
};

const normalizeKey = (value) => String(value || '').trim().toLowerCase();

const groupSlotsByDayPair = (slots = []) => {
  const groups = new Map(
    DAY_PAIR_OPTIONS.map((option) => [
      option.id,
      { ...option, slots: [] },
    ])
  );

  slots.forEach((slot) => {
    const pair = getPairForSlot(slot);
    const group = groups.get(pair.id);
    if (group) {
      group.slots.push(slot);
    }
  });

  return Array.from(groups.values()).filter((group) => group.slots.length > 0);
};

export default function EnrollTerm({
  isOpen,
  onClose,
  course,
  onNext,
  preferredInstructorId = '',
}) {
  const dispatch = useDispatch();
  const {
    availableSlots = [],
    slotsStatus = 'idle',
    slotsError = null,
  } = useSelector((state) => state.demoBooking || {});

  const courseId = course?._id || course?.id || null;
  const normalizedPreferredInstructorId = normalizeEntityId(preferredInstructorId);
  const courseTitle = course?.name || course?.title || 'Course';
  const modeOptions = useMemo(
    () => buildModeOptions(course, availableSlots),
    [availableSlots, course]
  );
  const branchOptions = useMemo(
    () => buildBranchOptions(course, availableSlots),
    [availableSlots, course]
  );
  const enrollmentModeOptions = useMemo(() => {
    const modeSet = new Set(modeOptions);
    const hasOnlineSlots = availableSlots.some((slot) => !slot?.branchId);

    if (hasOnlineSlots || normalizeMode(course?.mode) === 'online') {
      modeSet.add('online');
    }

    if (branchOptions.length > 0) {
      modeSet.add('offline');
    }

    return Array.from(modeSet);
  }, [availableSlots, branchOptions.length, course?.mode, modeOptions]);
  const instructors = useMemo(
    () => buildInstructorOptions(course, availableSlots, 'enrolled'),
    [availableSlots, course]
  );
  const pricedSessionTypes = useMemo(() => getPricedSessionTypes(course), [course]);
  const shouldLimitByPricing = pricedSessionTypes.size > 0;

  const [step, setStep] = useState(0);
  const [selectedDeliveryMode, setSelectedDeliveryMode] = useState('online');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedInstructorId, setSelectedInstructorId] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [videoPreview, setVideoPreview] = useState(null);
  const [appliedPreferredInstructorId, setAppliedPreferredInstructorId] =
    useState('');
  const [selectedBranchCity, setSelectedBranchCity] = useState('all');

  const branchCityOptions = useMemo(() => {
    const cityMap = new Map();

    branchOptions.forEach((branch) => {
      const label = normalizeCityName(branch.city);
      const id = normalizeKey(label);
      if (!id || cityMap.has(id)) return;
      cityMap.set(id, { id, label });
    });

    return Array.from(cityMap.values()).sort((a, b) =>
      a.label.localeCompare(b.label)
    );
  }, [branchOptions]);

  const filteredBranchOptions = useMemo(() => {
    if (!branchCityOptions.length || selectedBranchCity === 'all') {
      return branchOptions;
    }

    return branchOptions.filter(
      (branch) => normalizeKey(normalizeCityName(branch.city)) === selectedBranchCity
    );
  }, [branchCityOptions.length, branchOptions, selectedBranchCity]);

  useEffect(() => {
    if (!isOpen || !courseId) return;
    dispatch(fetchAvailableSlots({ courseId, slotType: 'enrolled' }));
  }, [courseId, dispatch, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const current = getCurrentSelection() || {};
    const initialMode =
      normalizeMode(current.deliveryMode) ||
      enrollmentModeOptions[0] ||
      normalizeMode(course?.mode) ||
      'online';

    setStep(0);
    setSelectedDeliveryMode(initialMode);
    setSelectedBranchId(current.branchId || '');
    setSelectedInstructorId(current.instructorId || '');
    setSelectedSlotId(current.slot?.slotId || current.slot?.id || '');
    setVideoPreview(null);
    setAppliedPreferredInstructorId('');
  }, [course?.mode, enrollmentModeOptions, isOpen]);

  useEffect(() => {
    if (!isOpen || !normalizedPreferredInstructorId) return;
    if (slotsStatus === 'loading') return;
    if (appliedPreferredInstructorId === normalizedPreferredInstructorId) return;

    const preferredInstructor = instructors.find(
      (instructor) => instructor.id === normalizedPreferredInstructorId
    );

    setAppliedPreferredInstructorId(normalizedPreferredInstructorId);

    if (!preferredInstructor) return;

    const preferredSlot = preferredInstructor.slots?.[0] || null;
    const preferredMode =
      normalizeMode(
        preferredSlot?.deliveryMode ||
          preferredInstructor.mode ||
          modeOptions[0] ||
          selectedDeliveryMode ||
          course?.mode ||
          'online'
      ) || 'online';

    setSelectedDeliveryMode(preferredMode);
    setSelectedBranchId(
      preferredMode === 'offline'
        ? normalizeEntityId(preferredSlot?.branchId) || branchOptions[0]?.id || ''
        : ''
    );
    setSelectedInstructorId(preferredInstructor.id);
    setSelectedSlotId('');
  }, [
    appliedPreferredInstructorId,
    branchOptions,
    course?.mode,
    instructors,
    isOpen,
    modeOptions,
    normalizedPreferredInstructorId,
    selectedDeliveryMode,
    slotsStatus,
  ]);

  useEffect(() => {
    if (selectedDeliveryMode === 'offline') return;
    if (!selectedBranchId) return;
    setSelectedBranchId('');
  }, [selectedBranchId, selectedDeliveryMode]);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedBranchCity('all');
  }, [isOpen]);

  useEffect(() => {
    if (!branchCityOptions.length) {
      setSelectedBranchCity('all');
      return;
    }

    if (selectedBranchCity === 'all') return;

    if (!branchCityOptions.some((city) => city.id === selectedBranchCity)) {
      setSelectedBranchCity('all');
    }
  }, [branchCityOptions, selectedBranchCity]);

  useEffect(() => {
    if (selectedDeliveryMode !== 'offline') return;
    if (!selectedBranchId) return;
    if (filteredBranchOptions.some((branch) => branch.id === selectedBranchId)) return;
    setSelectedBranchId('');
    setSelectedInstructorId('');
    setSelectedSlotId('');
  }, [filteredBranchOptions, selectedBranchId, selectedDeliveryMode]);

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

  const filterPricedSlots = (slots = []) =>
    slots.filter(
      (slot) =>
        !shouldLimitByPricing ||
        pricedSessionTypes.has(slot.sessionType || 'standard')
    );

  const getVisibleSlotsForInstructor = (instructor) =>
    filterPricedSlots(
      filterSlotsForSelection(instructor?.slots || [], {
        deliveryMode: selectedDeliveryMode,
        branchId: selectedBranchId,
      })
    );

  const visibleInstructors = useMemo(
    () =>
      instructors.filter(
        (instructor) => getVisibleSlotsForInstructor(instructor).length > 0
      ),
    [
      instructors,
      pricedSessionTypes,
      selectedBranchId,
      selectedDeliveryMode,
      shouldLimitByPricing,
    ]
  );

  const selectedInstructor = useMemo(
    () =>
      visibleInstructors.find(
        (instructor) => instructor.id === selectedInstructorId
      ) || null,
    [selectedInstructorId, visibleInstructors]
  );

  const visibleSlots = useMemo(
    () => getVisibleSlotsForInstructor(selectedInstructor),
    [
      pricedSessionTypes,
      selectedBranchId,
      selectedDeliveryMode,
      selectedInstructor,
      shouldLimitByPricing,
    ]
  );

  const slotGroups = useMemo(() => groupSlotsByDayPair(visibleSlots), [visibleSlots]);

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
  const slotsErrorMessage =
    typeof slotsError === 'string'
      ? slotsError
      : slotsError?.message || slotsError?.error || '';
  const canContinue =
    step === 0
      ? Boolean(selectedDeliveryMode) && (!shouldPickBranch || Boolean(selectedBranchId))
      : step === 1
        ? Boolean(selectedInstructorId) && slotsStatus !== 'loading'
        : Boolean(selectedSlot?.slotId) && slotsStatus !== 'loading';

  const persistSelectionAndContinue = () => {
    if (!selectedSlot) return;

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

  const handlePrimaryAction = () => {
    if (!canContinue) return;

    if (step < STEPS.length - 1) {
      setStep((currentStep) => currentStep + 1);
      return;
    }

    persistSelectionAndContinue();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="relative my-auto max-h-[calc(100vh-2rem)] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-4 shadow-2xl sm:p-6 lg:p-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 cursor-pointer rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          aria-label="Close"
        >
          <HiX className="text-xl" />
        </button>

        <div className="pr-10">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-500">
            Enrollment setup
          </p>
          <h2 className="mt-2 text-2xl font-bold text-gray-900">
            Choose your instructor and class schedule
          </h2>
          <p className="mt-1 text-sm text-gray-500">Course: {courseTitle}</p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {STEPS.map((label, index) => {
            const active = step === index;
            const completed = step > index;

            return (
              <button
                key={label}
                type="button"
                disabled={index > step}
                onClick={() => setStep(index)}
                className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                  active
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : completed
                      ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                      : 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400'
                }`}
              >
                <p className="font-semibold">{label}</p>
              </button>
            );
          })}
        </div>

        {step === 0 ? (
          <div className="mt-7 space-y-6">
            {enrollmentModeOptions.length > 1 ? (
              <div>
                <label className="mb-3 block text-sm font-medium text-gray-700">
                  Select Delivery Mode
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {enrollmentModeOptions.map((mode) => {
                    const active = selectedDeliveryMode === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => {
                          setSelectedDeliveryMode(mode);
                          setSelectedInstructorId('');
                          setSelectedSlotId('');
                          if (mode !== 'offline') setSelectedBranchId('');
                        }}
                        className={`rounded-2xl border px-4 py-4 text-left transition ${
                          active
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-gray-200 hover:border-orange-200 hover:bg-gray-50'
                        }`}
                      >
                        <p className="font-semibold capitalize text-gray-900">
                          {mode}
                        </p>
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
              <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm text-orange-700">
                Delivery mode:{' '}
                <span className="font-semibold capitalize">
                  {selectedDeliveryMode}
                </span>
              </div>
            )}

            {shouldPickBranch ? (
              <div>
                {branchCityOptions.length > 0 ? (
                  <div className="mb-4">
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Filter by city
                    </label>
                    <select
                      value={selectedBranchCity}
                      onChange={(event) => {
                        setSelectedBranchCity(event.target.value);
                        setSelectedBranchId('');
                        setSelectedInstructorId('');
                        setSelectedSlotId('');
                      }}
                      className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-orange-500"
                    >
                      <option value="all">All cities</option>
                      {branchCityOptions.map((city) => (
                        <option key={city.id} value={city.id}>
                          {city.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                  <HiOutlineLocationMarker />
                  Select Branch
                </label>
                <select
                  value={selectedBranchId}
                  onChange={(event) => {
                    setSelectedBranchId(event.target.value);
                    setSelectedInstructorId('');
                    setSelectedSlotId('');
                  }}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-orange-500"
                >
                  <option value="">Choose a branch</option>
                  {filteredBranchOptions.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.city ? `${branch.label} - ${branch.city}` : branch.label}
                    </option>
                  ))}
                </select>
                {filteredBranchOptions.length === 0 ? (
                  <p className="mt-2 text-xs text-gray-500">
                    No branches found for this city. Choose another city to continue.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 1 ? (
          <div className="mt-7 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <HiUser />
                Select Instructor
              </label>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                {visibleInstructors.length} available
              </span>
            </div>

            {slotsStatus === 'loading' ? (
              <div className="rounded-3xl border border-dashed border-gray-300 p-6 text-sm text-gray-500">
                Loading instructors and class slots...
              </div>
            ) : visibleInstructors.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {visibleInstructors.map((instructor) => {
                  const isSelected = selectedInstructorId === instructor.id;
                  const hasVideo = Boolean(instructor.profileVideo);

                  return (
                    <div
                      key={instructor.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setSelectedInstructorId(instructor.id);
                        setSelectedSlotId('');
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter' && event.key !== ' ') return;
                        event.preventDefault();
                        setSelectedInstructorId(instructor.id);
                        setSelectedSlotId('');
                      }}
                      className={`cursor-pointer rounded-3xl border p-4 transition ${
                        isSelected
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 bg-white hover:border-orange-200 hover:bg-orange-50/30'
                      }`}
                    >
                      <div className="flex gap-4">
                        <img
                          src={instructor.profilePicture}
                          alt={instructor.name}
                          className="h-20 w-20 rounded-2xl object-cover object-top"
                          onError={(event) => {
                            event.currentTarget.src = getInitialsImage(
                              instructor.name
                            );
                          }}
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-lg font-semibold text-gray-900">
                                {instructor.name}
                              </p>
                              <p className="text-sm text-gray-500">
                                {instructor.averageRating
                                  ? `${instructor.averageRating.toFixed(1)} rating`
                                  : 'Course instructor'}
                                {' • '}
                                {instructor.studentCount || 0} students taught
                              </p>
                            </div>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                isSelected
                                  ? 'bg-orange-500 text-white'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {isSelected ? 'Selected' : 'Select'}
                            </span>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium capitalize text-gray-600 ring-1 ring-gray-200">
                              {instructor.mode || selectedDeliveryMode}
                            </span>
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-200">
                              {getVisibleSlotsForInstructor(instructor).length} slots
                            </span>
                            {hasVideo ? (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setVideoPreview({
                                    url: instructor.profileVideo,
                                    title: `${instructor.name} demo video`,
                                  });
                                }}
                                className="rounded-full bg-gray-900 px-3 py-1 text-xs font-medium text-white transition hover:bg-gray-700"
                              >
                                Watch demo video
                              </button>
                            ) : (
                              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">
                                Demo video not uploaded yet
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-gray-300 p-6 text-sm text-gray-500">
                No instructors are currently available for this course and
                delivery mode.
              </div>
            )}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="mt-7 space-y-5">
            <div>
              <label className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-700">
                <HiOutlineCalendar />
                Select Class Schedule
              </label>
              <p className="text-xs text-gray-500">
                Showing the day pairs published by {selectedInstructor?.name || 'the selected instructor'}.
              </p>
            </div>

            {slotsStatus === 'loading' ? (
              <div className="rounded-3xl border border-dashed border-gray-300 p-6 text-sm text-gray-500">
                Loading available class slots...
              </div>
            ) : selectedInstructorId && slotGroups.length > 0 ? (
              <div className="space-y-5">
                {slotGroups.map((group) => (
                  <section
                    key={group.id}
                    className="rounded-3xl border border-gray-200 bg-gray-50 p-4"
                  >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900">{group.label}</p>
                        <p className="text-xs text-gray-500">
                          {group.slots.length} available class slot
                          {group.slots.length === 1 ? '' : 's'}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-200">
                        Day pair
                      </span>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      {group.slots.map((slot) => {
                        const active = selectedSlotId === slot.id;
                        return (
                          <button
                            key={slot.id}
                            type="button"
                            onClick={() => setSelectedSlotId(slot.id)}
                            className={`rounded-2xl border p-4 text-left transition ${
                              active
                                ? 'border-orange-500 bg-orange-50'
                                : 'border-gray-200 bg-white hover:border-orange-200 hover:bg-orange-50/30'
                            }`}
                          >
                            <p className="font-semibold text-gray-900">
                              {slot.label}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {slot.branchLabel
                                ? `Branch: ${slot.branchLabel}`
                                : 'Online class'}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="rounded-full bg-white px-3 py-1 text-xs font-medium capitalize text-gray-600 ring-1 ring-gray-200">
                                {slot.sessionType === 'premium'
                                  ? 'Individual'
                                  : 'Group'}
                              </span>
                              {slot.bookingTag ? (
                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                    slot.bookingTag === 'Filling fast'
                                      ? 'bg-amber-100 text-amber-700'
                                      : 'bg-emerald-100 text-emerald-700'
                                  }`}
                                >
                                  {slot.bookingTag}
                                </span>
                              ) : null}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-gray-300 p-6 text-sm text-gray-500">
                {selectedInstructorId
                  ? 'No class slots are currently available for this instructor and delivery mode.'
                  : 'Choose an instructor first to view available slots.'}
              </div>
            )}
          </div>
        ) : null}

        {slotsErrorMessage ? (
          <p className="mt-5 text-sm text-red-500">{slotsErrorMessage}</p>
        ) : null}

        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              if (step === 0) {
                onClose?.();
                return;
              }
              setStep((currentStep) => currentStep - 1);
            }}
            className="rounded-2xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            {step === 0 ? 'Close' : 'Back'}
          </button>

          <button
            type="button"
            onClick={handlePrimaryAction}
            disabled={!canContinue}
            className={`rounded-2xl px-6 py-3 text-sm font-semibold text-white transition ${
              canContinue
                ? 'bg-[#FF6B35] hover:bg-[#fd5a1f]'
                : 'cursor-not-allowed bg-gray-300'
            }`}
          >
            {step === STEPS.length - 1 ? 'Continue to plans' : 'Continue'}
          </button>
        </div>
      </div>

      {videoPreview ? (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/70 p-3 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setVideoPreview(null)}
        >
          <div
            className="relative my-auto w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setVideoPreview(null)}
              className="absolute right-4 top-4 z-10 rounded-full bg-black/60 p-2 text-white transition hover:bg-black"
              aria-label="Close video preview"
            >
              <HiX className="text-xl" />
            </button>

            <div className="bg-black">
              <video
                key={videoPreview.url}
                src={videoPreview.url}
                controls
                autoPlay
                playsInline
                preload="metadata"
                className="aspect-video w-full bg-black"
              >
                Your browser cannot preview this video format.
              </video>
            </div>

            <div className="space-y-2 p-5">
              <p className="text-sm font-semibold text-gray-900">
                {videoPreview.title}
              </p>
              <p className="text-xs leading-5 text-gray-500">
                If the video does not play inline, upload the instructor demo as
                an MP4/WebM file encoded for browser playback.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
