'use client';

import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  HiOutlineLocationMarker,
  HiOutlineCalendar,
  HiX,
  HiUser,
  HiCheckCircle,
} from 'react-icons/hi';
import {
  getCoursePlaceholderImage,
  getInitialsImage,
  resolveImageUrl,
} from '@/lib/resolveImageUrl';
import {
  buildBranchOptions as buildSlotBranchOptions,
  buildInstructorOptions as buildSlotInstructorOptions,
  buildModeOptions as buildSlotModeOptions,
  filterSlotsForSelection as filterCourseSlots,
} from '@/helpers/courseSlots';

const API_BASE = process.env.NEXT_PUBLIC_BASE_URL || '';
const DRAFT_PREFIX = 'dunamis-demo-flow';

const isEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

const normalize = (value) =>
  String(value || '')
    .trim()
    .toLowerCase();

const toId = (value) => {
  if (!value && value !== 0) return '';
  if (typeof value === 'object') {
    return String(
      value._id || value.id || value.value || value.branchId || value.label || ''
    );
  }
  return String(value);
};

const safeParse = (value) => {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const storageKey = (courseId) => `${DRAFT_PREFIX}:${courseId || 'unknown'}`;

const readDraft = (courseId) => {
  if (typeof window === 'undefined') return null;
  return safeParse(window.sessionStorage.getItem(storageKey(courseId)));
};

const saveDraft = (courseId, value) => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(storageKey(courseId), JSON.stringify(value));
};

const clearDraft = (courseId) => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(storageKey(courseId));
};

const formatTime = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return 'Time TBD';
  if (raw === '24:00') return '12:00 AM';

  if (/\b(AM|PM)\b/i.test(raw)) {
    return raw.toUpperCase();
  }

  const clean = raw.replace(/\D/g, '');
  if (clean.length < 3) return raw;

  const hours = Number(clean.slice(0, clean.length - 2));
  const minutes = clean.slice(-2);

  if (Number.isNaN(hours)) return raw;

  const hour12 = ((hours + 11) % 12) + 1;
  const ampm = hours < 12 ? 'AM' : 'PM';
  return `${hour12}:${minutes} ${ampm}`;
};

export default function BookDemoModal({ isOpen, onClose, course }) {
  const { user, token } = useSelector((s) => s.auth || {});
  const courseId = toId(course?._id || course?.id);
  const courseTitle = course?.name || course?.title || 'Course';
  const courseImage = resolveImageUrl(
    course?.image,
    getCoursePlaceholderImage()
  );
  const [slotFeed, setSlotFeed] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState('');

  const branchOptions = useMemo(
    () => buildSlotBranchOptions(course, slotFeed),
    [course, slotFeed]
  );
  const instructors = useMemo(
    () => buildSlotInstructorOptions(course, slotFeed, 'demo'),
    [course, slotFeed]
  );
  const modeOptions = useMemo(
    () => buildSlotModeOptions(course, slotFeed),
    [course, slotFeed]
  );

  const defaultForm = useMemo(() => {
    const firstName =
      user?.name?.firstName || user?.name?.first_name || user?.firstName || '';
    const lastName =
      user?.name?.lastName || user?.name?.last_name || user?.lastName || '';

    return {
      firstName,
      lastName,
      phone:
        String(user?.mobileNo || user?.phone || user?.contact || '').trim(),
      email: String(user?.email || '').trim(),
      deliveryMode: modeOptions[0] || 'online',
      branchId: branchOptions[0]?.id || '',
      instructorId: '',
      slotId: '',
      notes: '',
    };
  }, [branchOptions, modeOptions, user]);

  const [step, setStep] = useState(0);
  const [form, setForm] = useState(defaultForm);
  const [phase, setPhase] = useState('editing');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const [videoPreview, setVideoPreview] = useState(null);

  const visibleInstructors = useMemo(() => {
    return instructors.filter(
      (instructor) =>
        filterCourseSlots(instructor.slots, {
          deliveryMode: form.deliveryMode,
          branchId: form.branchId,
        }).length > 0
    );
  }, [form.branchId, form.deliveryMode, instructors]);

  const selectedInstructor = useMemo(
    () =>
      visibleInstructors.find((item) => item.id === form.instructorId) || null,
    [form.instructorId, visibleInstructors]
  );

  const availableSlots = useMemo(() => {
    return filterCourseSlots(selectedInstructor?.slots || [], {
      deliveryMode: form.deliveryMode,
      branchId: form.branchId,
    });
  }, [form.branchId, form.deliveryMode, selectedInstructor]);

  const selectedSlot = useMemo(
    () => availableSlots.find((slot) => slot.id === form.slotId) || null,
    [availableSlots, form.slotId]
  );

  const steps = [
    'Student details',
    'Delivery mode',
    'Instructor',
    'Slots',
    'Review',
  ];

  useEffect(() => {
    if (!isOpen || !courseId) return;

    const saved = readDraft(courseId);
    if (saved) {
      setStep(Number(saved.step || 0));
      setForm((prev) => ({
        ...defaultForm,
        ...(saved.form || {}),
        firstName: String(saved.form?.firstName || defaultForm.firstName || ''),
        lastName: String(saved.form?.lastName || defaultForm.lastName || ''),
        phone: String(saved.form?.phone || defaultForm.phone || ''),
        email: String(saved.form?.email || defaultForm.email || ''),
      }));
      setPhase(saved.phase || 'editing');
      setMessage(saved.message || '');
      setError(saved.error || '');
      setSubmitted(saved.submitted || null);
      setHydrated(true);
      return;
    }

    setStep(0);
    setForm(defaultForm);
    setPhase('editing');
    setMessage('');
    setError('');
    setSubmitted(null);
    setHydrated(true);
  }, [courseId, defaultForm, isOpen]);

  useEffect(() => {
    if (!isOpen || !courseId) return;

    let ignore = false;

    const loadDemoSlots = async () => {
      setSlotsLoading(true);
      setSlotsError('');

      try {
        const response = await axios.get(`${API_BASE}/v1/slots/available`, {
          params: { courseId, slotType: 'demo' },
          withCredentials: true,
        });

        if (ignore) return;

        const nextSlots = Array.isArray(response.data?.slots)
          ? response.data.slots
          : Array.isArray(response.data?.data?.slots)
            ? response.data.data.slots
            : Array.isArray(response.data)
              ? response.data
              : Array.isArray(response.data?.data)
                ? response.data.data
                : [];

        setSlotFeed(nextSlots);
      } catch (slotError) {
        if (ignore) return;

        setSlotFeed([]);
        setSlotsError(
          slotError?.response?.data?.message ||
            slotError?.message ||
            'Failed to load demo slots.'
        );
      } finally {
        if (!ignore) {
          setSlotsLoading(false);
        }
      }
    };

    loadDemoSlots();

    return () => {
      ignore = true;
    };
  }, [courseId, isOpen]);

  useEffect(() => {
    if (!isOpen || !courseId || !hydrated) return;

    saveDraft(courseId, {
      step,
      phase,
      message,
      error,
      submitted,
      form,
      updatedAt: Date.now(),
    });
  }, [courseId, error, form, hydrated, isOpen, message, phase, step, submitted]);

  useEffect(() => {
    if (!form.instructorId) return;
    if (visibleInstructors.some((item) => item.id === form.instructorId)) return;
    setForm((prev) => ({ ...prev, instructorId: '', slotId: '' }));
  }, [form.instructorId, visibleInstructors]);

  useEffect(() => {
    if (!form.instructorId) return;
    if (!availableSlots.find((slot) => slot.id === form.slotId)) {
      setForm((prev) => ({ ...prev, slotId: '' }));
    }
  }, [availableSlots, form.instructorId, form.slotId]);

  useEffect(() => {
    if (form.deliveryMode !== 'offline' && form.branchId) {
      setForm((prev) => ({ ...prev, branchId: '' }));
    }
  }, [form.branchId, form.deliveryMode]);

  useEffect(() => {
    if (!isOpen) {
      setVideoPreview(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedBranch = branchOptions.find((item) => item.id === form.branchId);
  const deliveryIsOffline = normalize(form.deliveryMode) === 'offline';
  const courseModeLabel = modeOptions.length > 1 ? 'Choose a demo mode' : 'Demo mode';
  const canUseBranch = deliveryIsOffline && branchOptions.length > 0;
  const stepCount = steps.length;

  const updateForm = (patch) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const validateStep = (currentStep) => {
    if (currentStep === 0) {
      return (
        form.firstName.trim() &&
        form.lastName.trim() &&
        form.phone.trim() &&
        isEmail(form.email)
      );
    }

    if (currentStep === 1) {
      if (!form.deliveryMode) return false;
      if (canUseBranch) return Boolean(form.branchId);
      return true;
    }

    if (currentStep === 2) {
      return Boolean(form.instructorId);
    }

    if (currentStep === 3) {
      return Boolean(form.slotId);
    }

    return true;
  };

  const goNext = () => {
    if (step < stepCount - 1) {
      setStep((prev) => prev + 1);
    }
  };

  const resetFlow = () => {
    clearDraft(courseId);
    setStep(0);
    setForm(defaultForm);
    setPhase('editing');
    setMessage('');
    setError('');
    setSubmitted(null);
  };

  const submitDemoRequest = async () => {
    const payload = {
      courseId,
      teacherId: form.instructorId,
      slotId: form.slotId,
      deliveryMode: form.deliveryMode,
      ...(form.branchId ? { branchId: form.branchId } : {}),
      lead: {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim().toLowerCase(),
      },
      notes: form.notes.trim(),
    };

    setPhase('submitting');
    setError('');

    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.post(
        `${API_BASE}/v1/demoBookings/`,
        payload,
        {
          withCredentials: true,
          headers,
        }
      );

      const booking = response.data?.booking || response.data?.data?.booking || payload;
      setSubmitted(booking);
      setMessage(response.data?.message || 'Demo booking submitted successfully.');
      setPhase('confirmed');
      saveDraft(courseId, {
        step,
        phase: 'confirmed',
        message: response.data?.message || 'Demo booking submitted successfully.',
        submitted: booking,
        form,
        updatedAt: Date.now(),
      });
      return;
    } catch (remoteError) {
      setPhase('editing');
      setError(
        remoteError?.response?.data?.message ||
          remoteError?.response?.data?.error ||
          remoteError?.message ||
          'Failed to submit demo request.'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 cursor-pointer rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          aria-label="Close"
        >
          <HiX className="text-xl" />
        </button>

        <div className="grid gap-0 lg:grid-cols-[1.05fr_1.15fr]">
          <div className="relative overflow-hidden bg-gradient-to-br from-[#111827] via-[#1f2937] to-[#0f172a] p-6 text-white lg:p-8">
            <div className="absolute inset-0 opacity-25">
              <div className="absolute -left-8 top-0 h-40 w-40 rounded-full bg-orange-500 blur-3xl" />
              <div className="absolute bottom-0 right-0 h-52 w-52 rounded-full bg-teal-400 blur-3xl" />
            </div>

            <div className="relative">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-300">
                Demo booking
              </p>
              <h2 className="mt-3 text-3xl font-bold leading-tight">
                Book a demo without forcing sign in.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-6 text-white/80">
                We collect the learner details first, then narrow down mode,
                instructor, and real published demo slots. Progress stays saved
                locally while the student moves through the wizard.
              </p>

              <div className="mt-8 flex items-center gap-4 rounded-3xl bg-white/10 p-4 ring-1 ring-white/10">
                <img
                  src={courseImage}
                  alt={courseTitle}
                  className="h-20 w-20 rounded-2xl object-cover"
                  onError={(e) => {
                    e.currentTarget.src = getCoursePlaceholderImage();
                  }}
                />
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                    Selected course
                  </p>
                  <p className="mt-1 text-lg font-semibold">{courseTitle}</p>
                  <p className="text-sm text-white/70 capitalize">
                    {course?.mode || 'Course mode'} • {course?.level || 'All levels'}
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-3 text-sm text-white/80">
                <div className="flex items-center gap-3">
                  <HiCheckCircle className="text-emerald-300" />
                  <span>Guest-first demo entry</span>
                </div>
                <div className="flex items-center gap-3">
                  <HiCheckCircle className="text-emerald-300" />
                  <span>Instructor media and available slots</span>
                </div>
                <div className="flex items-center gap-3">
                  <HiCheckCircle className="text-emerald-300" />
                  <span>Progress is restored if the modal closes</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 lg:p-8">
            {phase === 'confirmed' ? (
              <div className="flex min-h-[520px] flex-col justify-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
                  <HiCheckCircle className="text-3xl" />
                </div>
                <h3 className="mt-5 text-center text-2xl font-bold text-gray-900">
                  Demo request captured
                </h3>
                <p className="mt-2 text-center text-sm leading-6 text-gray-600">
                  {message}
                </p>

                <div className="mt-6 rounded-3xl border border-gray-200 bg-gray-50 p-5">
                  <div className="flex items-center gap-4">
                    <img
                      src={courseImage}
                      alt={courseTitle}
                      className="h-16 w-16 rounded-2xl object-cover"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {courseTitle}
                      </p>
                      <p className="text-xs text-gray-500">Booking submitted</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-gray-700">
                    <p>
                      <span className="font-medium">Student:</span>{' '}
                      {form.firstName} {form.lastName}
                    </p>
                    <p>
                      <span className="font-medium">Email:</span> {form.email}
                    </p>
                    <p>
                      <span className="font-medium">Mode:</span>{' '}
                      <span className="capitalize">{form.deliveryMode || 'online'}</span>
                    </p>
                    {selectedBranch ? (
                      <p>
                        <span className="font-medium">Branch:</span> {selectedBranch.label}
                      </p>
                    ) : null}
                    <p>
                      <span className="font-medium">Instructor:</span>{' '}
                      {selectedInstructor?.name || 'Not selected'}
                    </p>
                    <p>
                      <span className="font-medium">Slot:</span>{' '}
                      {selectedSlot?.label || 'Not selected'}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={resetFlow}
                    className="rounded-2xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    Book another demo
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-2xl bg-[#FF6B35] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#fd5a1f]"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-500">
                      Step {step + 1} of {stepCount}
                    </p>
                    <h3 className="mt-2 text-2xl font-bold text-gray-900">
                      {steps[step]}
                    </h3>
                  </div>
                  <div className="hidden rounded-full bg-gray-100 px-4 py-2 text-xs font-medium text-gray-600 sm:block">
                    {courseModeLabel}
                  </div>
                </div>

                <div className="mt-4 h-2 w-full rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full bg-[#FF6B35] transition-all duration-300"
                    style={{ width: `${((step + 1) / stepCount) * 100}%` }}
                  />
                </div>

                {step === 0 ? (
                  <div className="mt-6 grid gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          First name
                        </label>
                        <input
                          type="text"
                          value={form.firstName}
                          onChange={(e) =>
                            updateForm({ firstName: e.target.value })
                          }
                          className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-orange-500"
                          placeholder="First name"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Last name
                        </label>
                        <input
                          type="text"
                          value={form.lastName}
                          onChange={(e) =>
                            updateForm({ lastName: e.target.value })
                          }
                          className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-orange-500"
                          placeholder="Last name"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Phone number
                        </label>
                        <input
                          type="tel"
                          value={form.phone}
                          onChange={(e) =>
                            updateForm({
                              phone: e.target.value.replace(/[^\d+]/g, ''),
                            })
                          }
                          className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-orange-500"
                          placeholder="+91 93982 46083"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Email address
                        </label>
                        <input
                          type="email"
                          value={form.email}
                          onChange={(e) =>
                            updateForm({ email: e.target.value })
                          }
                          className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-orange-500"
                          placeholder="you@example.com"
                        />
                      </div>
                    </div>

                    <div className="rounded-2xl bg-orange-50 p-4 text-sm text-gray-700">
                      If you are already signed in, we will reuse your saved
                      details. If not, this wizard will still capture the demo
                      request.
                    </div>
                  </div>
                ) : null}

                {step === 1 ? (
                  <div className="mt-6 space-y-5">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        {courseModeLabel}
                      </label>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {modeOptions.map((mode) => {
                          const isSelected = form.deliveryMode === mode;
                          return (
                            <button
                              key={mode}
                              type="button"
                              onClick={() =>
                                updateForm({
                                  deliveryMode: mode,
                                  instructorId: '',
                                  slotId: '',
                                  ...(mode !== 'offline' ? { branchId: '' } : {}),
                                })
                              }
                              className={`rounded-2xl border px-4 py-4 text-left transition ${
                                isSelected
                                  ? 'border-orange-500 bg-orange-50'
                                  : 'border-gray-200 hover:border-orange-200 hover:bg-gray-50'
                              }`}
                            >
                              <p className="font-semibold capitalize text-gray-900">
                                {mode}
                              </p>
                              <p className="mt-1 text-xs text-gray-500">
                                {mode === 'online'
                                  ? 'Attend the demo from anywhere.'
                                  : 'Choose a center for an in-person demo.'}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {canUseBranch ? (
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          <HiOutlineLocationMarker className="mr-1 inline" />
                          Select branch
                        </label>
                        <select
                          value={form.branchId}
                          onChange={(e) =>
                            updateForm({
                              branchId: e.target.value,
                              instructorId: '',
                              slotId: '',
                            })
                          }
                          className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-orange-500"
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
                  </div>
                ) : null}

                {step === 2 ? (
                  <div className="mt-6 space-y-4">
                    {slotsError ? (
                          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                            {slotsError}
                          </div>
                    ) : null}
                    {slotsLoading ? (
                      <div className="rounded-3xl border border-dashed border-gray-300 p-6 text-sm text-gray-500">
                        Loading instructors and demo slots...
                      </div>
                    ) : visibleInstructors.length > 0 ? (
                      visibleInstructors.map((instructor) => {
                            const isSelected = form.instructorId === instructor.id;
                        const hasVideo = Boolean(instructor.profileVideo);
                        return (
                          <div
                            key={instructor.id}
                            role="button"
                            tabIndex={0}
                            onClick={() =>
                              updateForm({
                                instructorId: instructor.id,
                                slotId: '',
                              })
                            }
                            onKeyDown={(event) => {
                              if (event.key !== 'Enter' && event.key !== ' ') return;
                              event.preventDefault();
                              updateForm({
                                instructorId: instructor.id,
                                slotId: '',
                              });
                            }}
                            className={`cursor-pointer rounded-3xl border p-4 transition ${
                              isSelected
                                ? 'border-orange-500 bg-orange-50'
                                : 'border-gray-200 bg-white hover:border-orange-200 hover:bg-orange-50/30'
                            }`}
                          >
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                              <img
                                src={instructor.profilePicture}
                                alt={instructor.name}
                                className="h-20 w-20 rounded-2xl object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = getInitialsImage(
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
                                        : 'Demo instructor'}
                                      {' • '}
                                      {instructor.studentCount || 0} students taught
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      updateForm({
                                        instructorId: instructor.id,
                                        slotId: '',
                                      });
                                    }}
                                    className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                                      isSelected
                                        ? 'bg-[#FF6B35] text-white'
                                        : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                                    }`}
                                  >
                                    {isSelected ? 'Selected' : 'Select instructor'}
                                  </button>
                                </div>

                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                  <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-200">
                                    {instructor.mode || 'online'}
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
                      })
                    ) : (
                      <div className="rounded-3xl border border-dashed border-gray-300 p-6 text-sm text-gray-500">
                        No instructors are available for this course yet.
                        {deliveryIsOffline && form.branchId
                          ? ' Try another branch or ask the branch admin to publish demo slots.'
                          : ''}
                      </div>
                    )}
                  </div>
                ) : null}

                {step === 3 ? (
                  <div className="mt-6 space-y-4">
                    {slotsError ? (
                      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                        {slotsError}
                      </div>
                    ) : null}
                    {!selectedInstructor ? (
                      <div className="rounded-3xl border border-dashed border-gray-300 p-6 text-sm text-gray-500">
                        Choose an instructor first, then we will show the
                        matching demo slots.
                      </div>
                    ) : slotsLoading ? (
                      <div className="rounded-3xl border border-dashed border-gray-300 p-6 text-sm text-gray-500">
                        Loading published demo slots...
                      </div>
                    ) : availableSlots.length > 0 ? (
                      availableSlots.map((slot) => {
                        const isSelected = form.slotId === slot.id;
                        return (
                          <button
                            key={slot.id}
                            type="button"
                            onClick={() => updateForm({ slotId: slot.id })}
                            className={`w-full rounded-3xl border px-4 py-4 text-left transition ${
                              isSelected
                                ? 'border-orange-500 bg-orange-50'
                                : 'border-gray-200 hover:border-orange-200 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-gray-900">
                                  {slot.label}
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                  {slot.branchLabel
                                    ? `Branch: ${slot.branchLabel}`
                                    : 'Online demo'}
                                </p>
                              </div>
                              <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-200">
                                {slot.sessionType}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="rounded-3xl border border-dashed border-gray-300 p-6 text-sm text-gray-500">
                        No demo slots are currently published for this
                        instructor and mode. Try another instructor or switch
                        the delivery mode.
                      </div>
                    )}
                  </div>
                ) : null}

                {step === 4 ? (
                  <div className="mt-6 space-y-4">
                    <div className="rounded-3xl border border-gray-200 bg-gray-50 p-5">
                      <p className="text-sm font-semibold text-gray-900">
                        Review your demo request
                      </p>
                      <div className="mt-4 space-y-2 text-sm text-gray-700">
                        <p>
                          <span className="font-medium">Student:</span>{' '}
                          {form.firstName} {form.lastName}
                        </p>
                        <p>
                          <span className="font-medium">Phone:</span> {form.phone}
                        </p>
                        <p>
                          <span className="font-medium">Email:</span> {form.email}
                        </p>
                        <p>
                          <span className="font-medium">Mode:</span>{' '}
                          <span className="capitalize">{form.deliveryMode}</span>
                        </p>
                        {selectedBranch ? (
                          <p>
                            <span className="font-medium">Branch:</span>{' '}
                            {selectedBranch.label}
                          </p>
                        ) : null}
                        <p>
                          <span className="font-medium">Instructor:</span>{' '}
                          {selectedInstructor?.name || 'Not selected'}
                        </p>
                        <p>
                          <span className="font-medium">Slot:</span>{' '}
                          {selectedSlot?.label || 'Not selected'}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-3xl bg-orange-50 p-4 text-sm text-gray-700">
                      Once the request is submitted, the booking stays tied to
                      the selected instructor and published slot. The backend
                      can then trigger the student and instructor notifications.
                    </div>
                  </div>
                ) : null}

                <div className="mt-7 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (step === 0) {
                        onClose?.();
                        return;
                      }
                      setStep((prev) => prev - 1);
                    }}
                    className="rounded-2xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    {step === 0 ? 'Close' : 'Back'}
                  </button>

                  {phase === 'editing' || phase === 'submitting' ? (
                    <button
                      type="button"
                      disabled={!validateStep(step) || phase === 'submitting'}
                      onClick={() => {
                        if (step < stepCount - 1) {
                          if (validateStep(step)) goNext();
                          return;
                        }
                        submitDemoRequest();
                      }}
                      className={`rounded-2xl px-6 py-3 text-sm font-semibold text-white transition ${
                        !validateStep(step) || phase === 'submitting'
                          ? 'cursor-not-allowed bg-gray-300'
                          : 'bg-[#FF6B35] hover:bg-[#fd5a1f]'
                      }`}
                    >
                      {phase === 'submitting'
                        ? 'Submitting...'
                        : step === stepCount - 1
                          ? 'Submit demo request'
                          : 'Continue'}
                    </button>
                  ) : null}
                </div>

                {error ? (
                  <p className="mt-4 text-sm text-red-500">{error}</p>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>

      {videoPreview ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setVideoPreview(null)}
        >
          <div
            className="relative w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl"
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
