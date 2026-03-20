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

const createLocalId = () =>
  `slot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const emptySlot = (courseId = "", sectionId = "group") => {
  const section = SECTION_CONFIG[sectionId] || SECTION_CONFIG.group;
  const sessionType = section.sessionType || "standard";

  return {
    localId: createLocalId(),
    days: [],
    startTime: sectionId === "individual" ? "15:20" : "16:00",
    endTime: sectionId === "individual" ? "16:00" : "17:00",
    sessionType,
    slotType: section.slotType,
    maxStudents: sessionType === "premium" ? 1 : 4,
    courseId,
    isActive: true,
  };
};

const toMinutes = (time) => {
  if (!time || !String(time).includes(":")) return NaN;
  const [hours, minutes] = String(time).split(":").map(Number);
  return hours * 60 + minutes;
};

const convertTo12Hour = (value) => {
  const time = String(value || "").trim();
  if (!time) return "";
  if (time.includes("AM") || time.includes("PM")) return time;
  const [hours, minutes] = time.split(":");
  const hour = Number(hours);
  if (Number.isNaN(hour)) return time;
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${period}`;
};

const normalizeCourseOptions = (source) => {
  const rawCourses =
    source?.courses || source?.course || source?.roleId?.course || [];

  return rawCourses
    .map((course, index) => {
      if (typeof course === "string") {
        return {
          id: course,
          label: `Assigned Course ${index + 1}`,
        };
      }

      const id = String(course?._id || course?.id || "").trim();
      if (!id) return null;

      return {
        id,
        label:
          course?.name || course?.title || course?.code || `Course ${index + 1}`,
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
      (slot?.sessionType === "premium" ? 1 : 4),
    courseId: String(slot?.courseId?._id || slot?.courseId || "").trim(),
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
  const [activeSectionId, setActiveSectionId] = useState("group");
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
    setDraftSlot(emptySlot(courseOptions[0]?.id || "", activeSectionId));
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

    setActiveSectionId(sectionId);
    setEditingSlotId(slot?.localId || null);
    setDraftSlot({
      ...nextSlot,
      days: sortDays(nextSlot.days || []),
      maxStudents:
        Number(nextSlot.maxStudents) ||
        (nextSlot.sessionType === "premium" ? 1 : 4),
      slotType: sectionId === "demo" ? "demo" : "enrolled",
      sessionType:
        sectionId === "group"
          ? "standard"
          : sectionId === "individual"
            ? "premium"
            : nextSlot.sessionType || "standard",
    });
  };

  const handleSectionChange = (sectionId) => {
    resetDraftForSection(sectionId);
  };

  const updateDraft = (patch) => {
    setDraftSlot((prev) => {
      const next = { ...prev, ...patch };

      if (activeSectionId === "group") {
        next.slotType = "enrolled";
        next.sessionType = "standard";
        if (!next.maxStudents || next.maxStudents < 2) {
          next.maxStudents = 4;
        }
      } else if (activeSectionId === "individual") {
        next.slotType = "enrolled";
        next.sessionType = "premium";
        next.maxStudents = 1;
      } else if (
        activeSectionId === "demo" &&
        Object.prototype.hasOwnProperty.call(patch, "sessionType")
      ) {
        next.slotType = "demo";
        next.maxStudents =
          patch.sessionType === "premium"
            ? 1
            : Number(next.maxStudents) || 4;
      }

      return next;
    });
  };

  const toggleDay = (day) => {
    setDraftSlot((prev) => ({
      ...prev,
      days: sortDays(
        prev.days.includes(day)
          ? prev.days.filter((item) => item !== day)
          : [...prev.days, day]
      ),
    }));
  };

  const validateDraftSlot = () => {
    if (!draftSlot.days.length) {
      toast.error("Select at least one day");
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

    if (courseOptions.length > 0 && !draftSlot.courseId) {
      toast.error("Select a course for this slot");
      return false;
    }

    const overlappingSlot = slots.find((slot) => {
      if (slot.localId === editingSlotId) return false;
      if (slot.isActive === false) return false;

      const sharesDay = slot.days.some((day) => draftSlot.days.includes(day));
      if (!sharesDay) return false;

      const start = toMinutes(draftSlot.startTime);
      const end = toMinutes(draftSlot.endTime);
      const existingStart = toMinutes(slot.startTime);
      const existingEnd = toMinutes(slot.endTime);

      return start < existingEnd && end > existingStart;
    });

    if (overlappingSlot) {
      toast.error("This slot overlaps with another active schedule entry");
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
      maxStudents:
        activeSectionId === "individual"
          ? 1
          : Number(draftSlot.maxStudents) ||
            (draftSlot.sessionType === "premium" ? 1 : 4),
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
      sessionType: slot.sessionType,
      slotType: slot.slotType,
      maxStudents:
        Number(slot.maxStudents) ||
        (slot.sessionType === "premium" ? 1 : 4),
      ...(slot.courseId ? { courseId: slot.courseId } : {}),
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
    const isDemoSection = activeSectionId === "demo";
    const isIndividualSection = activeSectionId === "individual";

    return (
      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr_0.9fr_0.9fr]">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-900">
              Select Course
            </span>
            <select
              value={draftSlot.courseId}
              onChange={(event) => updateDraft({ courseId: event.target.value })}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-300"
            >
              <option value="">Choose course</option>
              {courseOptions.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.label}
                </option>
              ))}
            </select>
          </label>

          <div>
            <span className="mb-2 block text-sm font-medium text-slate-900">
              Select Days
            </span>
            <div className="flex min-h-[52px] flex-wrap gap-2 rounded-2xl border border-slate-200 px-3 py-3">
              {DAYS.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    draftSlot.days.includes(day)
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {DAY_LABELS[day]}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-900">
              Start Time
            </span>
            <input
              type="time"
              value={draftSlot.startTime}
              onChange={(event) => updateDraft({ startTime: event.target.value })}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-300"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-900">
              End Time
            </span>
            <input
              type="time"
              value={draftSlot.endTime}
              onChange={(event) => updateDraft({ endTime: event.target.value })}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-300"
            />
          </label>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr_auto]">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-900">
              Session Type
            </span>
            {isDemoSection ? (
              <select
                value={draftSlot.sessionType}
                onChange={(event) =>
                  updateDraft({ sessionType: event.target.value })
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-300"
              >
                <option value="standard">Standard demo</option>
                <option value="premium">Premium demo</option>
              </select>
            ) : (
              <div className="flex h-[50px] items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700">
                {isIndividualSection ? "Premium 1:1 session" : "Standard group session"}
              </div>
            )}
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-900">
              Max Students
            </span>
            <input
              type="number"
              min="1"
              max="10"
              disabled={isIndividualSection}
              value={draftSlot.maxStudents}
              onChange={(event) =>
                updateDraft({
                  maxStudents: Number(event.target.value) || 1,
                })
              }
              className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${
                isIndividualSection
                  ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-500"
                  : "border-slate-200 bg-white text-slate-700 focus:border-slate-300"
              }`}
            />
          </label>

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

        <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
          Selected days:{" "}
          <span className="font-medium text-slate-700">
            {buildDaySummary(draftSlot.days)}
          </span>
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
            <p>`demo` slots feed instructor demo booking availability.</p>
            <p>`enrolled` slots feed regular class scheduling for paid enrollments.</p>
            <p>These rows are online-only, so branch selection is intentionally skipped here.</p>
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
