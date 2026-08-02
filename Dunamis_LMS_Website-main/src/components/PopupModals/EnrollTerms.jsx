'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { useModalA11y } from '@/hooks/useModalA11y';
import {
  HiOutlineLocationMarker,
  HiOutlineCalendar,
  HiUser,
  HiX,
  HiUsers,
  HiClock,
  HiCheckCircle,
} from 'react-icons/hi';
import { FaUser } from 'react-icons/fa';
import { fetchAvailableSlots } from '@/store/demoBookingSlice';
import { getCurrentSelection, upsertEnrollSelection } from '@/helpers/session';
import { getInitialsImage } from '@/lib/resolveImageUrl';
import {
  buildBranchOptions,
  buildInstructorOptions,
  buildModeOptions,
  filterSlotsForSelection,
  formatTimeLabel,
  normalizeCityName,
  normalizeEntityId,
  normalizeMode,
} from '@/helpers/courseSlots';
import { getActiveTenurePlans, pickDefaultTenure, findTenure } from '@/helpers/tenurePlans';
import StepNav from './EnrollTermsParts/StepNav';
import StepDelivery from './EnrollTermsParts/StepDelivery';
import StepInstructor from './EnrollTermsParts/StepInstructor';

const DAY_PAIR_OPTIONS = [
  { id: 'mon-thu', label: 'Mon - Thu', days: ['monday', 'thursday'] },
  { id: 'tue-fri', label: 'Tue - Fri', days: ['tuesday', 'friday'] },
  { id: 'wed-sat', label: 'Wed - Sat', days: ['wednesday', 'saturday'] },
  { id: 'sat-sun', label: 'Sat - Sun', days: ['saturday', 'sunday'] },
];

const DAY_NAME_TO_INDEX = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

const getNextStartDate = (days = []) => {
  if (!days.length) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIndex = today.getDay();

  let minOffset = 7;
  for (const day of days) {
    const idx = DAY_NAME_TO_INDEX[String(day).toLowerCase()];
    if (idx === undefined) continue;
    const offset = (idx - todayIndex + 7) % 7;
    if (offset < minOffset) minOffset = offset;
  }

  if (minOffset === 7) return null;
  const next = new Date(today);
  next.setDate(today.getDate() + minOffset);
  return next;
};

const STEPS = ['Delivery', 'Instructor', 'Schedule', 'Session type', 'Plan'];

const hasPositivePrice = (price) => {
  const monthly = Number(price?.monthlyFee);
  const full = Number(price?.fullPayment);
  return (
    (Number.isFinite(monthly) && monthly > 0) ||
    (Number.isFinite(full) && full > 0)
  );
};

const toMoney = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return `₹${amount.toLocaleString('en-IN')}`;
};

const computeMrpAndSavings = (fullPayment, discountPct) => {
  const full = Number(fullPayment) || 0;
  const pct = Number(discountPct) || 0;
  if (!full || !pct) return { mrp: null, savings: null };
  const mrp = Math.round(full / (1 - pct / 100));
  return { mrp, savings: mrp - full };
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
  preferredInstructorId = '',
}) {
  const router = useRouter();
  const dispatch = useDispatch();
  const {
    availableSlots = [],
    slotsStatus = 'idle',
    slotsError = null,
  } = useSelector((state) => state.demoBooking || {});

  const courseId = course?._id || course?.id || null;
  const normalizedPreferredInstructorId = normalizeEntityId(preferredInstructorId);
  const courseTitle = course?.name || course?.title || 'Course';
  // Only "fixed" courses run between a start and end date; "running" courses
  // bill until the student cancels, so a fixed duration must not be claimed.
  const isFixedDurationCourse = course?.courseType === 'fixed';
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
  const panelRef = useRef(null);
  useModalA11y(isOpen, onClose, panelRef);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const [step, setStep] = useState(0);
  const [selectedDeliveryMode, setSelectedDeliveryMode] = useState('online');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedInstructorId, setSelectedInstructorId] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [videoPreview, setVideoPreview] = useState(null);

  useEffect(() => {
    if (!videoPreview) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setVideoPreview(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [videoPreview]);
  const [appliedPreferredInstructorId, setAppliedPreferredInstructorId] =
    useState('');
  const [selectedBranchCity, setSelectedBranchCity] = useState('all');
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [selectedSessionType, setSelectedSessionType] = useState('');
  const [selectedPlanType, setSelectedPlanType] = useState('');
  const [selectedMonths, setSelectedMonths] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);

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

  // Price memos
  const prices = useMemo(() => {
    const source = Array.isArray(course?.price)
      ? course.price
      : course?.price
        ? [course.price]
        : [];
    return source.map((item) => ({
      id: item?._id || item?.id || '',
      sessionType: item?.sessionType || '',
      monthlyFee: item?.monthlyFee,
      fullPayment: item?.fullPayment,
      discount: item?.discount ?? 0,
      isActive: item?.isActive ?? true,
      tenurePlans: Array.isArray(item?.tenurePlans) ? item.tenurePlans : [],
      installments: item?.installments ?? null,
    }));
  }, [course]);

  const groupPrice = useMemo(() => {
    const items = prices.filter(
      (p) => p.isActive !== false && p.sessionType === 'standard' && hasPositivePrice(p)
    );
    return items[0] || null;
  }, [prices]);

  const premiumPrice = useMemo(() => {
    const items = prices.filter(
      (p) => p.isActive !== false && p.sessionType === 'premium' && hasPositivePrice(p)
    );
    return items[0] || null;
  }, [prices]);

  const activePriceObj = useMemo(
    () => (selectedSessionType === 'premium' ? premiumPrice : (groupPrice || premiumPrice)),
    [selectedSessionType, premiumPrice, groupPrice]
  );

  const tenurePlans = useMemo(
    () => getActiveTenurePlans(activePriceObj),
    [activePriceObj]
  );

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
    setSelectedSessionType('');
    setSelectedPlanType('');
    setSelectedMonths(null);
    setVideoPreview(null);
    setAppliedPreferredInstructorId('');
    setIsNavigating(false);
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
    setSelectedBranchId('');
  }, [selectedDeliveryMode]);

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

  // Auto-select the group containing the active slot, or the first group.
  useEffect(() => {
    if (slotGroups.length === 0) {
      setSelectedGroupId(null);
      return;
    }
    const groupWithSelection = selectedSlotId
      ? slotGroups.find((g) => g.slots.some((s) => s.id === selectedSlotId))
      : null;
    setSelectedGroupId((prev) => {
      if (prev && slotGroups.some((g) => g.id === prev)) return prev;
      return groupWithSelection?.id ?? slotGroups[0].id;
    });
  }, [slotGroups]);

  // Auto-select the first slot in the active group (slot selection is not user-driven).
  useEffect(() => {
    if (!selectedGroupId) return;
    const group = slotGroups.find((g) => g.id === selectedGroupId);
    if (!group?.slots.length) return;
    if (group.slots.some((s) => s.id === selectedSlotId)) return;
    setSelectedSlotId(group.slots[0].id || '');
  }, [selectedGroupId, slotGroups, selectedSlotId]);

  // Reset session/plan choice when user navigates back before step 3.
  useEffect(() => {
    if (step < 3) {
      setSelectedSessionType('');
      setSelectedPlanType('');
    }
  }, [step]);

  if (!isOpen) return null;

  const selectedBranch =
    branchOptions.find((branch) => branch.id === selectedBranchId) || null;
  const shouldPickBranch =
    selectedDeliveryMode === 'offline' && branchOptions.length > 0;
  const slotsErrorMessage =
    typeof slotsError === 'string'
      ? slotsError
      : slotsError?.message || slotsError?.error || '';

  const slotSessionType = selectedSlot?.sessionType || null;
  const canChooseStandard =
    Boolean(groupPrice) && (!slotSessionType || slotSessionType === 'standard');
  const canChoosePremium =
    Boolean(premiumPrice) && (!slotSessionType || slotSessionType === 'premium');

  const activeTenure =
    findTenure(tenurePlans, selectedMonths) || pickDefaultTenure(tenurePlans);
  const planMonthlyFee =
    activeTenure?.monthlyFee || Number(activePriceObj?.monthlyFee) || null;
  const planFullFee =
    activeTenure?.fullPayment || Number(activePriceObj?.fullPayment) || null;
  const planDiscountPct = activeTenure
    ? Number(activeTenure.discount) || 0
    : Number(activePriceObj?.discount) || 0;
  const planDurationMonths =
    activeTenure?.months ||
    (Number(activePriceObj?.installments) > 1
      ? Number(activePriceObj?.installments)
      : null);

  // Plan cards shown directly in step 4 — no separate duration-selection step.
  const primaryTenure =
    tenurePlans.length > 0 ? pickDefaultTenure(tenurePlans) || tenurePlans[0] : null;
  const monthlyCardMonths = primaryTenure?.months ?? null;
  const monthlyCardFee =
    primaryTenure?.monthlyFee || Number(activePriceObj?.monthlyFee) || null;
  const fullPaymentCards =
    tenurePlans.length > 0
      ? tenurePlans
      : [
          {
            months: null,
            fullPayment: Number(activePriceObj?.fullPayment) || 0,
            discount: Number(activePriceObj?.discount) || 0,
          },
        ];

  const canContinue =
    step === 0
      ? Boolean(selectedDeliveryMode) && (!shouldPickBranch || Boolean(selectedBranchId))
      : step === 1
        ? Boolean(selectedInstructorId) && slotsStatus !== 'loading'
        : step === 2
          ? Boolean(selectedSlotId) && slotsStatus !== 'loading'
          : step === 3
            ? Boolean(selectedSessionType)
            : Boolean(selectedPlanType);

  const persistAllAndGoToPayment = () => {
    setIsNavigating(true);
    const courseCategory =
      typeof course?.category === 'string'
        ? course.category
        : course?.category?.name || '';

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
      sessionType: selectedSessionType,
      planType: selectedPlanType,
      planMonths: planDurationMonths,
      priceId: activePriceObj?.id || null,
      code: course?.code || '',
      category: courseCategory,
      courseType: course?.courseType || null,
      courseEndDate: course?.endDate || null,
      courseImage: course?.image || '',
      monthlyFee: planMonthlyFee,
      fullPayment: planFullFee,
      discount: planDiscountPct,
      duration: planDurationMonths ? `${planDurationMonths} months` : '',
    });

    router.push('/payment-confirmation');
    onClose?.();
  };

  const handlePrimaryAction = () => {
    if (!canContinue) return;
    if (step === STEPS.length - 1) {
      persistAllAndGoToPayment();
      return;
    }
    setStep((currentStep) => currentStep + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="enroll-terms-heading"
        tabIndex={-1}
        className="relative my-auto max-h-[calc(100vh-2rem)] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-4 shadow-2xl outline-none sm:p-6 lg:p-8">
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
          <h2 id="enroll-terms-heading" className="mt-2 text-2xl font-bold text-gray-900">
            Choose your instructor and class schedule
          </h2>
          <p className="mt-1 text-sm text-gray-500">Course: {courseTitle}</p>
        </div>

        <StepNav steps={STEPS} step={step} setStep={setStep} />

        {step === 0 ? (
          <StepDelivery
            enrollmentModeOptions={enrollmentModeOptions}
            selectedDeliveryMode={selectedDeliveryMode}
            setSelectedDeliveryMode={setSelectedDeliveryMode}
            setSelectedInstructorId={setSelectedInstructorId}
            setSelectedSlotId={setSelectedSlotId}
            setSelectedBranchId={setSelectedBranchId}
            shouldPickBranch={shouldPickBranch}
            branchCityOptions={branchCityOptions}
            selectedBranchCity={selectedBranchCity}
            setSelectedBranchCity={setSelectedBranchCity}
            filteredBranchOptions={filteredBranchOptions}
            selectedBranchId={selectedBranchId}
          />
        ) : null}

        {step === 1 ? (
          <StepInstructor
            visibleInstructors={visibleInstructors}
            slotsStatus={slotsStatus}
            selectedInstructorId={selectedInstructorId}
            setSelectedInstructorId={setSelectedInstructorId}
            setSelectedSlotId={setSelectedSlotId}
            selectedDeliveryMode={selectedDeliveryMode}
            setVideoPreview={setVideoPreview}
            getVisibleSlotsForInstructor={getVisibleSlotsForInstructor}
          />
        ) : null}

        {step === 2 ? (
          <div className="mt-7 space-y-5">
            <div>
              <label className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-700">
                <HiOutlineCalendar />
                Select Class Schedule
              </label>
              <p className="text-xs text-gray-500">
                Choose when your classes run — we&apos;ll show you the exact start date automatically.
              </p>
            </div>

            {slotsStatus === 'loading' ? (
              <div className="rounded-3xl border border-dashed border-gray-300 p-6 text-sm text-gray-500">
                Loading available class slots...
              </div>
            ) : selectedInstructorId && slotGroups.length > 0 ? (
              <>
                {/* Day pair selector */}
                <div className="flex flex-wrap gap-2">
                  {slotGroups.map((group) => {
                    const isActive = selectedGroupId === group.id;
                    const hasSelectedSlot = group.slots.some((s) => s.id === selectedSlotId);
                    return (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => {
                          setSelectedGroupId(group.id);
                          setSelectedSlotId('');
                        }}
                        className={`rounded-2xl border px-5 py-3 text-sm font-semibold transition ${
                          isActive
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : hasSelectedSlot
                              ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-orange-200 hover:bg-orange-50/30'
                        }`}
                      >
                        {group.label}
                      </button>
                    );
                  })}
                </div>

                {/* Start date banner */}
                {(() => {
                  const activeGroup = slotGroups.find((g) => g.id === selectedGroupId);
                  const startDate = activeGroup ? getNextStartDate(activeGroup.days) : null;
                  if (!startDate) return null;
                  return (
                    <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                      <HiOutlineCalendar className="shrink-0 text-emerald-600" />
                      <span>
                        <span className="font-semibold">Classes start: </span>
                        {startDate.toLocaleDateString('en-IN', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  );
                })()}

                {/* Class time slots — selectable when multiple exist */}
                {(() => {
                  const activeGroup = slotGroups.find((g) => g.id === selectedGroupId);
                  if (!activeGroup) return null;
                  const seenTimes = new Set();
                  const uniqueSlots = activeGroup.slots.filter((slot) => {
                    const key = `${String(slot.startTime || '').trim().toLowerCase()}|${String(slot.endTime || '').trim().toLowerCase()}`;
                    if (seenTimes.has(key)) return false;
                    seenTimes.add(key);
                    return true;
                  });
                  const multipleSlots = uniqueSlots.length > 1;
                  return (
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                      <p className="mb-3 text-sm font-medium text-gray-700">
                        {multipleSlots
                          ? `Select a time — ${activeGroup.label}`
                          : `Class time — ${activeGroup.label}`}
                      </p>
                      <div className="space-y-2">
                        {uniqueSlots.map((slot) => {
                          const isSelected = selectedSlotId === slot.id;
                          const timeLabel =
                            slot.startTime && slot.endTime
                              ? `${formatTimeLabel(slot.startTime)} – ${formatTimeLabel(slot.endTime)}`
                              : slot.label;
                          return (
                            <button
                              key={slot.id}
                              type="button"
                              onClick={() => setSelectedSlotId(slot.id)}
                              className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                                isSelected
                                  ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-300'
                                  : multipleSlots
                                    ? 'border-gray-200 bg-white hover:border-orange-200 hover:bg-orange-50/30'
                                    : 'border-gray-200 bg-white cursor-default'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">{timeLabel}</p>
                                  <p className="mt-0.5 text-xs text-gray-500">
                                    {slot.branchLabel ? `Branch: ${slot.branchLabel}` : 'Online class'}
                                  </p>
                                </div>
                                <div className="flex shrink-0 flex-wrap items-center gap-2">
                                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium capitalize text-gray-600">
                                    {slot.sessionType === 'premium' ? 'Individual' : 'Group'}
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
                                  {isSelected ? (
                                    <HiCheckCircle className="text-lg text-orange-500" />
                                  ) : null}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </>
            ) : (
              <div className="rounded-3xl border border-dashed border-gray-300 p-6 text-sm text-gray-500">
                {selectedInstructorId
                  ? 'No class slots are currently available for this instructor and delivery mode.'
                  : 'Choose an instructor first to view available slots.'}
              </div>
            )}
          </div>
        ) : null}

        {step === 3 ? (
          <div className="mt-7 space-y-4">
            <p className="text-sm text-gray-500">
              Select the type of session that best fits your learning preferences.
            </p>

            {!canChooseStandard && !canChoosePremium ? (
              <div className="rounded-3xl border border-dashed border-gray-300 p-6 text-sm text-gray-500">
                No pricing is configured for this course yet. Please contact support.
              </div>
            ) : null}

            {canChooseStandard ? (
              <div
                role="button"
                tabIndex={0}
                onClick={() => setSelectedSessionType('standard')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedSessionType('standard'); } }}
                className={`cursor-pointer rounded-3xl border p-5 transition ${
                  selectedSessionType === 'standard'
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-orange-200 hover:bg-orange-50/30'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-gray-900">Group sessions</p>
                    <p className="mt-0.5 text-sm text-gray-500">Learn together with peers</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">
                      Popular
                    </span>
                    {selectedSessionType === 'standard' ? (
                      <HiCheckCircle className="text-xl text-orange-500" />
                    ) : null}
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-sm text-gray-700">
                  <p className="text-2xl font-bold text-gray-900">
                    {toMoney(groupPrice?.monthlyFee) || toMoney(groupPrice?.fullPayment) || '—'}
                    <span className="ml-1 text-sm font-medium text-gray-500">/month</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <HiUsers className="shrink-0 text-gray-500" />
                    <span>Small group · interactive sessions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <HiClock className="shrink-0 text-gray-500" />
                    <span>
                      {selectedSlot?.startTime && selectedSlot?.endTime
                        ? `${formatTimeLabel(selectedSlot.startTime)} – ${formatTimeLabel(selectedSlot.endTime)}`
                        : 'Your selected schedule'}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}

            {canChoosePremium ? (
              <div
                role="button"
                tabIndex={0}
                onClick={() => setSelectedSessionType('premium')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedSessionType('premium'); } }}
                className={`cursor-pointer rounded-3xl border p-5 transition ${
                  selectedSessionType === 'premium'
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 border-green-200 hover:border-orange-200 hover:bg-orange-50/30'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-gray-900">Individual sessions</p>
                    <p className="mt-0.5 text-sm text-gray-500">1-on-1 personalized learning</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                      Personalized
                    </span>
                    {selectedSessionType === 'premium' ? (
                      <HiCheckCircle className="text-xl text-orange-500" />
                    ) : null}
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-sm text-gray-700">
                  <p className="text-2xl font-bold text-gray-900">
                    {toMoney(premiumPrice?.monthlyFee) || toMoney(premiumPrice?.fullPayment) || '—'}
                    <span className="ml-1 text-sm font-medium text-gray-500">/month</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <FaUser className="shrink-0 text-gray-500" />
                    <span>One-on-one · customized pace</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <HiClock className="shrink-0 text-gray-500" />
                    <span>
                      {selectedSlot?.startTime && selectedSlot?.endTime
                        ? `${formatTimeLabel(selectedSlot.startTime)} – ${formatTimeLabel(selectedSlot.endTime)}`
                        : 'Your selected schedule'}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 4 ? (
          <div className="mt-7 space-y-5">
            <p className="text-sm text-gray-500">
              {selectedSessionType === 'premium' ? 'Individual (1:1)' : 'Group'} sessions •{' '}
              {courseTitle}
            </p>

            <div className="grid gap-4 sm:grid-cols-3">
              {/* Monthly card — tied to the primary (6-month, or first active) tenure */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  setSelectedMonths(monthlyCardMonths);
                  setSelectedPlanType('monthly');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedMonths(monthlyCardMonths);
                    setSelectedPlanType('monthly');
                  }
                }}
                className={`cursor-pointer rounded-3xl border p-5 transition ${
                  selectedPlanType === 'monthly' && selectedMonths === monthlyCardMonths
                    ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200'
                    : 'border-gray-200 hover:border-orange-200 hover:bg-orange-50/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-lg font-semibold text-gray-900">Monthly</p>
                  {selectedPlanType === 'monthly' && selectedMonths === monthlyCardMonths ? (
                    <HiCheckCircle className="text-xl text-orange-500" />
                  ) : null}
                </div>
                <span className="mt-1 inline-block rounded-full bg-purple-100 px-3 py-0.5 text-xs font-medium text-purple-700">
                  Flexible
                </span>
                <p className="mt-3 text-2xl font-bold text-gray-900">
                  {toMoney(monthlyCardFee) || '—'}
                  <span className="ml-1 text-sm font-medium text-gray-500">/month</span>
                </p>
                {isFixedDurationCourse && monthlyCardMonths ? (
                  <p className="mt-2 text-sm text-gray-600">
                    Paid over {monthlyCardMonths} months
                  </p>
                ) : null}
              </div>

              {/* One full-payment card per active tenure plan (dynamic — falls back to legacy fields) */}
              {fullPaymentCards.map((plan) => {
                const isSelected =
                  selectedPlanType === 'full' && selectedMonths === plan.months;
                const isPrimary =
                  tenurePlans.length > 0 &&
                  primaryTenure &&
                  plan.months === primaryTenure.months;
                const { mrp, savings } = computeMrpAndSavings(plan.fullPayment, plan.discount);
                return (
                  <div
                    key={plan.months ?? 'full'}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setSelectedMonths(plan.months);
                      setSelectedPlanType('full');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedMonths(plan.months);
                        setSelectedPlanType('full');
                      }
                    }}
                    className={`relative cursor-pointer rounded-3xl border p-5 transition ${
                      isSelected
                        ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200'
                        : 'border-gray-200 hover:border-orange-200 hover:bg-orange-50/30'
                    }`}
                  >
                    {isPrimary ? (
                      <span className="absolute -top-2.5 left-4 rounded-full bg-[#CC3700] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                        Best Value
                      </span>
                    ) : null}
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-lg font-semibold text-gray-900">
                        {plan.months ? `${plan.months}-Month` : 'Full course'}
                      </p>
                      <div className="flex items-center gap-2">
                        {plan.discount ? (
                          <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                            Save {plan.discount}%
                          </span>
                        ) : null}
                        {isSelected ? <HiCheckCircle className="text-xl text-orange-500" /> : null}
                      </div>
                    </div>
                    <span className="mt-1 inline-block rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-medium text-emerald-700">
                      One-time
                    </span>
                    <p className="mt-3 text-2xl font-bold text-gray-900">
                      {toMoney(plan.fullPayment) || '—'}
                    </p>
                    {mrp ? (
                      <p className="mt-0.5 text-sm text-gray-400 line-through">{toMoney(mrp)}</p>
                    ) : null}
                    {savings ? (
                      <p className="text-sm font-medium text-green-600">Save {toMoney(savings)}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {slotsErrorMessage ? (
          <p role="alert" className="mt-5 text-sm text-red-500">{slotsErrorMessage}</p>
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
            disabled={!canContinue || isNavigating}
            className={`inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold text-white transition ${
              canContinue && !isNavigating
                ? 'bg-[#CC3700] hover:bg-[#B83100]'
                : 'cursor-not-allowed bg-gray-300'
            }`}
          >
            {isNavigating ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Redirecting…
              </>
            ) : step === STEPS.length - 1 ? (
              'Proceed to payment'
            ) : (
              'Continue'
            )}
          </button>
        </div>
      </div>

      {videoPreview ? (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/70 p-3 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setVideoPreview(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={videoPreview.title || 'Instructor video preview'}
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
