"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { HiChevronRight, HiSearch } from "react-icons/hi";
import api from "@/lib/axios";
import { fetchCategories } from "@/store/categorySlice";
import { fetchCourses } from "@/store/courseSlice";
import { useModalA11y } from "@/hooks/useModalA11y";
import { useHistoryStep } from "@/hooks/useHistoryStep";
import { getCoursePlaceholderImage, resolveImageUrl } from "@/lib/resolveImageUrl";
import { normalizeMode } from "@/helpers/courseSlots";
import BookDemoModal from "./BookDemoModal";
import DemoSheet from "./BookDemoParts/DemoSheet";

const MODES = [
  { value: "all", label: "All" },
  { value: "online", label: "Online" },
  { value: "offline", label: "At a centre" },
];

const chipClass = (selected) =>
  `min-h-12 rounded-2xl border-2 px-4 text-[15px] font-semibold transition ${
    selected
      ? "border-[#CC3700] bg-[#CC3700] text-white"
      : "border-slate-200 bg-white text-slate-800 hover:border-orange-200"
  }`;

const searchText = (course) =>
  [
    course.name,
    course.category?.name,
    ...(Array.isArray(course.subCategory) ? course.subCategory.map((sub) => sub?.name) : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

// Home page "Book a Demo": pick a course on one screen, then the demo flow
// opens in place, without visiting the course list or the course page.
export default function DemoCoursePicker({ isOpen, onClose }) {
  const dispatch = useDispatch();
  const { categories = [], status: categoryStatus } = useSelector((state) => state.category || {});
  const { courses = [], loading: coursesLoading } = useSelector((state) => state.course || {});

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [mode, setMode] = useState("all");
  const [opening, setOpening] = useState("");
  const [openError, setOpenError] = useState("");
  const [course, setCourse] = useState(null);
  const loaded = useRef(new Map());
  const panelRef = useRef(null);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const closeAll = useCallback(() => {
    setCourse(null);
    onCloseRef.current?.();
  }, []);

  useModalA11y(isOpen && !course, closeAll, panelRef);
  useHistoryStep(isOpen ? 1 : 0, closeAll);

  useEffect(() => {
    if (!isOpen) return undefined;
    if (categoryStatus === "idle") dispatch(fetchCategories());
    dispatch(fetchCourses());
    setOpenError("");
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [categoryStatus, dispatch, isOpen]);

  const categoryOptions = useMemo(
    () =>
      [...new Set(
        categories
          .filter((item) => !item.status || item.status === "published")
          .map((item) => item.name)
          .filter(Boolean)
      )],
    [categories]
  );

  const visibleCourses = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return courses
      .filter((item) => item?.isPublished !== false)
      .filter((item) => category === "all" || item.category?.name === category)
      .filter((item) => mode === "all" || normalizeMode(item.mode) === mode)
      .filter((item) => {
        const text = searchText(item);
        return words.every((word) => text.includes(word));
      });
  }, [category, courses, mode, query]);

  const openCourse = async (courseId) => {
    setOpening(courseId);
    setOpenError("");
    try {
      if (!loaded.current.has(courseId)) {
        const { data } = await api.get(`/v1/course/get/${courseId}`);
        loaded.current.set(courseId, data.data);
      }
      setCourse(loaded.current.get(courseId));
    } catch {
      setOpenError("We couldn't open that course. Please check your internet and try again.");
    } finally {
      setOpening("");
    }
  };

  const resetFilters = () => {
    setQuery("");
    setCategory("all");
    setMode("all");
  };

  if (!isOpen) return null;

  if (course) {
    return (
      <BookDemoModal
        isOpen
        course={course}
        source="hero"
        historyBase={1}
        onBack={() => setCourse(null)}
        onClose={closeAll}
      />
    );
  }

  return (
    <DemoSheet
      panelRef={panelRef}
      labelledBy="demo-course-picker-heading"
      title="Book a free demo"
      subtitle="What would you like to learn?"
      onClose={closeAll}
    >
      <div className="space-y-5">
        <label className="relative block">
          <span className="sr-only">Search courses</span>
          <HiSearch aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-500" />
          <input
            type="search"
            enterKeyHint="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search guitar, dance, French…"
            className="block min-h-12 w-full rounded-2xl border-2 border-slate-200 bg-white pl-11 pr-4 text-base text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-[#FF6B35] focus:ring-2 focus:ring-orange-100"
          />
        </label>

        {categoryOptions.length ? (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Subject">
            {["all", ...categoryOptions].map((name) => (
              <button
                key={name}
                type="button"
                aria-pressed={category === name}
                onClick={() => setCategory(name)}
                className={chipClass(category === name)}
              >
                {name === "all" ? "All" : name}
              </button>
            ))}
          </div>
        ) : null}

        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Where you learn">
          {MODES.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={mode === option.value}
              onClick={() => setMode(option.value)}
              className={`${chipClass(mode === option.value)} px-2`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {openError ? (
          <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-[15px] font-medium text-rose-800 ring-1 ring-rose-200">
            {openError}
          </p>
        ) : null}

        {coursesLoading && !courses.length ? (
          <div aria-busy="true" className="space-y-3">
            <p className="text-[15px] font-medium text-slate-700">Loading courses…</p>
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="h-[72px] animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : visibleCourses.length ? (
          <ul className="space-y-2">
            {visibleCourses.map((item) => {
              const offline = normalizeMode(item.mode) === "offline";
              const busy = opening === item._id;
              return (
                <li key={item._id}>
                  <button
                    type="button"
                    disabled={Boolean(opening)}
                    onClick={() => openCourse(item._id)}
                    className="flex min-h-[72px] w-full items-center gap-3 rounded-2xl border-2 border-slate-200 bg-white p-2.5 text-left transition hover:border-orange-200 disabled:cursor-wait"
                  >
                    <img
                      src={resolveImageUrl(item.image, getCoursePlaceholderImage())}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-xl object-cover"
                      onError={(event) => {
                        event.currentTarget.src = getCoursePlaceholderImage();
                      }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base font-semibold text-slate-900">{item.name}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-slate-600">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            offline ? "bg-teal-50 text-teal-800" : "bg-orange-50 text-[#B83100]"
                          }`}
                        >
                          {offline ? "At a centre" : "Online"}
                        </span>
                        {item.category?.name ? <span className="truncate">{item.category.name}</span> : null}
                      </span>
                    </span>
                    <span className="shrink-0 pr-1 text-sm font-semibold text-slate-600">
                      {busy ? "Opening…" : <HiChevronRight aria-hidden="true" className="text-2xl" />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-slate-300 p-6 text-center">
            <p className="text-[17px] font-bold text-slate-900">No courses match</p>
            <p className="mt-1 text-[15px] text-slate-700">Try another subject or search word.</p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-white px-6 text-[15px] font-semibold text-slate-800 ring-2 ring-slate-200 transition hover:ring-orange-200"
            >
              Show all courses
            </button>
          </div>
        )}
      </div>
    </DemoSheet>
  );
}
