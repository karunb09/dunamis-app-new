import React, { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  FiChevronDown,
  FiClock,
  FiEdit2,
  FiMinus,
  FiPlus,
  FiRotateCcw,
  FiSave,
  FiX,
} from "react-icons/fi";
import axios from "../../api/axios";
import { getStoredToken } from "../../utils/authSession";
import { resolveImageUrl } from "../../utils/resolveImageUrl";
import DynamicCourseIcon from "../../components/DynamicCourseIcon";

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
  group: 5,
  individual: 1,
  demo: 1,
};

const UNLIMITED_STUDENTS = 9999;

// Online group classes cap at 5; offline (branch-bound) group classes are unlimited.
const maxStudentsFor = (sectionId, branchId) =>
  sectionId === "group" && branchId
    ? UNLIMITED_STUDENTS
    : SLOT_MAX_STUDENTS[sectionId] || SLOT_MAX_STUDENTS.group;

const formatMaxStudents = (value) =>
  Number(value) >= UNLIMITED_STUDENTS ? "Unlimited" : value;

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
    days: [],
    startTime,
    endTime,
    sessionType,
    slotType: section.slotType,
    maxStudents: maxStudentsFor(sectionId, ""),
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
        image: course?.image,
        category: course?.category,
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
      (slot?.slotType === "demo"
        ? 1
        : slot?.sessionType === "premium"
          ? 1
          : slot?.branchId
            ? UNLIMITED_STUDENTS
            : 5),
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
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [draftSlot, setDraftSlot] = useState(emptySlot());

  const selectedCourse = useMemo(
    () => courseOptions.find((c) => c.id === selectedCourseId) || null,
    [courseOptions, selectedCourseId]
  );
  const isOfflineCourse = selectedCourse?.mode === "offline";
  const branchOptions = isOfflineCourse ? (selectedCourse?.branches || []) : [];
  const selectedBranch = useMemo(
    () => branchOptions.find((b) => b.id === draftSlot.branchId) || null,
    [branchOptions, draftSlot.branchId]
  );
  const [activeSectionId, setActiveSectionId] = useState(null);
  const [editingSlotId, setEditingSlotId] = useState(null);
  const [selectedTimes, setSelectedTimes] = useState(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [dayPairDropdownOpen, setDayPairDropdownOpen] = useState(false);
  const dayPairDropdownRef = useRef(null);

  useEffect(() => {
    const nextSlots = normalizeAvailabilitySlots(
      getSourceAvailability(teacher, user)
    );
    setSlots(nextSlots);
    setHasUnsavedChanges(false);
    setActiveSectionId(null);
    setEditingSlotId(null);
    setDraftSlot(emptySlot(selectedCourseId || courseOptions[0]?.id || "", "group"));
  }, [teacher, user]);

  useEffect(() => {
    if (selectedCourseId || !courseOptions.length) return;
    setSelectedCourseId(courseOptions[0].id);
  }, [courseOptions, selectedCourseId]);

  // Selecting a different course closes any open editor for the previous one.
  useEffect(() => {
    if (!selectedCourseId) return;
    setActiveSectionId(null);
    setEditingSlotId(null);
    setSelectedTimes(new Set());
    setDraftSlot(emptySlot(selectedCourseId, "group"));
  }, [selectedCourseId]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dayPairDropdownRef.current && !dayPairDropdownRef.current.contains(e.target)) {
        setDayPairDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Full slot list (all courses) — authoritative for save + cross-course overlap checks.
  const activeSlots = useMemo(
    () => slots.filter((slot) => slot.isActive !== false),
    [slots]
  );

  // Scoped to the selected course — display only.
  const courseSlots = useMemo(
    () => slots.filter((slot) => slot.courseId === selectedCourseId),
    [slots, selectedCourseId]
  );
  const courseActiveSlots = useMemo(
    () => courseSlots.filter((slot) => slot.isActive !== false),
    [courseSlots]
  );

  const summaryCards = useMemo(
    () => [
      { label: "Active Slots", value: courseActiveSlots.length },
      {
        label: "Demo Slots",
        value: courseActiveSlots.filter((slot) => slot.slotType === "demo").length,
      },
      {
        label: "Class Slots",
        value: courseActiveSlots.filter((slot) => slot.slotType === "enrolled").length,
      },
      {
        label: "1:1 Slots",
        value: courseActiveSlots.filter((slot) => slot.sessionType === "premium").length,
      },
    ],
    [courseActiveSlots]
  );

  const sections = useMemo(
    () =>
      SECTION_ORDER.map((sectionId) => {
        const config = SECTION_CONFIG[sectionId];
        const items = courseSlots
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
    [courseSlots]
  );

  const activeSection = SECTION_CONFIG[activeSectionId] || SECTION_CONFIG.group;

  const resetDraftForSection = (sectionId, slot = null) => {
    const nextSlot =
      slot ||
      emptySlot(selectedCourseId, sectionId || activeSectionId);
    const nextSectionId = sectionId || activeSectionId;
    const duration = getDurationForSection(nextSectionId);
    const startTime = nextSlot.startTime || emptySlot("", nextSectionId).startTime;

    setActiveSectionId(nextSectionId);
    setEditingSlotId(slot?.localId || null);
    setSelectedTimes(new Set());
    setDayPairDropdownOpen(false);
    setDraftSlot({
      ...nextSlot,
      days: slot ? (getDayPairForDays(nextSlot.days)?.days || []) : [],
      branchId: nextSlot.branchId || "",
      startTime,
      endTime: addMinutesToTime(startTime, duration),
      maxStudents: maxStudentsFor(nextSectionId, nextSlot.branchId),
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
    if (activeSectionId === sectionId) {
      setActiveSectionId(null);
      return;
    }
    resetDraftForSection(sectionId);
  };

  const updateDraft = (patch) => {
    setDraftSlot((prev) => {
      const next = { ...prev, ...patch };
      const duration = getDurationForSection(activeSectionId);

      if (activeSectionId === "group") {
        next.slotType = "enrolled";
        next.sessionType = "standard";
        next.maxStudents = maxStudentsFor("group", next.branchId);
      } else if (activeSectionId === "individual") {
        next.slotType = "enrolled";
        next.sessionType = "premium";
        next.maxStudents = maxStudentsFor("individual", next.branchId);
      } else if (activeSectionId === "demo") {
        next.slotType = "demo";
        next.sessionType = "standard";
        next.maxStudents = maxStudentsFor("demo", next.branchId);
      }

      if (Object.prototype.hasOwnProperty.call(patch, "startTime")) {
        next.endTime = addMinutesToTime(patch.startTime, duration);
      }

      return next;
    });
  };

  const toggleDayPair = (pairId) => {
    const pair = DAY_PAIR_OPTIONS.find((o) => o.id === pairId);
    if (!pair) return;
    const isSelected =
      pair.days.length === draftSlot.days.length &&
      pair.days.every((d) => draftSlot.days.includes(d));
    updateDraft({ days: isSelected ? [] : pair.days });
    if (!editingSlotId) setSelectedTimes(new Set());
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
      const bothOffline = isOfflineCourse && !!slot.branchId;
      // Demo and enrolled slots at the same offline branch may overlap (short demo adjoins a class)
      if (slot.slotType !== (activeSectionId === "demo" ? "demo" : "enrolled") && bothOffline) return false;
      // At an offline branch, different courses can share the same time window (different rooms)
      if (bothOffline && draftSlot.courseId && slot.courseId && slot.courseId !== draftSlot.courseId) return false;

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
      toast.error("Select a valid day pair: Mon-Thu, Tue-Fri, Wed-Sat, or Sat-Sun");
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
      if (bothOffline && draftSlot.courseId && slot.courseId && slot.courseId !== draftSlot.courseId) return false;

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
    // ── Edit mode: single-slot update ────────────────────────────
    if (editingSlotId) {
      if (!validateDraftSlot()) return;
      const normalized = {
        ...draftSlot,
        days: sortDays(draftSlot.days),
        localId: editingSlotId,
        slotType: activeSectionId === "demo" ? "demo" : "enrolled",
        sessionType: activeSectionId === "individual" ? "premium" : "standard",
        maxStudents: maxStudentsFor(activeSectionId, draftSlot.branchId),
        branchId: draftSlot.branchId || "",
        isActive: draftSlot.isActive !== false,
      };
      setSlots((prev) => prev.map((s) => (s.localId === editingSlotId ? normalized : s)));
      setHasUnsavedChanges(true);
      toast.success("Slot updated locally. Save to publish the changes.");
      resetDraftForSection(activeSectionId);
      return;
    }

    // ── Add mode: multi-select ────────────────────────────────────
    if (selectedTimes.size === 0) {
      toast.error("Select at least one time slot to add");
      return;
    }
    if (courseOptions.length > 0 && !draftSlot.courseId) {
      toast.error("Select a course for this slot");
      return;
    }
    if (isOfflineCourse && !draftSlot.branchId) {
      toast.error("Select a branch for this offline course slot");
      return;
    }
    if (!getDayPairForDays(draftSlot.days)) {
      toast.error("Select a valid day pair: Mon-Thu, Tue-Fri, Wed-Sat, or Sat-Sun");
      return;
    }

    const timeOpts = TIME_OPTIONS_BY_SECTION[activeSectionId] || TIME_OPTIONS_BY_SECTION.group;
    const sortedDays = sortDays(draftSlot.days);
    const newSlots = [];

    for (const timeId of selectedTimes) {
      const option = timeOpts.find((o) => o.id === timeId);
      if (!option) continue;
      newSlots.push({
        ...draftSlot,
        startTime: option.startTime,
        endTime: option.endTime,
        days: sortedDays,
        localId: createLocalId(),
        slotType: activeSectionId === "demo" ? "demo" : "enrolled",
        sessionType: activeSectionId === "individual" ? "premium" : "standard",
        maxStudents: maxStudentsFor(activeSectionId, draftSlot.branchId),
        branchId: draftSlot.branchId || "",
        isActive: true,
      });
    }

    if (!newSlots.length) return;
    setSlots((prev) => [...prev, ...newSlots]);
    setHasUnsavedChanges(true);
    // Preserve course / branch / day pair — only clear the time selection
    setSelectedTimes(new Set());
    toast.success(`${newSlots.length} slot(s) added locally. Save to publish.`);
  };

  const openEditSlot = (slot) => {
    setSelectedTimes(new Set());
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
            : maxStudentsFor("group", slot.branchId),
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
    const selectedPair = getDayPairForDays(draftSlot.days);

    return (
      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="relative block" ref={dayPairDropdownRef}>
            <span className="mb-2 block text-sm font-medium text-slate-900">
              Select Day Pair <span className="text-rose-500">*</span>
            </span>
            <button
              type="button"
              onClick={() => setDayPairDropdownOpen((prev) => !prev)}
              className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-300"
            >
              <span className={selectedPair ? "text-slate-700" : "text-slate-400"}>
                {selectedPair ? selectedPair.label : "Select a day pair"}
              </span>
              <FiChevronDown
                className={`shrink-0 transition-transform ${dayPairDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>
            {dayPairDropdownOpen && (
              <div className="absolute left-0 top-full z-10 mt-1 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                {DAY_PAIR_OPTIONS.map((pair) => {
                  const isChecked = selectedPair?.id === pair.id;
                  return (
                    <label
                      key={pair.id}
                      className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-slate-50"
                    >
                      <input
                        type="radio"
                        checked={isChecked}
                        onChange={() => toggleDayPair(pair.id)}
                        className="h-4 w-4 cursor-pointer accent-slate-900"
                      />
                      <div>
                        <span className="text-sm font-semibold text-slate-800">{pair.label}</span>
                        <span className="ml-2 text-xs text-slate-400">{pair.helper}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

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
                Max {activeSectionId === "group" && isOfflineCourse
                  ? "Unlimited"
                  : SLOT_MAX_STUDENTS[activeSectionId]}
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
                    : `Disabled slots overlap with an existing slot on the selected days.`}
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
          <>
          <div className="grid max-h-72 gap-2 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {timeOptions.map((option) => {
              const disabledReason = getTimeOptionDisabledReason(
                option,
                draftSlot.days
              );
              const isDisabled = Boolean(disabledReason);
              const isSelected = editingSlotId
                ? draftSlot.startTime === option.startTime && draftSlot.endTime === option.endTime
                : selectedTimes.has(option.id);

              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={isDisabled}
                  title={disabledReason || undefined}
                  onClick={() => {
                    if (editingSlotId) {
                      updateDraft({ startTime: option.startTime, endTime: option.endTime });
                    } else {
                      setSelectedTimes((prev) => {
                        const next = new Set(prev);
                        if (next.has(option.id)) next.delete(option.id);
                        else next.add(option.id);
                        return next;
                      });
                    }
                  }}
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
          {!editingSlotId && selectedTimes.size > 0 && (
            <p className="mt-2 text-xs font-medium text-slate-600">
              {selectedTimes.size} time slot{selectedTimes.size !== 1 ? "s" : ""} selected
            </p>
          )}
          </>
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
            <p className="mt-1">
              {editingSlotId ? "Editing:" : "Selected:"}{" "}
              <span className="font-medium text-slate-700">
                {editingSlotId
                  ? `${convertTo12Hour(draftSlot.startTime)} – ${convertTo12Hour(draftSlot.endTime)}`
                  : selectedTimes.size > 0
                    ? `${selectedTimes.size} time slot${selectedTimes.size !== 1 ? "s" : ""}`
                    : "None"}
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
              {editingSlotId
                ? "Update slot"
                : selectedTimes.size > 1
                  ? `Add ${selectedTimes.size} slots`
                  : "Add slot"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-8">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-950">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>

        {!courseOptions.length ? (
          <div className="mt-6 rounded-[28px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
            No assigned courses were found for this instructor. Please ask admin
            to assign at least one course before publishing availability.
          </div>
        ) : (
          <>
            <p className="mb-3 mt-6 text-sm font-semibold text-slate-900">
              Select a course to manage its schedule
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {courseOptions.map((course) => {
                const isSelected = selectedCourseId === course.id;
                return (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => setSelectedCourseId(course.id)}
                    className={`flex overflow-hidden rounded-[24px] border-2 text-left transition ${
                      isSelected ? "border-orange-300 shadow-sm" : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <img
                      src={resolveImageUrl(course.image)}
                      alt={course.label}
                      className="h-24 w-2/5 shrink-0 object-cover"
                      onError={(e) => { e.target.src = "/music.png"; }}
                    />
                    <div className="flex flex-col justify-center p-4">
                      <div className="mb-1.5 flex flex-wrap gap-1.5">
                        <span className="flex items-center gap-1 rounded-full border border-slate-200 bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700">
                          <DynamicCourseIcon category={course.category} />
                          {course.category?.name || "Course"}
                        </span>
                        {course.mode === "offline" && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                            Offline
                          </span>
                        )}
                      </div>
                      <h3 className="line-clamp-1 text-sm font-semibold text-slate-900">{course.label}</h3>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </section>

      {selectedCourse && (
      <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">Schedule</p>
            <h2 className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-950">
              {selectedCourse.label}
            </h2>

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

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {summaryCards.map((item) => (
              <div
                key={item.label}
                className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3"
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
                <div>
                  <div className="flex items-center gap-3">
                    <p className={`text-[30px] font-semibold tracking-tight ${section.tone}`}>
                      {section.title}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleSectionChange(section.id)}
                      className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium transition ${
                        isActiveSection
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {isActiveSection ? <FiMinus /> : <FiPlus />}
                      {isActiveSection
                        ? editingSlotId
                          ? "Editing slot"
                          : "Close"
                        : "Add slot"}
                    </button>
                  </div>
                  <p className="mt-2 max-w-3xl text-sm text-slate-500">
                    {section.description}
                  </p>
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
                            Max {formatMaxStudents(slot.maxStudents)}
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
      )}
    </div>
  );
};

export default Availability;
