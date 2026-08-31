"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LuSearch, LuSlidersHorizontal, LuX, LuStar, LuMapPin, LuLanguages } from "react-icons/lu";
import { motion, AnimatePresence } from "framer-motion";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchCourses } from "@/store/courseSlice";
import {
  getCoursePlaceholderImage,
  resolveImageUrl,
} from "@/lib/resolveImageUrl";
import { buildBranchSummary, buildTeacherName } from "@/helpers/courseSlots";

/* ─── Card ─────────────────────────────────────────────────────── */
function CourseCard({ course, courseFallbackImage }) {
  const href = `/courses/${course.id}`;
  const demoHref = `/courses/${course.id}?action=demo`;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      whileHover={{ y: -6, boxShadow: "0 20px 48px -12px rgba(0,0,0,0.14)" }}
      className="group relative flex flex-col overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm transition-shadow duration-300"
    >
      {/* Image */}
      <div className="relative h-48 sm:h-52 overflow-hidden">
        <img
          src={course.image}
          alt={course.title}
          loading="lazy"
          decoding="async"
          onError={(e) => { e.currentTarget.src = courseFallbackImage; }}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-106"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />

        {/* Category chip — top left */}
        {course.category && (
          <span className="absolute top-3 left-3 rounded-full bg-white/90 backdrop-blur-sm px-2.5 py-1 text-[11px] font-semibold text-gray-800 shadow-sm">
            {course.category}
          </span>
        )}

        {/* Mode pill — top right */}
        <span
          className={`absolute top-3 right-3 rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm ${
            course.mode === "online"
              ? "bg-emerald-500/90 text-white"
              : "bg-gray-800/80 text-white"
          }`}
        >
          {course.mode === "online" ? "Online" : "Offline"}
        </span>

        {/* Price — bottom left on image */}
        <div className="absolute bottom-3 left-3">
          <span className="text-white font-bold text-base drop-shadow">
            {course.price > 0 ? `₹${course.price.toLocaleString("en-IN")}/mo` : "Free"}
          </span>
        </div>

        {/* Rating — bottom right on image */}
        {course.rating > 0 && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-black/40 backdrop-blur-sm px-2 py-0.5">
            <LuStar className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="text-white text-xs font-medium">{course.rating}</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h3 className="font-bold text-gray-900 line-clamp-2 text-base leading-snug">
          {course.title}
        </h3>

        <p className="mt-1.5 text-sm text-gray-500 line-clamp-1">
          by <span className="font-medium text-gray-700">{course.mentor}</span>
        </p>

        {course.mode !== "online" && course.branchSummary && (
          <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
            <LuMapPin className="w-3 h-3 shrink-0 text-[#CC3700]" />
            <span className="line-clamp-1">{course.branchSummary}</span>
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {course.level && (
            <span className="inline-block w-fit rounded-full bg-orange-50 border border-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-600 capitalize">
              {course.level}
            </span>
          )}

          {course.languages.length > 0 && (
            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-violet-50 border border-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">
              <LuLanguages className="w-3 h-3 shrink-0" />
              <span className="line-clamp-1">{course.languages.join(", ")}</span>
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
          <Link
            href={href}
            className="relative z-10 rounded-xl bg-[#CC3700] py-2 px-3 text-center text-sm font-semibold text-white transition hover:bg-[#B83100] active:bg-[#e04d1c]"
          >
            View Details
          </Link>
          <Link
            href={demoHref}
            className="relative z-10 rounded-xl border border-[#CC3700] py-2 px-3 text-center text-sm font-semibold text-[#CC3700] transition hover:bg-orange-50"
          >
            Book Demo
          </Link>
        </div>
      </div>

      {/* Stretched link — placed last so it paints above the image/badges
          (no explicit z-index of their own) and makes the whole card a
          real, right-click/new-tab-able link. The two actions above have
          an explicit z-10 so they stay independently clickable regardless
          of DOM order. */}
      <Link href={href} className="absolute inset-0 z-0" tabIndex={-1} aria-hidden="true" />
    </motion.article>
  );
}

/* ─── Empty state ───────────────────────────────────────────────── */
function EmptyState({ onClear }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="col-span-full flex flex-col items-center justify-center py-24 text-center"
    >
      <div className="text-6xl mb-4">🎵</div>
      <h3 className="text-xl font-bold text-gray-800">No courses found</h3>
      <p className="mt-2 text-sm text-gray-500 max-w-xs">
        Try adjusting your search or filters to find what you&apos;re looking for.
      </p>
      <button
        onClick={onClear}
        className="mt-6 rounded-full bg-[#CC3700] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#B83100] transition"
      >
        Clear all filters
      </button>
    </motion.div>
  );
}

/* ─── Skeleton ──────────────────────────────────────────────────── */
function CardSkeleton() {
  return (
    <div className="animate-pulse flex flex-col overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm">
      <div className="h-48 bg-gray-200" />
      <div className="p-5 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-3 bg-gray-200 rounded w-1/3" />
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="h-9 bg-gray-200 rounded-xl" />
          <div className="h-9 bg-gray-200 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/* ─── Main content ──────────────────────────────────────────────── */
function CoursesPageContent({ initialCourses = [] }) {
  const dispatch = useDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const courseState = useSelector((state) => state.course);
  // Server-fetched courses seed the first (SSR) render; once the client store
  // hydrates with its own fetch, that takes over. This is what gives the page
  // real HTML content for SEO/LCP instead of an empty client-only shell.
  const courses =
    courseState.courses && courseState.courses.length
      ? courseState.courses
      : initialCourses;
  const loading = courseState.loading;
  const error = courseState.error;

  const [search, setSearch] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [maxPrice, setMaxPrice] = useState(10000);
  const courseFallbackImage = getCoursePlaceholderImage();

  const normalizeValue = (value) => String(value || "").trim().toLowerCase();
  const readCategoryFromQuery = () => (searchParams.get("category") || "").trim();
  const readModeFromQuery = () => {
    const mode = normalizeValue(searchParams.get("mode"));
    return mode === "online" || mode === "offline" ? mode : "";
  };

  const readLanguageFromQuery = () => (searchParams.get("language") || "").trim();

  const [selectedCategory, setSelectedCategory] = useState(readCategoryFromQuery);
  const [selectedMode, setSelectedMode] = useState(readModeFromQuery);
  const [selectedLanguage, setSelectedLanguage] = useState(readLanguageFromQuery);
  const searchParamsString = searchParams.toString();
  const categoryFromQuery = readCategoryFromQuery();
  const modeFromQuery = readModeFromQuery();
  const languageFromQuery = readLanguageFromQuery();

  const writeFiltersToUrl = ({
    category = selectedCategory,
    mode = selectedMode,
    language = selectedLanguage,
  } = {}) => {
    const nextParams = new URLSearchParams(searchParamsString);
    const nextCategory = String(category || "").trim();
    const nextMode = normalizeValue(mode);
    const nextLanguage = String(language || "").trim();
    if (nextCategory) nextParams.set("category", nextCategory); else nextParams.delete("category");
    if (nextMode) nextParams.set("mode", nextMode); else nextParams.delete("mode");
    if (nextLanguage) nextParams.set("language", nextLanguage); else nextParams.delete("language");
    if (!nextCategory && !nextMode && !nextLanguage) nextParams.delete("intent");
    const nextQuery = nextParams.toString();
    const nextHref = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    const currentHref = searchParamsString ? `${pathname}?${searchParamsString}` : pathname;
    if (nextHref !== currentHref) router.replace(nextHref, { scroll: false });
  };

  const updateCategoryFilter = (category) => {
    setSelectedCategory(category);
    writeFiltersToUrl({ category, mode: selectedMode });
  };
  const updateModeFilter = (mode) => {
    const n = normalizeValue(mode);
    setSelectedMode(n);
    writeFiltersToUrl({ category: selectedCategory, mode: n });
  };
  const updateLanguageFilter = (language) => {
    setSelectedLanguage(language);
    writeFiltersToUrl({ language });
  };
  const clearSelectedFilters = () => {
    setSelectedCategory(""); setSelectedMode(""); setSelectedLanguage(""); setMaxPrice(10000);
    writeFiltersToUrl({ category: "", mode: "", language: "" });
  };

  const transformCourses = (rawCourses) => {
    if (!Array.isArray(rawCourses)) return [];
    return rawCourses
      .filter((c) => c?.isPublished !== false)
      .map((course) => {
        const selectedPrice = Array.isArray(course.price)
          ? course.price.find((p) => p.isSelected) || course.price[0]
          : null;
        return {
          id: course._id,
          title: course.name || "Untitled Course",
          category: course.category?.name || "Not specified",
          level: course.level || "Beginner",
          mode: course.mode || "online",
          languages: Array.isArray(course.languages) ? course.languages : [],
          price: selectedPrice?.monthlyFee || selectedPrice?.fullPayment || 0,
          image: resolveImageUrl(course.image, courseFallbackImage),
          rating: course.rating || 0,
          mentor: course.teacher?.[0] ? buildTeacherName(course.teacher[0]) : "Expert Instructor",
          branchSummary: buildBranchSummary(course.branches),
        };
      });
  };

  // Server already provided ISR-fresh courses (revalidate=300); only fetch on
  // the client as a fallback when SSR returned nothing — avoids the double-fetch.
  useEffect(() => {
    if (initialCourses.length) return;
    dispatch(fetchCourses());
  }, [dispatch, initialCourses.length]);

  const transformedCourses = useMemo(() => transformCourses(courses), [courses]);

  const filteredCourses = transformedCourses.filter((course) => {
    const matchesSearch = course.title.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory ? normalizeValue(course.category) === normalizeValue(selectedCategory) : true;
    const matchesMode = selectedMode ? normalizeValue(course.mode) === normalizeValue(selectedMode) : true;
    const matchesPrice = course.price <= maxPrice;
    const matchesLanguage = selectedLanguage
      ? course.languages.some((l) => normalizeValue(l) === normalizeValue(selectedLanguage))
      : true;
    return matchesSearch && matchesCategory && matchesMode && matchesPrice && matchesLanguage;
  });

  const categories = useMemo(
    () => [...new Set(transformedCourses.map((c) => c.category).filter(Boolean))],
    [transformedCourses]
  );

  const languages = useMemo(
    () => [...new Set(transformedCourses.flatMap((c) => c.languages).filter(Boolean))],
    [transformedCourses]
  );

  useEffect(() => {
    setSelectedCategory((c) => c === categoryFromQuery ? c : categoryFromQuery);
    setSelectedMode((m) => m === modeFromQuery ? m : modeFromQuery);
    setSelectedLanguage((l) => l === languageFromQuery ? l : languageFromQuery);
  }, [categoryFromQuery, modeFromQuery, languageFromQuery, searchParamsString]);

  const hasActiveFilters = selectedCategory || selectedMode || selectedLanguage || maxPrice < 10000;

  return (
    <>
      {/* ── Hero — compact: this is a listing page, courses are the
          content the visitor came for, not the hero copy. ─────── */}
      <section className="relative overflow-hidden bg-[#09090f] py-10 md:py-12 px-4 sm:px-6 rounded-b-[40px]">
        {/* Orbs */}
        <div className="orb absolute -top-32 -left-32 w-[400px] h-[400px] bg-orange-500/18" style={{ "--dur": "16s" }} />
        <div className="orb absolute top-0 right-0 w-80 h-80 bg-purple-600/12" style={{ "--dur": "20s", animationDelay: "4s" }} />
        <div className="orb absolute bottom-0 left-1/3 w-72 h-72 bg-teal-500/10" style={{ "--dur": "18s", animationDelay: "8s" }} />

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <span
            className="fade-in-up inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-sm font-medium text-orange-400"
            style={{ "--fade-y": "12px", "--fade-dur": "0.6s" }}
          >
            Explore Courses
          </span>
          <h1
            className="fade-in-up mt-3 text-3xl md:text-4xl font-extrabold text-white leading-tight"
            style={{ "--fade-y": "20px", "--fade-dur": "0.6s", "--fade-delay": "0.1s" }}
          >
            Find Your{" "}
            <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              Creative Path
            </span>
          </h1>
          <p
            className="fade-in-up mt-3 text-sm text-white/60 max-w-2xl mx-auto"
            style={{ "--fade-y": "12px", "--fade-dur": "0.6s", "--fade-delay": "0.15s" }}
          >
            Music · Dance · Languages — find the path that lights you up
          </p>

          {/* Search bar */}
          <div
            className="fade-in-up mt-5 flex items-center gap-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 px-4 py-2.5 shadow-lg transition focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-200"
            style={{ "--fade-y": "12px", "--fade-dur": "0.5s", "--fade-delay": "0.2s" }}
          >
            <LuSearch className="w-4 h-4 text-white/50 shrink-0" />
            <input
              type="text"
              placeholder="Search courses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-white placeholder-white/40 text-sm outline-none"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-white/40 hover:text-white/70 transition">
                <LuX className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── Filters strip ─────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          {/* Category chips */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide flex-1 min-w-0">
            {["", ...categories].map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat || "__all__"}
                  onClick={() => updateCategoryFilter(cat)}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-[#CC3700] text-white shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {cat || "All"}
                </button>
              );
            })}
          </div>

          {/* Mode toggle */}
          <div className="hidden sm:flex gap-1 shrink-0 rounded-xl bg-gray-100 p-1">
            {["", "online", "offline"].map((m) => (
              <button
                key={m || "__all__"}
                onClick={() => updateModeFilter(m)}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all duration-200 ${
                  selectedMode === m
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {m === "" ? "All" : m === "online" ? "🌐 Online" : "📍 Offline"}
              </button>
            ))}
          </div>

          {/* Advanced filter button */}
          <button
            onClick={() => setShowFilter(true)}
            className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold border transition ${
              hasActiveFilters
                ? "border-[#CC3700] bg-orange-50 text-[#CC3700]"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <LuSlidersHorizontal className="w-3.5 h-3.5" />
            Filter
            {hasActiveFilters && (
              <span className="w-4 h-4 rounded-full bg-[#CC3700] text-white text-[10px] flex items-center justify-center">
                !
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Active filter summary ───────────────────────────────── */}
      <AnimatePresence>
        {hasActiveFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-orange-50 border-b border-orange-100"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-3 flex-wrap">
              <p className="text-xs text-orange-700 font-medium">Active filters:</p>
              {selectedCategory && (
                <button
                  onClick={() => updateCategoryFilter("")}
                  className="flex items-center gap-1.5 rounded-full bg-white border border-orange-200 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-orange-100 transition"
                >
                  {selectedCategory} <LuX className="w-3 h-3" />
                </button>
              )}
              {selectedMode && (
                <button
                  onClick={() => updateModeFilter("")}
                  className="flex items-center gap-1.5 rounded-full bg-white border border-orange-200 px-3 py-1 text-xs font-medium capitalize text-gray-700 hover:bg-orange-100 transition"
                >
                  {selectedMode} <LuX className="w-3 h-3" />
                </button>
              )}
              {maxPrice < 10000 && (
                <button
                  onClick={() => setMaxPrice(10000)}
                  className="flex items-center gap-1.5 rounded-full bg-white border border-orange-200 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-orange-100 transition"
                >
                  ≤ ₹{maxPrice.toLocaleString("en-IN")} <LuX className="w-3 h-3" />
                </button>
              )}
              <button
                onClick={clearSelectedFilters}
                className="ml-auto text-xs text-orange-600 font-medium hover:text-orange-700 transition"
              >
                Clear all
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Filter drawer ────────────────────────────────────────── */}
      <AnimatePresence>
        {showFilter && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowFilter(false)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-bold text-gray-900">Filter Courses</h2>
                <button onClick={() => setShowFilter(false)} className="rounded-full p-1 hover:bg-gray-100 transition">
                  <LuX className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Category</p>
                  <div className="flex flex-wrap gap-2">
                    {["", ...categories].map((cat) => (
                      <button
                        key={cat || "__all__"}
                        onClick={() => updateCategoryFilter(cat)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                          selectedCategory === cat
                            ? "bg-[#CC3700] text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {cat || "All"}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Mode</p>
                  <div className="flex gap-2">
                    {["", "online", "offline"].map((m) => (
                      <button
                        key={m || "__all__"}
                        onClick={() => updateModeFilter(m)}
                        className={`flex-1 rounded-xl py-2 text-xs font-semibold transition ${
                          selectedMode === m
                            ? "bg-[#CC3700] text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {m === "" ? "All" : m === "online" ? "🌐 Online" : "📍 Offline"}
                      </button>
                    ))}
                  </div>
                </div>

                {languages.length > 1 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Language</p>
                    <div className="flex flex-wrap gap-2">
                      {["", ...languages].map((language) => (
                        <button
                          key={language || "__all__"}
                          onClick={() => updateLanguageFilter(language)}
                          className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                            selectedLanguage === language
                              ? "bg-[#CC3700] text-white"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {language || "All"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Max Price / Month</p>
                    <span className="text-sm font-bold text-[#CC3700]">₹{maxPrice.toLocaleString("en-IN")}</span>
                  </div>
                  <input
                    type="range" min="0" max="10000" step="500"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="w-full accent-orange-500"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>₹0</span><span>₹10,000</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => { clearSelectedFilters(); setShowFilter(false); }}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Reset
                </button>
                <button
                  onClick={() => setShowFilter(false)}
                  className="flex-1 rounded-xl bg-[#CC3700] py-2.5 text-sm font-semibold text-white hover:bg-[#B83100] transition"
                >
                  Apply
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Grid ─────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-10">
        {loading && transformedCourses.length === 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : (
          <>
            {filteredCourses.length > 0 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-gray-500 mb-5"
              >
                <span className="font-semibold text-gray-800">{filteredCourses.length}</span>{" "}
                {filteredCourses.length === 1 ? "course" : "courses"} found
              </motion.p>
            )}

            <AnimatePresence mode="popLayout">
              <motion.div layout className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredCourses.length === 0 ? (
                  <EmptyState onClear={clearSelectedFilters} />
                ) : (
                  filteredCourses.map((course) => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      courseFallbackImage={courseFallbackImage}
                    />
                  ))
                )}
              </motion.div>
            </AnimatePresence>
          </>
        )}
      </section>
    </>
  );
}

function CoursesPageFallback() {
  return (
    <section className="mx-auto flex max-w-7xl flex-col items-center justify-center px-6 py-24">
      <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      <p className="text-base text-gray-500">Loading courses…</p>
    </section>
  );
}

export default function CoursesClient({ initialCourses = [] }) {
  return (
    <Suspense fallback={<CoursesPageFallback />}>
      <CoursesPageContent initialCourses={initialCourses} />
    </Suspense>
  );
}
