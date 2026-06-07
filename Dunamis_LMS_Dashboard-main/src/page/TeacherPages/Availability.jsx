import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  FiClock,
  FiEdit2,
  FiPlus,
  FiRotateCcw,
  FiSave,
  FiX,
} from "react-icons/fi";
import axios from "../../api/axios";
import { getStoredToken } from "../../utils/authSession";

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const DAY_LABELS = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

const SECTION_ORDER = ["group", "individual", "demo"];

const SECTION_CONFIG = {
  group: {
    id: "group",
    title: "Group sessions",
    description:
      "Add standard enrolled-class slots that more than one student can book into.",
    slotType: "enrolled",
    sessionType: "standard",
    tone: "text-fuchsia-300",
    badge: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100",
  },
  individual: {
    id: "individual",
    title: "Individual sessions",
    description:
      "Set aside premium 1:1 class slots for students who want a personalized session.",
    slotType: "enrolled",
    sessionType: "premium",
    tone: "text-violet-300",
    badge: "bg-violet-50 text-violet-700 border-violet-100",
  },
  demo: {
    id: "demo",
    title: "Demo sessions",
    description:
      "Choose the recurring windows that should appear when learners book a demo with you.",
    slotType: "demo",
    sessionType: null,
    tone: "text-pink-300",
    badge: "bg-pink-50 text-pink-700 border-pink-100",
  },
};

const DAY_PAIR_OPTIONS = [
  {
    id: "mon-thu",
    label: "Mon - Thu",
    helper: "Weekday pair",
    days: ["monday", "thursday"],
  },
  {
    id: "tue-fri",
    label: "Tue - Fri",
    helper: "Weekday pair",
    days: ["tuesday", "friday"],
  },
  {
    id: "wed-sat",
    label: "Wed - Sat",
    helper: "Weekday pair",
    days: ["wednesday", "saturday"],
  },
  {
    id: "sat-sun",
    label: "Sat - Sun",
    helper: "Weekend slot",
    days: ["saturday", "sunday"],
  },
];

const SLOT_DURATION_MINUTES = {
  group: 60,
  individual: 40,
  demo: 20,
};

const SLOT_MAX_STUDENTS = {
  group: 4,
  individual: 1,
  demo: 1,
};

const createLocalId = () =>
  `slot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const emptySlot = (courseId = "", sectionId = "group") => {
  const section = SECTION_CONFIG[sectionId] || SECTION_CONFIG.group;
  const sessionType = section.sessionType || "standard";
  const startTime =
    sectionId === "individual" ? "15:20" : sectionId === "demo" ? "10:00" : "16:00";
  const endTime = addMinutesToTime(
    startTime,
    SLOT_DURATION_MINUTES[sectionId] || SLOT_DURATION_MINUTES.group
  );

  return {
    localId: createLocalId(),
    days: DAY_PAIR_OPTIONS[0].days,
    startTime,
    endTime,
    sessionType,
    slotType: section.slotType,
    maxStudents: SLOT_MAX_STUDENTS[sectionId] || 4,
    courseId,
    branchId: "",
    isActive: true,
  };
};

const toMinutes = (time) => {
  const match = String(time || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return NaN;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 24 ||
    minutes < 0 ||
    minutes > 59 ||
    (hours === 24 && minutes !== 0)
  ) {
    return NaN;
  }
  return hours * 60 + minutes;
};

const toTimeValue = (minutes) => {
  const boundedMinutes = Math.max(0, Math.min(minutes, 1440));
  const hours = Math.floor(boundedMinutes / 60);
  const mins = boundedMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

const addMinutesToTime = (time, minutesToAdd) =>
  toTimeValue(toMinutes(time) + minutesToAdd);

const getDurationForSection = (sectionId) =>
  SLOT_DURATION_MINUTES[sectionId] || SLOT_DURATION_MINUTES.group;

const getSectionDurationLabel = (sectionId) =>
  `${getDurationForSection(sectionId)} min`;

const buildTimeOptions = (duration) =>
  Array.from({ length: 1440 / duration }, (_, index) => {
    const start = index * duration;
    const end = start + duration;
    return {
      id: `${toTimeValue(start)}-${toTimeValue(end)}`,
      startTime: toTimeValue(start),
      endTime: toTimeValue(end),
    };
  });

const TIME_OPTIONS_BY_SECTION = {
  group: buildTimeOptions(SLOT_DURATION_MINUTES.group),
  individual: buildTimeOptions(SLOT_DURATION_MINUTES.individual),
  demo: buildTimeOptions(SLOT_DURATION_MINUTES.demo),
};

const convertTo12Hour = (value) => {
  const time = String(value || "").trim();
  if (!time) return "";
  if (time === "24:00") return "12:00 AM";
  if (time.includes("AM") || time.includes("PM")) return time;
  const [hours, minutes] = time.split(":");
  const hour = Number(hours);
  if (Number.isNaN(hour)) return time;
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${period}`;
};

const getDayPairForDays = (days = []) => {
  const sortedDays = sortDays(days);
  return (
    DAY_PAIR_OPTIONS.find((option) => {
      const sortedOptionDays = sortDays(option.days);
      return (
        sortedOptionDays.length === sortedDays.length &&
        sortedOptionDays.every((day, index) => day === sortedDays[index])
      );
    }) || null
  );
};

const getDayPairIdForDays = (days = []) =>
  getDayPairForDays(days)?.id || DAY_PAIR_OPTIONS[0].id;

const parseTimeToMinutes = (timeStr) => {
  const raw = String(timeStr || "").trim();
  const hhmm = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmm) return Number(hhmm[1]) * 60 + Number(hhmm[2]);
  const ampm = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampm) {
    let h = Number(ampm[1]);
    const m = Number(ampm[2]);
    const period = ampm[3].toUpperCase();
    if (period === "AM" && h === 12) h = 0;
    if (period === "PM" && h !== 12) h += 12;
    return h * 60 + m;
  }
  return NaN;
};

const normalizeCourseOptions = (source) => {
  const rawCourses =
    source?.courses || source?.course || source?.roleId?.course || [];

  return rawCourses
    .map((course, index) => {
      if (typeof course === "string") {
        return { id: course, label: `Assigned Course ${index + 1}`, mode: "online", branches: [] };
      }

      const id = String(course?._id || course?.id || "").trim();
      if (!id) return null;

      const branches = Array.isArray(course?.branches)
        ? course.branches
            .map((b) => ({
              id: String(b._id || b.id || "").trim(),
              name: b.branchName || b.name || "Branch",
              timings: Array.isArray(b.branchTimings) ? b.branchTimings : [],
              openDays: Array.isArray(b.branchOpenDays)
                ? b.branchOpenDays.map((d) => d.toLowerCase())
                : [],
            }))
            .filter((b) => b.id)
        : [];

      return {
        id,
        label: course?.name || course?.title || course?.code || `Course ${index + 1}`,
        mode: course?.mode || "online",
        branches,
      };
    })
    .filter(Boolean);
};

const normalizeAvailabilitySlots = (sourceSlots = []) =>
  (Array.isArray(sourceSlots) ? sourceSlots : []).map((slot, index) => ({
    localId: String(slot?._id || slot?.id || `slot-${index}`),
    _id: slot?._id || slot?.id || null,
    days: Array.isArray(slot?.days)
      ? slot.days.map((day) => String(day).toLowerCase())
      : slot?.day
        ? [String(slot.day).toLowerCase()]
        : [],
    startTime: slot?.startTime || "10:00",
    endTime: slot?.endTime || "11:00",
    sessionType: slot?.sessionType || "standard",
    slotType: slot?.slotType || "demo",
    maxStudents:
      Number(slot?.maxStudents) ||
      (slot?.slotType === "demo" ? 1 : slot?.sessionType === "premium" ? 1 : 4),
    courseId: String(slot?.courseId?._id || slot?.courseId || "").trim(),
    branchId: String(slot?.branchId?._id || slot?.branchId || "").trim(),
    isActive:
      typeof slot?.isActive === "boolean"
        ? slot.isActive
        : ["demo", "enrolled"].includes(slot?.slotType),
  }));

const getSourceAvailability = (teacher, user) => {
  if (Array.isArray(teacher?.weeklyAvailability)) return teacher.weeklyAvailability;
  if (Array.isArray(user?.weeklyAvailability)) return user.weeklyAvailability;
  if (Array.isArray(user?.roleId?.weeklyAvailability)) return user.roleId.weeklyAvailability;
  return [];
};

const sortDays = (days = []) =>
  days
    .slice()
    .sort((left, right) => DAYS.indexOf(left) - DAYS.indexOf(right));

const getSectionIdForSlot = (slot) => {
  if (slot?.slotType === "demo") return "demo";
  if (slot?.sessionType === "premium") return "individual";
  return "group";
};

const buildDaySummary = (days = []) => {
  const ordered = sortDays(days);
  if (!ordered.length) return "Select days";
  return ordered.map((day) => DAY_LABELS[day] || day).join(" • ");
};

const Availability = ({
  teacher,
  user,
  loading = false,
  title = "Availability",
  description = "Pick and manage your available time slots so students can easily book sessions with you.",
}) => {
  const source = teacher || user || {};
  const courseOptions = useMemo(() => normalizeCourseOptions(source), [source]);
  const courseLabelById = useMemo(
    () =>
      courseOptions.reduce((map, course) => {
        map[course.id] = course.label;
        return map;
      }, {}),
    [courseOptions]
  );

  const [slots, setSlots] = useState([]);
  const [draftSlot, setDraftSlot] = useState(emptySlot());

  const selectedCourse = useMemo(
    () => courseOptions.find((c) => c.id === draftSlot.courseId) || null,
    [courseOptions, draftSlot.courseId]
  );
  const isOfflineCourse = selectedCourse?.mode === "offline";
  const branchOptions = isOfflineCourse ? (selectedCourse?.branches || []) : [];
  const selectedBranch = useMemo(
    () => branchOptions.find((b) => b.id === draftSlot.branchId) || null,
    [branchOptions, draftSlot.branchId]
  );
  const [activeSectionId, setActiveSectionId] = useState(null);
  const [editingSlotId, setEditingSlotId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    const nextSlots = normalizeAvailabilitySlots(
      getSourceAvailability(teacher, user)
    );
    setSlots(nextSlots);
    setHasUnsavedChanges(false);
    setEditingSlotId(null);
    setDraftSlot(emptySlot(courseOptions[0]?.id || "", activeSectionId || "group"));
  }, [teacher, user]);

  useEffect(() => {
    if (draftSlot.courseId || !courseOptions.length) return;
    setDraftSlot((prev) => ({ ...prev, courseId: courseOptions[0].id }));
  }, [courseOptions, draftSlot.courseId]);

  const activeSlots = useMemo(
    () => slots.filter((slot) => slot.isActive !== false),
    [slots]
  );

  const summaryCards = useMemo(
    () => [
      { label: "Active Slots", value: activeSlots.length },
      {
        label: "Demo Slots",
        value: activeSlots.filter((slot) => slot.slotType === "demo").length,
      },
      {
        label: "Class Slots",
        value: activeSlots.filter((slot) => slot.slotType === "enrolled").length,
      },
      {
        label: "1:1 Slots",
        value: activeSlots.filter((slot) => slot.sessionType === "premium").length,
      },
    ],
    [activeSlots]
  );

  const sections = useMemo(
    () =>
      SECTION_ORDER.map((sectionId) => {
        const config = SECTION_CONFIG[sectionId];
        const items = slots
          .filter((slot) => getSectionIdForSlot(slot) === sectionId)
          .slice()
          .sort((left, right) => {
            const leftDay = DAYS.indexOf(sortDays(left.days)[0]);
            const rightDay = DAYS.indexOf(sortDays(right.days)[0]);
            if (leftDay !== rightDay) return leftDay - rightDay;
            return toMinutes(left.startTime) - toMinutes(right.startTime);
          });

        return {
          ...config,
          items,
        };
      }),
    [slots]
  );

  const activeSection = SECTION_CONFIG[activeSectionId] || SECTION_CONFIG.group;

  const resetDraftForSection = (sectionId, slot = null) => {
    const nextSlot =
      slot ||
      emptySlot(courseOptions[0]?.id || "", sectionId || activeSectionId);
    const nextSectionId = sectionId || activeSectionId;
    const duration = getDurationForSection(nextSectionId);
    const startTime = nextSlot.startTime || emptySlot("", nextSectionId).startTime;

    setActiveSectionId(nextSectionId);
    setEditingSlotId(slot?.localId || null);
    setDraftSlot({
      ...nextSlot,
      days: getDayPairForDays(nextSlot.days)?.days || DAY_PAIR_OPTIONS[0].days,
      branchId: nextSlot.branchId || "",
      startTime,
      endTime: addMinutesToTime(startTime, duration),
      maxStudents: SLOT_MAX_STUDENTS[nextSectionId] || 4,
      slotType: nextSectionId === "demo" ? "demo" : "enrolled",
      sessionType:
        nextSectionId === "group"
          ? "standard"
          : nextSectionId === "individual"
            ? "premium"
            : "standard",
    });
  };

  const handleSectionChange = (sectionId) => {
    resetDraftForSection(sectionId);
  };

  const updateDraft = (patch) => {
    setDraftSlot((prev) => {
      const next = { ...prev, ...patch };
      const duration = getDurationForSection(activeSectionId);

      if (activeSectionId === "group") {
        next.slotType = "enrolled";
        next.sessionType = "standard";
        next.maxStudents = SLOT_MAX_STUDENTS.group;
      } else if (activeSectionId === "individual") {
        next.slotType = "enrolled";
        next.sessionType = "premium";
        next.maxStudents = SLOT_MAX_STUDENTS.individual;
      } else if (activeSectionId === "demo") {
        next.slotType = "demo";
        next.sessionType = "standard";
        next.maxStudents = SLOT_MAX_STUDENTS.demo;
      }

      if (Object.prototype.hasOwnProperty.call(patch, "startTime")) {
        next.endTime = addMinutesToTime(patch.startTime, duration);
      }

      return next;
    });
  };

  const updateDayPair = (pairId) => {
    const pair =
      DAY_PAIR_OPTIONS.find((option) => option.id === pairId) ||
      DAY_PAIR_OPTIONS[0];
    updateDraft({ days: pair.days });
  };

  const getTimeOptionDisabledReason = (option, days = draftSlot.days) => {
    if (selectedBranch && selectedBranch.timings.length === 2) {
      const branchOpen = parseTimeToMinutes(selectedBranch.timings[0]);
      const branchClose = parseTimeToMinutes(selectedBranch.timings[1]);
      const optStart = toMinutes(option.startTime);
      const optEnd = toMinutes(option.endTime);
      if (Number.isFinite(branchOpen) && Number.isFinite(branchClose)) {
        if (optStart < branchOpen || optEnd > branchClose) {
          return `Outside branch hours (${selectedBranch.timings[0]}–${selectedBranch.timings[1]})`;
        }
      }
    }

    const overlappingSlot = slots.find((slot) => {
      if (slot.localId === editingSlotId) return false;
      if (slot.isActive === false) return false;
      // For offline courses, demo and enrolled slots at the same branch may overlap
      // (demo student visits the ongoing class). For online, all slots must be fully separate.
      const bothOffline = isOfflineCourse && !!slot.branchId;
      if (slot.slotType !== (activeSectionId === "demo" ? "demo" : "enrolled") && bothOffline) return false;

      const sharesDay = slot.days.some((day) => days.includes(day));
      if (!sharesDay) return false;

      const start = toMinutes(option.startTime);
      const end = toMinutes(option.endTime);
      const existingStart = toMinutes(slot.startTime);
      const existingEnd = toMinutes(slot.endTime);

      return start < existingEnd && end > existingStart;
    });

    return overlappingSlot
      ? `${buildDaySummary(overlappingSlot.days)} ${convertTo12Hour(
          overlappingSlot.startTime
        )} - ${convertTo12Hour(overlappingSlot.endTime)} is already used`
      : "";
  };

  const validateDraftSlot = () => {
    if (!getDayPairForDays(draftSlot.days)) {
      toast.error("Select a valid weekday pair or weekend slot");
      return false;
    }

    if (!draftSlot.startTime || !draftSlot.endTime) {
      toast.error("Select both start and end time");
      return false;
    }

    if (toMinutes(draftSlot.startTime) >= toMinutes(draftSlot.endTime)) {
      toast.error("End time must be later than start time");
      return false;
    }

    const duration = toMinutes(draftSlot.endTime) - toMinutes(draftSlot.startTime);
    const expectedDuration = getDurationForSection(activeSectionId);

    if (duration !== expectedDuration) {
      toast.error(
        `${activeSection.title} must use a ${getSectionDurationLabel(
          activeSectionId
        )} slot`
      );
      return false;
    }

    if (courseOptions.length > 0 && !draftSlot.courseId) {
      toast.error("Select a course for this slot");
      return false;
    }

    if (isOfflineCourse && !draftSlot.branchId) {
      toast.error("Select a branch for this offline course slot");
      return false;
    }

    const overlappingSlot = slots.find((slot) => {
      if (slot.localId === editingSlotId) return false;
      if (slot.isActive === false) return false;
      const bothOffline = isOfflineCourse && !!slot.branchId;
      if (slot.slotType !== (activeSectionId === "demo" ? "demo" : "enrolled") && bothOffline) return false;

      const sharesDay = slot.days.some((day) => draftSlot.days.includes(day));
      if (!sharesDay) return false;

      const start = toMinutes(draftSlot.startTime);
      const end = toMinutes(draftSlot.endTime);
      const existingStart = toMinutes(slot.startTime);
      const existingEnd = toMinutes(slot.endTime);

      return start < existingEnd && end > existingStart;
    });

    if (overlappingSlot) {
      toast.error("This slot overlaps with an existing schedule entry");
      return false;
    }

    return true;
  };

  const submitSlotDraft = () => {
    if (!validateDraftSlot()) return;

    const normalized = {
      ...draftSlot,
      days: sortDays(draftSlot.days),
      localId: editingSlotId || draftSlot.localId || createLocalId(),
      slotType: activeSectionId === "demo" ? "demo" : "enrolled",
      sessionType:
        activeSectionId === "individual" ? "premium" : "standard",
      maxStudents: SLOT_MAX_STUDENTS[activeSectionId] || 4,
      branchId: draftSlot.branchId || "",
      isActive: draftSlot.isActive !== false,
    };

    setSlots((prev) => {
      if (!editingSlotId) {
        return [...prev, normalized];
      }

      return prev.map((slot) =>
        slot.localId === editingSlotId ? normalized : slot
      );
    });

    setHasUnsavedChanges(true);
    toast.success(
      editingSlotId
        ? "Slot updated locally. Save to publish the changes."
        : "Slot added locally. Save to publish it."
    );
    resetDraftForSection(activeSectionId);
  };

  const openEditSlot = (slot) => {
    resetDraftForSection(getSectionIdForSlot(slot), slot);
  };

  const deleteSlot = (slotId) => {
    setSlots((prev) => prev.filter((slot) => slot.localId !== slotId));
    setHasUnsavedChanges(true);
    if (editingSlotId === slotId) {
      resetDraftForSection(activeSectionId);
    }
    toast.success("Slot removed locally. Save to apply it.");
  };

  const toggleSlotStatus = (slotId) => {
    setSlots((prev) =>
      prev.map((slot) =>
        slot.localId === slotId
          ? { ...slot, isActive: !(slot.isActive !== false) }
          : slot
      )
    );
    setHasUnsavedChanges(true);
    toast.success("Slot updated locally. Save to apply it.");
  };

  const resetLocalChanges = () => {
    const nextSlots = normalizeAvailabilitySlots(
      getSourceAvailability(teacher, user)
    );
    setSlots(nextSlots);
    setHasUnsavedChanges(false);
    resetDraftForSection(activeSectionId);
    toast.success("Local schedule changes were discarded");
  };

  const handleSaveAvailability = async () => {
    const token = getStoredToken();
    if (!token) {
      toast.error("Authentication required");
      return;
    }

    const availability = activeSlots.map((slot) => ({
      days: slot.days.map((day) => day.toLowerCase()),
      startTime: slot.startTime,
      endTime: slot.endTime,
      sessionType: slot.slotType === "demo" ? "standard" : slot.sessionType,
      slotType: slot.slotType,
      maxStudents:
        slot.slotType === "demo"
          ? SLOT_MAX_STUDENTS.demo
          : slot.sessionType === "premium"
            ? SLOT_MAX_STUDENTS.individual
            : SLOT_MAX_STUDENTS.group,
      ...(slot.courseId ? { courseId: slot.courseId } : {}),
      ...(slot.branchId ? { branchId: slot.branchId } : {}),
    }));

    setIsSaving(true);
    try {
      const response = await axios.post(
        "/slots/weekly-availability",
        {
          availability,
          replaceExisting: true,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const savedSlots = normalizeAvailabilitySlots(
        response.data?.availability || []
      );
      setSlots(savedSlots);
      setHasUnsavedChanges(false);
      toast.success("Availability saved successfully");
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          "Failed to save schedule"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const renderSectionEditor = () => {
    const isIndividualSection = activeSectionId === "individual";
    const timeOptions =
      TIME_OPTIONS_BY_SECTION[activeSectionId] || TIME_OPTIONS_BY_SECTION.group;
    const selectedPairId = getDayPairIdForDays(draftSlot.days);
    const selectedPair =
      DAY_PAIR_OPTIONS.find((option) => option.id === selectedPairId) ||
      DAY_PAIR_OPTIONS[0];

    return (
      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr_1fr]">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-900">
              Select Course
            </span>
            <select
              value={draftSlot.courseId}
              onChange={(event) => {
                const courseId = event.target.value;
                const course = courseOptions.find((c) => c.id === courseId);
                updateDraft({ courseId, branchId: course?.mode === "offline" ? draftSlot.branchId : "" });
              }}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-300"
            >
              <option value="">Choose course</option>
              {courseOptions.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.label}{course.mode === "offline" ? " (Offline)" : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-900">
              Select Day Pair
            </span>
            <select
              value={selectedPairId}
              onChange={(event) => updateDayPair(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-300"
            >
              {DAY_PAIR_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label} ({option.helper})
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <span className="block text-sm font-medium text-slate-900">
              Slot Rule
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                {getSectionDurationLabel(activeSectionId)}
              </span>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                {timeOptions.length} daily slots
              </span>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                Max {SLOT_MAX_STUDENTS[activeSectionId]}
              </span>
            </div>
          </div>
        </div>

        {isOfflineCourse ? (
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-900">
                Select Branch
              </span>
              {branchOptions.length > 0 ? (
                <select
                  value={draftSlot.branchId}
                  onChange={(event) => updateDraft({ branchId: event.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-300"
                >
                  <option value="">Choose branch</option>
                  {branchOptions.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  No branches assigned to this course. Contact admin to assign branches.
                </p>
              )}
            </label>

            {selectedBranch ? (
              <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">{selectedBranch.name}</p>
                {selectedBranch.timings.length === 2 ? (
                  <p className="mt-1">
                    Open: <span className="font-medium text-slate-800">{selectedBranch.timings[0]} – {selectedBranch.timings[1]}</span>
                    <span className="ml-2 text-xs text-slate-500">(slots outside these hours are disabled)</span>
                  </p>
                ) : null}
                {selectedBranch.openDays.length > 0 ? (
                  <p className="mt-1">
                    Open days: <span className="font-medium text-slate-800">{selectedBranch.openDays.map((d) => DAY_LABELS[d] || d).join(", ")}</span>
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-5">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Select {getSectionDurationLabel(activeSectionId)} time slot
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {isOfflineCourse && !selectedBranch
                  ? "Select a branch above to see available time slots."
                  : isOfflineCourse && selectedBranch
                    ? `Slots outside ${selectedBranch.name} open hours are disabled. Demo sessions may overlap with enrolled sessions at the same branch.`
                    : `Disabled slots overlap with an existing slot for ${selectedPair.label}.`}
              </p>
            </div>
            {!isOfflineCourse || selectedBranch ? (
              <div className="text-xs font-medium text-slate-500">
                Selected:{" "}
                <span className="text-slate-800">
                  {convertTo12Hour(draftSlot.startTime)} -{" "}
                  {convertTo12Hour(draftSlot.endTime)}
                </span>
              </div>
            ) : null}
          </div>

          {isOfflineCourse && !selectedBranch ? (
            <div className="flex min-h-[96px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400">
              Choose a branch to unlock time slots
            </div>
          ) : (
          <div className="grid max-h-72 gap-2 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {timeOptions.map((option) => {
              const disabledReason = getTimeOptionDisabledReason(
                option,
                selectedPair.days
              );
              const isSelected =
                draftSlot.startTime === option.startTime &&
                draftSlot.endTime === option.endTime;
              const isDisabled = Boolean(disabledReason);

              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={isDisabled}
                  title={disabledReason || undefined}
                  onClick={() =>
                    updateDraft({
                      startTime: option.startTime,
                      endTime: option.endTime,
                    })
                  }
                  className={`rounded-xl border px-3 py-2 text-left text-xs font-semibold transition ${
                    isSelected
                      ? "border-slate-900 bg-slate-900 text-white"
                      : isDisabled
                        ? "cursor-not-allowed border-slate-200 bg-white text-slate-300"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  {convertTo12Hour(option.startTime)} -{" "}
                  {convertTo12Hour(option.endTime)}
                </button>
              );
            })}
          </div>
          )}
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_auto]">
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
            <p>
              Selected days:{" "}
              <span className="font-medium text-slate-700">
                {buildDaySummary(draftSlot.days)}
              </span>
            </p>
            <p className="mt-1">
              Session:{" "}
              <span className="font-medium text-slate-700">
                {activeSectionId === "demo"
                  ? "20 min demo"
                  : isIndividualSection
                    ? "40 min premium 1:1"
                    : "60 min standard group"}
              </span>
            </p>
          </div>

          <div className="flex items-end gap-3">
            {editingSlotId ? (
              <button
                type="button"
                onClick={() => resetDraftForSection(activeSectionId)}
                className="inline-flex h-[50px] items-center justify-center rounded-2xl border border-slate-200 px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Cancel edit
              </button>
            ) : null}

            <button
              type="button"
              onClick={submitSlotDraft}
              disabled={!courseOptions.length}
              className={`inline-flex h-[50px] items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold transition ${
                courseOptions.length
                  ? "bg-slate-900 text-white hover:bg-slate-800"
                  : "cursor-not-allowed bg-slate-200 text-slate-500"
              }`}
            >
              {editingSlotId ? <FiEdit2 /> : <FiPlus />}
              {editingSlotId ? "Update slot" : "Add slot"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {description}
            </p>

            <div className="mt-5 flex flex-wrap gap-2 text-xs font-medium">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-600">
                Online recurring slots
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-600">
                Demo + enrolled sessions
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-600">
                Course-linked scheduling
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((item) => (
              <div
                key={item.label}
                className="min-w-[140px] rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  {item.label}
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-[28px] border border-sky-100 bg-sky-50/70 p-5 text-sm text-slate-600">
          <p className="font-semibold text-slate-900">How this schedule works</p>
          <div className="mt-2 space-y-1">
            <p>Choose one fixed day pair: Mon-Thu, Tue-Fri, Wed-Sat, or Sat-Sun.</p>
            <p>Group slots are 60 min, individual slots are 40 min, and demo slots are 20 min.</p>
            <p>Overlapping slots are disabled across group, individual, and demo schedules.</p>
          </div>
        </div>

        {!courseOptions.length ? (
          <div className="mt-6 rounded-[28px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
            No assigned courses were found for this instructor. Please ask admin
            to assign at least one course before publishing availability.
          </div>
        ) : null}

        {hasUnsavedChanges ? (
          <div className="mt-6 rounded-[28px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
            You have unsaved schedule changes. Please save to make the latest
            availability bookable for students.
          </div>
        ) : null}

        {loading && !slots.length ? (
          <div className="mt-6 rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center text-sm text-slate-500">
            Loading current schedule...
          </div>
        ) : null}

        <div className="mt-8 space-y-8">
          {sections.map((section) => {
            const isActiveSection = activeSectionId === section.id;

            return (
              <section key={section.id}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className={`text-[30px] font-semibold tracking-tight ${section.tone}`}>
                      {section.title}
                    </p>
                    <p className="mt-2 max-w-3xl text-sm text-slate-500">
                      {section.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSectionChange(section.id)}
                    className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium transition ${
                      isActiveSection
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <FiPlus />
                    {editingSlotId && isActiveSection ? "Editing slot" : "Add slot"}
                  </button>
                </div>

                <div className="mt-5">{isActiveSection ? renderSectionEditor() : null}</div>

                {section.items.length ? (
                  <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {section.items.map((slot) => (
                      <article
                        key={slot.localId}
                        className={`rounded-[24px] border p-4 transition ${
                          slot.isActive === false
                            ? "border-slate-200 bg-slate-50 opacity-70"
                            : "border-slate-200 bg-white shadow-sm"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-lg font-semibold text-slate-900">
                              {convertTo12Hour(slot.startTime)} -{" "}
                              {convertTo12Hour(slot.endTime)}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              {buildDaySummary(slot.days)}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => deleteSlot(slot.localId)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                            aria-label="Delete slot"
                          >
                            <FiX />
                          </button>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${section.badge}`}
                          >
                            {slot.slotType === "demo"
                              ? "Demo"
                              : slot.sessionType === "premium"
                                ? "Premium"
                                : "Group"}
                          </span>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                            {courseLabelById[slot.courseId] || "Assigned course"}
                          </span>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                            Max {slot.maxStudents}
                          </span>
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-medium ${
                              slot.isActive === false
                                ? "border-slate-200 bg-slate-100 text-slate-500"
                                : "border-emerald-100 bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {slot.isActive === false ? "Inactive" : "Active"}
                          </span>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openEditSlot(slot)}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            <FiEdit2 />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleSlotStatus(slot.localId)}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            {slot.isActive === false ? <FiRotateCcw /> : <FiClock />}
                            {slot.isActive === false ? "Activate" : "Deactivate"}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5 rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
                    <p className="text-sm font-medium text-slate-900">
                      No {section.title.toLowerCase()} configured yet.
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      Add recurring online slots here and save when you are ready
                      to publish them.
                    </p>
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={resetLocalChanges}
            disabled={!hasUnsavedChanges}
            className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition ${
              hasUnsavedChanges
                ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                : "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
            }`}
          >
            <FiRotateCcw />
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveAvailability}
            disabled={isSaving || !courseOptions.length}
            className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition ${
              isSaving || !courseOptions.length
                ? "cursor-not-allowed bg-slate-200 text-slate-500"
                : "bg-slate-900 text-white hover:bg-slate-800"
            }`}
          >
            <FiSave />
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </section>
    </div>
  );
};

export default Availability;
