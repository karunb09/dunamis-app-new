"use client";
import { AnimatePresence, motion } from "framer-motion";
import { LuMapPin, LuPhone, LuClock, LuChevronRight, LuBuilding2 } from "react-icons/lu";
import { GiMusicalNotes } from "react-icons/gi";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchOfflineCenters } from "@/store/centerSlice";
import { resolveImageUrl } from "@/lib/resolveImageUrl";

// ─── Helpers ────────────────────────────────────────────────────────────────

const normalizeCity = (value) =>
  String(value || "").trim().toLowerCase();

const getCourseKey = (course, index) => {
  if (typeof course === "string") return course;
  return course?._id || course?.id || course?.code || course?.name || `course-${index}`;
};

const getCourseLabel = (course, index) => {
  if (typeof course === "string") return course.trim();
  const name = String(course?.name || course?.courseName || "").trim();
  const code = String(course?.code || course?.courseCode || "").trim();
  if (name && code) return `${name} (${code})`;
  if (name) return name;
  if (code) return code;
  const id = String(course?._id || course?.id || "").trim();
  return id ? `Course ${index + 1}` : "";
};

const normalizeCourses = (courses = []) => {
  if (!Array.isArray(courses)) return [];
  const seen = new Set();
  return courses.reduce((acc, course, index) => {
    const label = getCourseLabel(course, index);
    if (!label) return acc;
    const key = getCourseKey(course, index);
    if (seen.has(key)) return acc;
    seen.add(key);
    acc.push({ key, label });
    return acc;
  }, []);
};

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatPill({ value, label }) {
  const [count, setCount] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (!value || started.current) return;
    started.current = true;
    const duration = 1800;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      setCount(Math.round((1 - Math.pow(1 - p, 3)) * value));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);

  return (
    <div className="flex flex-col items-center gap-1 bg-white/8 backdrop-blur-sm border border-white/10 rounded-2xl px-8 py-5 min-w-[110px]">
      <span className="text-3xl font-extrabold text-orange-400">{count}</span>
      <span className="text-sm text-white/60">{label}</span>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-2xl bg-white overflow-hidden shadow-sm animate-pulse">
      <div className="h-52 bg-gray-200" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="h-3 bg-gray-100 rounded w-2/3" />
        <div className="flex gap-2">
          <div className="h-5 w-20 bg-gray-100 rounded-full" />
          <div className="h-5 w-16 bg-gray-100 rounded-full" />
        </div>
        <div className="h-9 bg-gray-200 rounded-xl" />
      </div>
    </div>
  );
}

function CenterCard({ center }) {
  const router = useRouter();
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.35 }}
      onClick={() => router.push(`/centers/${center.slug}`)}
      className="group relative cursor-pointer overflow-hidden rounded-2xl bg-white shadow-md hover:shadow-xl transition-shadow duration-300 flex flex-col"
    >
      {/* Hero image */}
      <div className="relative h-52 overflow-hidden shrink-0">
        <img
          src={center.image}
          alt={center.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            e.target.src =
              "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

        {/* City badge */}
        <span className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-white/20 backdrop-blur-sm border border-white/25 px-2.5 py-1 text-[11px] font-medium text-white">
          <LuMapPin className="w-3 h-3" />
          {center.city}
        </span>

        {/* Branch name overlaid on image */}
        <h2 className="absolute bottom-3 left-3 right-3 text-white font-bold text-lg leading-snug line-clamp-1 drop-shadow">
          {center.name}
        </h2>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4 gap-3">
        {/* Address */}
        <p className="text-sm text-gray-600 flex items-start gap-1.5 line-clamp-2">
          <LuMapPin className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
          <span>{center.address}</span>
        </p>

        {/* Phone + Hours */}
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
          <span className="flex items-center gap-1.5 truncate">
            <LuPhone className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            {center.contactPhone}
          </span>
          <span className="flex items-center gap-1.5 truncate">
            <LuClock className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            {center.openingHours.split(":")[0]}
          </span>
        </div>

        {/* Course chips */}
        <div className="flex flex-wrap gap-1.5">
          {center.availableCourses.length > 0 ? (
            center.availableCourses.slice(0, 3).map((course) => (
              <span
                key={course.key}
                className="rounded-full bg-teal-50 text-teal-700 border border-teal-100 px-2.5 py-0.5 text-[11px] font-medium"
              >
                {course.label.length > 20 ? `${course.label.slice(0, 20)}…` : course.label}
              </span>
            ))
          ) : (
            <span className="rounded-full bg-gray-100 text-gray-500 px-2.5 py-0.5 text-[11px]">
              No courses assigned
            </span>
          )}
          {center.availableCourses.length > 3 && (
            <span className="rounded-full bg-gray-100 text-gray-500 px-2.5 py-0.5 text-[11px]">
              +{center.availableCourses.length - 3}
            </span>
          )}
        </div>

        {/* CTA */}
        <Link
          href={`/centers/${center.slug}`}
          onClick={(e) => e.stopPropagation()}
          className="mt-auto flex items-center justify-center gap-2 rounded-xl bg-[#CC3700] hover:bg-[#B83100] text-white text-sm font-semibold py-2.5 transition-colors"
        >
          View Centre <LuChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </motion.div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CentersClient({ initialCenters = [] }) {
  const dispatch = useDispatch();
  const offlineCenterState = useSelector((state) => state.offlineCenters || {});
  // Server-fetched centres seed the first (SSR) render; the client store's own
  // fetch takes over after hydration. Gives real HTML for SEO/LCP.
  const centers =
    offlineCenterState.centers && offlineCenterState.centers.length
      ? offlineCenterState.centers
      : initialCenters;
  const loading = offlineCenterState.loading || false;

  const [selectedCity, setSelectedCity] = useState("all");
  const [notifyCity, setNotifyCity] = useState("");

  // Server already provided ISR-fresh centres; only fetch on the client as a
  // fallback when SSR returned nothing — avoids the double-fetch.
  useEffect(() => {
    if (initialCenters.length) return;
    dispatch(fetchOfflineCenters());
  }, [dispatch, initialCenters.length]);

  const heroStats = useMemo(() => {
    const cityKeys = new Set();
    const teacherKeys = new Set();
    const studentKeys = new Set();
    let studentCount = 0;

    (Array.isArray(centers) ? centers : []).forEach((center) => {
      const cityName = String(center.city?.cityName || center.city || "").trim();
      if (cityName) cityKeys.add(normalizeCity(cityName));

      (center.teachers || []).forEach((teacher, index) => {
        const teacherKey =
          teacher?._id ||
          teacher?.id ||
          teacher?.userId?._id ||
          `${center._id}-teacher-${index}`;
        if (teacherKeys.has(teacherKey)) return;
        teacherKeys.add(teacherKey);

        if (Array.isArray(teacher?.students) && teacher.students.length > 0) {
          teacher.students.forEach((student) => {
            const studentKey = student?._id || student?.id || student;
            if (studentKey) studentKeys.add(String(studentKey));
          });
        } else {
          studentCount += Number(teacher?.studentCount) || 0;
        }
      });
    });

    return {
      cities: cityKeys.size,
      students: studentKeys.size || studentCount,
      instructors: teacherKeys.size,
    };
  }, [centers]);

  const transformedCenters = useMemo(() => {
    if (!centers?.length) return [];
    return centers.map((center) => {
      const formattedTimings =
        center.branchTimings && center.branchTimings.length >= 2
          ? `${center.branchTimings[0]} - ${center.branchTimings[1]}`
          : "Mon - Sat: 9 AM - 6 PM";

      const openDays =
        center.branchOpenDays && center.branchOpenDays.length > 0
          ? center.branchOpenDays.join(", ")
          : "Mon-Fri";

      const availableCourses = normalizeCourses(
        center.courses && center.courses.length > 0
          ? center.courses
          : center.availableCourses || ["Music", "Dance"]
      );

      return {
        id: center._id || center.id,
        name: center.branchName || center.name || "Unnamed Centre",
        city:
          center.city?.cityName ||
          center.city ||
          center.location?.city ||
          center.location ||
          "Unknown City",
        address:
          center.address ||
          `${center.location || ""}${
            center.city?.cityName ? ", " + center.city.cityName : ""
          }` ||
          "Address not available",
        image: resolveImageUrl(
          center.branchImage,
          `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(
            center.branchName || center.name || "Branch"
          )}`
        ),
        openingHours: `${openDays}: ${formattedTimings}`,
        capacity: center.branchCapacity
          ? `${center.branchCapacity} students`
          : "100 students",
        contactPhone:
          center.branchAdminContact ||
          center.branchManager?.contact ||
          center.contactPhone ||
          "+91 XXXXX XXXXX",
        email:
          center.branchAdminEmail ||
          center.branchManager?.email ||
          center.contactEmail ||
          "info@example.com",
        availableCourses,
        slug: (center.branchName || center.name || "center")
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .trim()
          .replace(/\s+/g, "-"),
      };
    });
  }, [centers]);

  const cities = useMemo(() => {
    const map = new Map();
    transformedCenters.forEach((center) => {
      const label = String(center.city || "").trim();
      const key = normalizeCity(label);
      if (!key || map.has(key)) return;
      map.set(key, { value: key, label });
    });
    return [{ value: "all", label: "All Cities" }, ...Array.from(map.values())];
  }, [transformedCenters]);

  const filteredCenters = useMemo(() => {
    if (selectedCity === "all") return transformedCenters;
    return transformedCenters.filter(
      (c) => normalizeCity(c.city) === selectedCity
    );
  }, [selectedCity, transformedCenters]);

  return (
    <>
      {/* ── Dark Hero ─────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-[#09090f] rounded-b-[52px]">
        {/* Ambient orbs */}
        <div
          className="orb absolute -top-40 -left-40 w-[480px] h-[480px] bg-orange-500/18"
          style={{ "--dur": "16s" }}
        />
        <div
          className="orb absolute top-8 right-0 w-96 h-96 bg-purple-600/12"
          style={{ "--dur": "20s", animationDelay: "5s" }}
        />
        <div
          className="orb absolute bottom-0 left-1/2 w-80 h-80 bg-teal-500/10"
          style={{ "--dur": "24s", animationDelay: "10s" }}
        />

        <div className="relative z-10 mx-auto max-w-4xl px-6 py-24 text-center">
          {/* Pill label */}
          <span
            className="fade-in-up inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-sm font-medium text-orange-400"
            style={{ "--fade-y": "12px", "--fade-dur": "0.6s" }}
          >
            <LuBuilding2 className="w-4 h-4" /> Experience Learning in Person
          </span>

          <h1
            className="fade-in-up mt-6 text-4xl font-extrabold leading-tight text-white md:text-6xl"
            style={{ "--fade-y": "24px", "--fade-dur": "0.7s", "--fade-delay": "0.1s" }}
          >
            Our Offline{" "}
            <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              Centres
            </span>
          </h1>

          <p
            className="fade-in-up mt-4 text-base text-white/60 max-w-2xl mx-auto"
            style={{ "--fade-y": "20px", "--fade-dur": "0.7s", "--fade-delay": "0.2s" }}
          >
            Visit our physical locations for hands-on learning, personalised
            instruction, and community engagement. Each centre is equipped with
            professional-grade instruments and facilities.
          </p>

          {/* Stats */}
          <div
            className="fade-in-up mt-10 flex flex-wrap justify-center gap-4"
            style={{ "--fade-y": "20px", "--fade-dur": "0.7s", "--fade-delay": "0.35s" }}
          >
            <StatPill value={heroStats.cities} label="Cities" />
            <StatPill value={heroStats.students} label="Students" />
            <StatPill value={heroStats.instructors} label="Instructors" />
          </div>
        </div>

      </div>

      {/* ── Filter Strip ──────────────────────────────────────────────────── */}
      {!loading && cities.length > 1 && (
        <div className="sticky top-16 z-20 border-b border-gray-100 bg-[#fffaf4]/95 shadow-sm backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-4 py-3">
            <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
              {cities.map((city) => (
                <button
                  key={city.value}
                  onClick={() => setSelectedCity(city.value)}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                    selectedCity === city.value
                      ? "bg-orange-500 text-white shadow-sm shadow-orange-200"
                      : "bg-white border border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-600"
                  }`}
                >
                  {city.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Cards Grid ───────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-6 py-12">
        {/* Result count */}
        {!loading && (
          <p className="mb-6 text-sm text-gray-500">
            Showing{" "}
            <span className="font-semibold text-gray-800">
              {filteredCenters.length}
            </span>{" "}
            centre{filteredCenters.length !== 1 ? "s" : ""}
            {selectedCity !== "all" && (
              <span>
                {" "}
                in{" "}
                <span className="font-semibold capitalize">{selectedCity}</span>
              </span>
            )}
          </p>
        )}

        {loading && centers.length === 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : filteredCenters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <GiMusicalNotes className="text-6xl text-orange-300 mb-4" />
            <p className="text-xl font-semibold text-gray-700">No centres found</p>
            <p className="mt-1 text-sm text-gray-500">
              Try selecting a different city.
            </p>
            <button
              onClick={() => setSelectedCity("all")}
              className="mt-5 rounded-full bg-orange-500 px-6 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
            >
              Show All Cities
            </button>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCenters.map((center) => (
                <CenterCard key={center.id} center={center} />
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>

      {/* ── Can't Find CTA ────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0d0d1a] to-[#1a0d00] py-20 px-6">
        <div
          className="orb absolute -bottom-20 -right-20 w-72 h-72 bg-orange-500/15"
          style={{ "--dur": "18s" }}
        />
        <div className="relative z-10 mx-auto max-w-2xl text-center">
          <motion.h3
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-2xl font-bold text-white"
          >
            Can&apos;t Find a Centre Near You?
          </motion.h3>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-3 text-white/60"
          >
            We&apos;re expanding! Drop your city and we&apos;ll let you know
            when we open near you.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-8 flex flex-col sm:flex-row gap-3 justify-center"
          >
            <input
              type="text"
              value={notifyCity}
              onChange={(e) => setNotifyCity(e.target.value)}
              placeholder="Enter your city"
              className="flex-1 max-w-xs rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-white placeholder-white/40 text-sm backdrop-blur-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
            />
            <button className="rounded-xl bg-[#CC3700] hover:bg-[#B83100] text-white px-6 py-2.5 text-sm font-semibold transition-colors">
              Notify Me
            </button>
          </motion.div>
        </div>
      </div>
    </>
  );
}
