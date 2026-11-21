'use client';

import axios from 'axios';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { HiCheckCircle } from 'react-icons/hi';
import { useModalA11y } from '@/hooks/useModalA11y';
import { useHistoryStep } from '@/hooks/useHistoryStep';
import { useDemoFunnel } from '@/hooks/useDemoFunnel';
import { getCoursePlaceholderImage, resolveImageUrl } from '@/lib/resolveImageUrl';
import {
  buildBranchOptions,
  buildInstructorOptions,
  buildModeOptions,
  filterSlotsForSelection,
  normalizeEntityId,
  normalizeMode,
} from '@/helpers/courseSlots';
import { API_BASE } from '@/lib/apiBase';
import CallbackRequestModal from './CallbackRequestModal';
import DemoSheet from './BookDemoParts/DemoSheet';
import StepPickSlot from './BookDemoParts/StepPickSlot';
import StepDetails, {
  DETAILS_FORM_ID,
  leadPhone,
  validateDetails,
} from './BookDemoParts/StepDetails';
import DemoConfirmation from './BookDemoParts/DemoConfirmation';
import InstructorVideoOverlay from './BookDemoParts/InstructorVideoOverlay';
import { durationMinutes, groupByDay, slotLabel, upcomingSlots } from './BookDemoParts/demoTimes';

const draftKey = (courseId) => `dunamis-demo-flow:v2:${courseId}`;

const readDraft = (courseId) => {
  try {
    return JSON.parse(window.sessionStorage.getItem(draftKey(courseId)) || 'null');
  } catch {
    return null;
  }
};

const saveDraft = (courseId, value) => {
  try {
    window.sessionStorage.setItem(draftKey(courseId), JSON.stringify(value));
  } catch {}
};

const clearDraft = (courseId) => {
  try {
    window.sessionStorage.removeItem(draftKey(courseId));
  } catch {}
};

const EMPTY_CHOICE = { deliveryMode: '', branchId: '', instructorId: '', slotId: '' };

const contactFromUser = (user) => ({
  name: [user?.name?.firstName, user?.name?.lastName].filter(Boolean).join(' '),
  phone: user?.mobileNo ? String(user.mobileNo) : '',
  phoneIntl: false,
  email: user?.email || '',
});

const leadFrom = (contact) => {
  const [firstName = '', ...rest] = contact.name.trim().split(/\s+/);
  return {
    firstName,
    lastName: rest.join(' '),
    phone: leadPhone(contact),
    email: contact.email.trim().toLowerCase(),
  };
};

const firstName = (name) => String(name || '').trim().split(/\s+/)[0] || 'your teacher';

const bySoonest = (a, b) =>
  a.placeSlots[0].dayKey.localeCompare(b.placeSlots[0].dayKey) ||
  a.placeSlots[0].startMinutes - b.placeSlots[0].startMinutes;

const teachersFor = (teachers, { deliveryMode, branchId }) =>
  teachers
    .map((teacher) => ({
      ...teacher,
      placeSlots: filterSlotsForSelection(teacher.upcoming, { deliveryMode, branchId }),
    }))
    .filter((teacher) => teacher.placeSlots.length > 0)
    .sort(bySoonest);

const sameChoice = (a, b) =>
  a.deliveryMode === b.deliveryMode &&
  a.branchId === b.branchId &&
  a.instructorId === b.instructorId &&
  a.slotId === b.slotId;

// Fills in every answer that has only one possible value and clears any answer
// the latest slot list no longer supports.
const reconcileChoice = (prev, { modes, branches, teachers, preferred }) => {
  let next = { ...prev };

  const preferredTeacher = preferred && teachers.find((teacher) => teacher.id === preferred);
  if (preferredTeacher) {
    const first = preferredTeacher.upcoming[0];
    next = {
      deliveryMode: first.deliveryMode,
      branchId: first.deliveryMode === 'offline' ? first.branchId : '',
      instructorId: preferredTeacher.id,
      slotId: prev.instructorId === preferredTeacher.id ? prev.slotId : '',
    };
  }

  const bookableModes = modes.filter((mode) => mode.hasSlots).map((mode) => mode.mode);
  if (!bookableModes.includes(next.deliveryMode)) {
    next = { ...EMPTY_CHOICE, deliveryMode: bookableModes.length === 1 ? bookableModes[0] : '' };
  }

  if (next.deliveryMode === 'offline') {
    const open = branches.filter((branch) => branch.hasSlots).map((branch) => branch.id);
    if (!open.includes(next.branchId)) {
      next = { ...next, branchId: open.length === 1 ? open[0] : '', instructorId: '', slotId: '' };
    }
  } else if (next.branchId) {
    next = { ...next, branchId: '' };
  }

  const placeChosen = next.deliveryMode && (next.deliveryMode !== 'offline' || next.branchId);
  const visible = placeChosen ? teachersFor(teachers, next) : [];
  if (!visible.some((teacher) => teacher.id === next.instructorId)) {
    next = { ...next, instructorId: visible.length === 1 ? visible[0].id : '', slotId: '' };
  }

  const teacher = visible.find((item) => item.id === next.instructorId);
  if (next.slotId && !teacher?.placeSlots.some((slot) => slot.id === next.slotId)) {
    next = { ...next, slotId: '' };
  }

  return sameChoice(prev, next) ? prev : next;
};

export default function BookDemoModal({
  isOpen,
  onClose,
  course,
  preferredInstructorId = '',
  onSuccess,
  source = 'course_page',
  onBack,
  historyBase = 0,
}) {
  const { user } = useSelector((state) => state.auth || {});
  const courseId = normalizeEntityId(course?._id || course?.id);
  const courseTitle = course?.name || course?.title || 'Course';
  const preferredId = normalizeEntityId(preferredInstructorId);

  const accountContact = useMemo(() => contactFromUser(user), [user]);
  const accountContactRef = useRef(accountContact);
  accountContactRef.current = accountContact;
  const [needsDetails, setNeedsDetails] = useState(false);
  // A signed-in student skips the details screen: the server reads their name,
  // phone and email from the account. The website session never carries the
  // phone, so only name and email are checked here; if the server can't match
  // the session to a student (an expired login) it asks for details after all.
  const canSkipDetails =
    user?.accountType === 'student' &&
    !needsDetails &&
    Boolean(accountContact.name) &&
    !validateDetails(accountContact).email;

  const [slotFeed, setSlotFeed] = useState([]);
  const [loadState, setLoadState] = useState('loading');
  const [reloadKey, setReloadKey] = useState(0);
  const [choice, setChoice] = useState(EMPTY_CHOICE);
  const [selectedDay, setSelectedDay] = useState('');
  const [contact, setContact] = useState(accountContact);
  const [touched, setTouched] = useState({});
  const [screen, setScreen] = useState('pick');
  const [phase, setPhase] = useState('editing');
  const [booked, setBooked] = useState(null);
  const [notice, setNotice] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [video, setVideo] = useState(null);
  const [callbackDone, setCallbackDone] = useState(false);
  const [hydratedFor, setHydratedFor] = useState('');
  const appliedPreferred = useRef('');
  const openedTracked = useRef(false);
  const panelRef = useRef(null);
  const bodyRef = useRef(null);
  const { start: startFlow, track, getFlowId } = useDemoFunnel({ courseId, source });

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const close = useCallback(() => onCloseRef.current?.(), []);
  const closeVideo = useCallback(() => setVideo(null), []);

  useModalA11y(isOpen && phase !== 'callback', close, panelRef);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !courseId) return;
    const draft = readDraft(courseId);
    setChoice({ ...EMPTY_CHOICE, ...(draft?.choice || {}) });
    setSelectedDay(draft?.selectedDay || '');
    setContact({ ...accountContactRef.current, ...(draft?.contact || {}) });
    setScreen(draft?.screen === 'details' ? 'details' : 'pick');
    setPhase(draft?.phase === 'confirmed' ? 'confirmed' : 'editing');
    setBooked(draft?.booked || null);
    setTouched({});
    setNotice('');
    setSubmitError('');
    setVideo(null);
    setCallbackDone(false);
    setNeedsDetails(false);
    appliedPreferred.current = '';
    openedTracked.current = false;
    startFlow();
    setHydratedFor(courseId);
  }, [courseId, isOpen, startFlow]);

  useEffect(() => {
    if (!isOpen || !courseId) return undefined;
    let ignore = false;
    setLoadState((previous) => (previous === 'ready' || previous === 'refreshing' ? 'refreshing' : 'loading'));
    axios
      .get(`${API_BASE}/v1/slots/available`, {
        params: { courseId, slotType: 'demo' },
        withCredentials: true,
      })
      .then((response) => {
        if (ignore) return;
        setSlotFeed(Array.isArray(response.data?.slots) ? response.data.slots : []);
        setLoadState('ready');
      })
      .catch(() => {
        if (ignore) return;
        setSlotFeed([]);
        setLoadState('error');
      });
    return () => {
      ignore = true;
    };
  }, [courseId, isOpen, reloadKey]);

  const hydrated = isOpen && hydratedFor === courseId;
  const ready = loadState === 'ready' || loadState === 'refreshing';

  const teachers = useMemo(
    () =>
      buildInstructorOptions(course, slotFeed, 'demo')
        .map((teacher) => ({ ...teacher, upcoming: upcomingSlots(teacher.slots) }))
        .filter((teacher) => teacher.upcoming.length > 0),
    [course, slotFeed]
  );

  // A published course is either online or offline; the server refuses a
  // demo in the other mode, so only fall back to the slots' modes when the
  // course has none.
  const modes = useMemo(() => {
    const courseMode = normalizeMode(course?.mode);
    const options = courseMode ? [courseMode] : buildModeOptions(course, slotFeed);
    return options.map((mode) => ({
      mode,
      hasSlots: teachers.some((teacher) => teacher.upcoming.some((slot) => slot.deliveryMode === mode)),
    }));
  }, [course, slotFeed, teachers]);

  const branches = useMemo(() => {
    const open = new Set(
      teachers.flatMap((teacher) =>
        teacher.upcoming.filter((slot) => slot.branchId).map((slot) => slot.branchId)
      )
    );
    return buildBranchOptions(course, slotFeed)
      .map((branch) => ({
        ...branch,
        location: branch.raw?.location || '',
        hasSlots: open.has(branch.id),
      }))
      .sort((a, b) => Number(b.hasSlots) - Number(a.hasSlots) || a.label.localeCompare(b.label));
  }, [course, slotFeed, teachers]);

  const cities = useMemo(() => {
    const byCity = new Map();
    branches.forEach((branch) => {
      const name = branch.city || '';
      if (!byCity.has(name)) byCity.set(name, []);
      byCity.get(name).push(branch);
    });
    return [...byCity.entries()]
      .map(([name, list]) => ({ name, branches: list }))
      .sort(
        (a, b) =>
          Number(b.branches.some((x) => x.hasSlots)) - Number(a.branches.some((x) => x.hasSlots)) ||
          a.name.localeCompare(b.name)
      );
  }, [branches]);

  useEffect(() => {
    if (!hydrated || !ready) return;
    const preferred = appliedPreferred.current === preferredId ? '' : preferredId;
    appliedPreferred.current = preferredId;
    setChoice((prev) => reconcileChoice(prev, { modes, branches, teachers, preferred }));
  }, [branches, choice, hydrated, modes, preferredId, ready, teachers]);

  const placeChosen =
    Boolean(choice.deliveryMode) && (choice.deliveryMode !== 'offline' || Boolean(choice.branchId));
  const visibleTeachers = useMemo(
    () => (placeChosen ? teachersFor(teachers, choice) : []),
    [choice, placeChosen, teachers]
  );
  const selectedTeacher = visibleTeachers.find((teacher) => teacher.id === choice.instructorId) || null;
  const days = useMemo(() => groupByDay(selectedTeacher?.placeSlots || []), [selectedTeacher]);
  const selectedSlot = selectedTeacher?.placeSlots.find((slot) => slot.id === choice.slotId) || null;
  const selectedBranch = branches.find((branch) => branch.id === choice.branchId) || null;

  useEffect(() => {
    if (!days.size) return;
    const wanted = selectedSlot?.dayKey || selectedDay;
    if (wanted && days.has(wanted)) {
      if (wanted !== selectedDay) setSelectedDay(wanted);
      return;
    }
    setSelectedDay(days.keys().next().value);
  }, [days, selectedDay, selectedSlot]);

  useEffect(() => {
    if (!hydrated) return;
    saveDraft(courseId, {
      choice,
      selectedDay,
      contact,
      screen: phase === 'confirmed' ? 'pick' : screen,
      phase: phase === 'confirmed' ? 'confirmed' : 'editing',
      booked,
    });
  }, [booked, choice, contact, courseId, hydrated, phase, screen, selectedDay]);

  useEffect(() => {
    if (!hydrated || openedTracked.current || loadState === 'loading') return;
    openedTracked.current = true;
    if (phase === 'confirmed') return;
    track('opened', {
      loggedIn: Boolean(user),
      ...(loadState === 'error' ? {} : { hasSlots: teachers.length > 0 }),
    });
  }, [hydrated, loadState, phase, teachers.length, track, user]);

  const showDetails =
    screen === 'details' &&
    !canSkipDetails &&
    phase !== 'confirmed' &&
    Boolean(selectedSlot && selectedTeacher);

  const scrollBodyTop = () => bodyRef.current?.scrollTo({ top: 0 });

  const goToPick = () => {
    setScreen('pick');
    setSubmitError('');
    scrollBodyTop();
  };

  const handleBack = () => {
    if (video) setVideo(null);
    else if (phase === 'callback') setPhase('editing');
    else if (showDetails) goToPick();
    else if (onBack) onBack();
    else close();
  };

  const historyDepth = !isOpen
    ? 0
    : 1 + (showDetails ? 1 : 0) + (phase === 'callback' ? 1 : 0) + (video ? 1 : 0);
  useHistoryStep(historyDepth, handleBack, { base: historyBase });

  if (!isOpen) return null;

  if (phase === 'callback') {
    return (
      <CallbackRequestModal
        isOpen
        course={course}
        onSuccess={() => setCallbackDone(true)}
        onClose={() => (callbackDone ? close() : setPhase('editing'))}
      />
    );
  }

  const submit = async () => {
    if (!selectedSlot || !selectedTeacher || phase === 'submitting') return;

    if (!canSkipDetails) {
      const errors = validateDetails(contact);
      const invalid = ['name', 'phone', 'email'].find((field) => errors[field]);
      if (invalid) {
        setTouched({ name: true, phone: true, email: true });
        document.getElementById(`demo-${invalid}`)?.focus();
        return;
      }
    }

    const lead = leadFrom(canSkipDetails ? accountContact : contact);
    track('submitted', { deliveryMode: choice.deliveryMode, loggedIn: Boolean(user) });
    setPhase('submitting');
    setSubmitError('');
    setNotice('');

    try {
      const { data } = await axios.post(
        `${API_BASE}/v1/demoBookings`,
        {
          courseId,
          teacherId: choice.instructorId,
          slotId: choice.slotId,
          deliveryMode: choice.deliveryMode,
          ...(choice.branchId ? { branchId: choice.branchId } : {}),
          lead,
          flowId: getFlowId() || undefined,
          source,
        },
        { withCredentials: true }
      );
      setBooked({
        when: slotLabel(selectedSlot),
        teacher: selectedTeacher.name,
        durationMinutes: durationMinutes(selectedSlot),
        email: lead.email,
        branch: choice.deliveryMode === 'offline' ? selectedBranch : null,
      });
      setPhase('confirmed');
      scrollBodyTop();
      onSuccess?.(data?.booking);
    } catch (error) {
      setPhase('editing');
      if (error?.response?.status === 409) {
        setChoice((prev) => ({ ...prev, slotId: '' }));
        setScreen('pick');
        setNotice('Someone just booked that time. Please pick another.');
        setReloadKey((key) => key + 1);
        scrollBodyTop();
        return;
      }
      // Guest-lead validation only runs when the server didn't see a student.
      if (
        canSkipDetails &&
        error?.response?.status === 400 &&
        /mobile number|email/i.test(error.response.data?.message || '')
      ) {
        setNeedsDetails(true);
        setScreen('details');
        setSubmitError('Please check your details to finish booking.');
        scrollBodyTop();
        return;
      }
      const message =
        error?.response?.data?.message ||
        "We couldn't book your demo. Please check your internet and try again.";
      if (showDetails) setSubmitError(message);
      else setNotice(message);
    }
  };

  const goNext = () => {
    if (!selectedSlot) return;
    track('slot_chosen', { deliveryMode: choice.deliveryMode, loggedIn: Boolean(user) });
    if (canSkipDetails) {
      submit();
      return;
    }
    setScreen('details');
    scrollBodyTop();
    if (!contact.name) requestAnimationFrame(() => document.getElementById('demo-name')?.focus());
  };

  const bookAnother = () => {
    clearDraft(courseId);
    setChoice(EMPTY_CHOICE);
    setSelectedDay('');
    setScreen('pick');
    setPhase('editing');
    setBooked(null);
    startFlow();
    track('opened', { loggedIn: Boolean(user), hasSlots: teachers.length > 0 });
    scrollBodyTop();
  };

  const submitting = phase === 'submitting';
  const pickIsLive = hydrated && ready && modes.some((mode) => mode.hasSlots);

  const missingHint = !choice.deliveryMode
    ? 'Choose how you’d like to learn'
    : choice.deliveryMode === 'offline' && !choice.branchId
      ? 'Choose a centre'
      : !choice.instructorId
        ? 'Choose your teacher'
        : 'Pick a time to continue';

  const primaryButtonClass =
    'min-h-12 w-full rounded-2xl text-base font-semibold text-white transition active:scale-[0.97] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:active:scale-100 bg-[#CC3700] hover:bg-[#B83100]';

  let body;
  let footer = null;

  if (phase === 'confirmed' && booked) {
    body = <DemoConfirmation booked={booked} onDone={close} onBookAnother={bookAnother} />;
  } else if (showDetails) {
    body = (
      <StepDetails
        summary={{
          when: slotLabel(selectedSlot),
          teacher: selectedTeacher.name,
          isOffline: choice.deliveryMode === 'offline',
          place:
            choice.deliveryMode === 'offline'
              ? [selectedBranch?.label, selectedBranch?.city].filter(Boolean).join(', ')
              : 'Online video call',
        }}
        onChangeSlot={goToPick}
        values={contact}
        onChange={(patch) => {
          setContact((prev) => ({ ...prev, ...patch }));
          setSubmitError('');
        }}
        errors={validateDetails(contact)}
        touched={touched}
        onBlur={(field) => setTouched((prev) => ({ ...prev, [field]: true }))}
        onSubmit={submit}
        loginHref={`/login?next=${encodeURIComponent(`/courses/${courseId}?action=demo`)}`}
        submitError={submitError}
      />
    );
    footer = (
      <>
        <button type="submit" form={DETAILS_FORM_ID} disabled={submitting} className={primaryButtonClass}>
          {submitting ? 'Booking…' : 'Book my free demo'}
        </button>
        <p className="mt-2 text-center text-sm text-slate-600">Free · No payment · No account needed</p>
      </>
    );
  } else {
    body = (
      <StepPickSlot
        loading={!hydrated || loadState === 'loading'}
        loadError={loadState === 'error'}
        onRetry={() => setReloadKey((key) => key + 1)}
        notice={notice}
        modes={modes}
        deliveryMode={choice.deliveryMode}
        onSelectMode={(mode) => {
          setChoice({ ...EMPTY_CHOICE, deliveryMode: mode });
          setNotice('');
        }}
        cities={cities}
        singleBranch={branches.length === 1 ? branches[0] : null}
        branchId={choice.branchId}
        onSelectBranch={(branchId) => {
          setChoice((prev) => ({ ...prev, branchId, instructorId: '', slotId: '' }));
          setNotice('');
        }}
        teachers={visibleTeachers}
        instructorId={choice.instructorId}
        onSelectTeacher={(instructorId) => {
          setChoice((prev) =>
            prev.instructorId === instructorId ? prev : { ...prev, instructorId, slotId: '' }
          );
          setNotice('');
        }}
        onWatch={(teacher) =>
          setVideo({ url: teacher.profileVideo, title: `Meet ${teacher.name}` })
        }
        days={days}
        selectedDay={selectedDay}
        onSelectDay={(dayKey) => {
          setSelectedDay(dayKey);
          setChoice((prev) => (prev.slotId ? { ...prev, slotId: '' } : prev));
        }}
        slotId={choice.slotId}
        onSelectSlot={(slotId) => {
          setChoice((prev) => ({ ...prev, slotId }));
          setNotice('');
        }}
        onRequestCallback={() => setPhase('callback')}
      />
    );
    if (pickIsLive) {
      footer = (
        <>
          <p
            aria-live="polite"
            className={`mb-2 truncate text-center text-[15px] ${selectedSlot ? 'font-semibold text-slate-900' : 'text-slate-600'}`}
          >
            {selectedSlot
              ? `${slotLabel(selectedSlot)} · with ${firstName(selectedTeacher?.name)}`
              : missingHint}
          </p>
          {canSkipDetails && selectedSlot ? (
            <p className="mb-2 truncate text-center text-sm text-slate-600">
              Booking as {accountContact.name} · {accountContact.email}
            </p>
          ) : null}
          <button
            type="button"
            onClick={goNext}
            disabled={!selectedSlot || submitting}
            className={primaryButtonClass}
          >
            {canSkipDetails ? (submitting ? 'Booking…' : 'Book my free demo') : 'Next'}
          </button>
        </>
      );
    }
  }

  const subtitle =
    phase === 'confirmed'
      ? 'Free demo class'
      : canSkipDetails
        ? 'Free demo class'
        : `Free demo class · Step ${showDetails ? 2 : 1} of 2`;

  const courseImage = resolveImageUrl(course?.image, getCoursePlaceholderImage());

  return (
    <>
      <DemoSheet
        panelRef={panelRef}
        bodyRef={bodyRef}
        labelledBy="book-demo-heading"
        title={courseTitle}
        subtitle={subtitle}
        onBack={showDetails ? goToPick : phase !== 'confirmed' && onBack ? onBack : undefined}
        backLabel={showDetails ? 'Back to times' : 'Change course'}
        onClose={close}
        footer={footer}
        aside={
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-300">
              Free demo class
            </p>
            <p className="mt-3 text-3xl font-bold leading-tight">Try a class before you join</p>
            <div className="mt-8 flex items-center gap-4 rounded-3xl bg-white/10 p-4 ring-1 ring-white/10">
              <img
                src={courseImage}
                alt=""
                className="h-16 w-16 rounded-2xl object-cover"
                onError={(event) => {
                  event.currentTarget.src = getCoursePlaceholderImage();
                }}
              />
              <div className="min-w-0">
                <p className="text-lg font-semibold">{courseTitle}</p>
                <p className="text-sm text-white/80">
                  {normalizeMode(course?.mode) === 'offline' ? 'At a Dunamis centre' : 'Online'}
                </p>
              </div>
            </div>
            <ul className="mt-6 space-y-3 text-[15px] text-white/90">
              {['Free, no payment', 'No account needed', 'Takes under a minute'].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <HiCheckCircle aria-hidden="true" className="shrink-0 text-emerald-300" />
                  {item}
                </li>
              ))}
            </ul>
          </>
        }
      >
        {body}
      </DemoSheet>

      {video ? <InstructorVideoOverlay video={video} onClose={closeVideo} /> : null}
    </>
  );
}
