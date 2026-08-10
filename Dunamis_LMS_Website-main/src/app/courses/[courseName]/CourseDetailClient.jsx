"use client";

import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { LuClock, LuUsers, LuStar, LuChevronDown, LuChevronLeft, LuCircleCheck, LuMapPin, LuWifi, LuBookOpen, LuAward, LuPlay } from "react-icons/lu";
import BookDemoModal from "@/components/PopupModals/BookDemoModal";
import EnrollTerm from "@/components/PopupModals/EnrollTerms";
import LoginModal from "@/components/PopupModals/LoginModal";
import CallbackRequestModal from "@/components/PopupModals/CallbackRequestModal";
import ContactActionsMenu from "@/components/ContactActionsMenu";
import { IoMdStar } from "react-icons/io";
import toast from "react-hot-toast";
import { fetchCourses } from "@/store/courseSlice";
import { useDispatch, useSelector } from "react-redux";
import { useState, useEffect } from "react";
import {
  clearEnrollmentResume,
  saveEnrollmentResume,
} from "@/helpers/enrollmentResume";
import {
  getCoursePlaceholderImage,
  getInitialsImage,
  resolveImageUrl,
} from "@/lib/resolveImageUrl";
import { buildTeacherName, formatTimeLabel } from "@/helpers/courseSlots";
import { getActiveCustomPlans } from "@/helpers/tenurePlans";
import { slugifyBranch } from "@/lib/serverCenters";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "";
const TABS = ["Overview", "Curriculum", "Instructors", "Fee Structure"];

/* ─── Data helpers ───────────────────────────────────────────────── */
const buildCurriculum = (contentItems = []) => {
  const items = Array.isArray(contentItems) ? contentItems : contentItems ? [contentItems] : [];
  return items.flatMap((contentItem) => {
    const modules = Array.isArray(contentItem?.modules) ? contentItem.modules : [];
    return modules.map((module, index) => ({
      id: module?._id || `${contentItem?._id || "content"}-${index}`,
      module: module?.title || "Module",
      duration: module?.duration || "",
      topics: module?.lessons?.flatMap((lesson) => {
        if (Array.isArray(lesson?.topics) && lesson.topics.length > 0)
          return lesson.topics.map((t) => t?.title || t?.description?.substring(0, 100) || "").filter(Boolean);
        return lesson?.title ? [lesson.title] : [];
      }).filter(Boolean) || [],
    }));
  });
};

const normalizeImageKey = (value) => {
  const text = String(value || "").trim().replace(/\\/g, "/");
  if (!text) return "";
  try { const url = new URL(text, "https://dunamis.local"); return url.pathname.replace(/^\/+/, "").toLowerCase(); }
  catch { return text.replace(/^\/+/, "").toLowerCase(); }
};

const getInstructorImage = (teacher, courseImage, name) => {
  const courseImageKey = normalizeImageKey(courseImage);
  const candidates = [
    teacher?.teacherDetail?.profilePicture, teacher?.teacherDetails?.profilePicture,
    teacher?.teacherApplication?.profilePicture, teacher?.profilePicture,
    teacher?.userId?.image, teacher?.user?.image, teacher?.image,
  ];
  const image = candidates.find((c) => { const k = normalizeImageKey(c); return k && k !== courseImageKey; });
  return resolveImageUrl(image, getInitialsImage(name));
};

const buildInstructorCards = (courseRecord) =>
  (courseRecord?.teacher || []).map((teacher) => {
    const name = buildTeacherName(teacher);
    const teacherId = String(teacher?._id || teacher?.id || "");
    const courseMedia = (courseRecord?.teacherMedia || []).find(
      (m) => String(m.teacher?._id || m.teacher) === teacherId
    );
    return {
      id: teacher?._id || teacher?.id, name,
      branch: courseRecord?.category?.name || "Department",
      exp: `${teacher?.studentCount || 0} students taught`,
      rating: Number(teacher?.averageRating) || 0,
      image: getInstructorImage(teacher, courseRecord?.image, name),
      profileVideo: resolveImageUrl(teacher?.teacherDetail?.profileVideo || teacher?.profileVideo, ""),
      expertise: teacher?.teacherDetail?.areaOfExpertise || "",
      qualification: teacher?.teacherDetail?.highestQualification || "",
      location: [teacher?.teacherDetail?.currentCity, teacher?.teacherDetail?.currentState].filter(Boolean).join(", "),
      yearsExperience: teacher?.teacherDetail?.yearOfExperience ? `${teacher.teacherDetail.yearOfExperience} yrs exp` : "",
      mode: teacher?.teacherDetail?.mode || courseRecord?.mode || "online",
      courseDemoVideo: resolveImageUrl(
        courseMedia?.demoVideos?.find((v) => v.isActive)?.filePath, ""
      ),
      courseCertificates: (courseMedia?.certificates || []).map((c) =>
        resolveImageUrl(typeof c === "string" ? c : c.filePath, "")
      ),
    };
  });

const mapFeeStructure = (price, type = "monthly") => {
  const sessionType = price?.sessionType || "standard";
  const sessionLabel = sessionType === "premium" ? "Individual" : "Group";
  const mentorshipFeature = sessionType === "premium" ? "1-on-1 mentorship" : "Group mentorship";
  const tenurePlans = Array.isArray(price?.tenurePlans)
    ? price.tenurePlans.filter((p) => p.isActive !== false && (Number(p.monthlyFee) > 0 || Number(p.fullPayment) > 0))
    : [];
  if (tenurePlans.length > 0) {
    return tenurePlans.map((plan) => {
      const pct = Number(plan.discount) || 0;
      if (type === "monthly") return { plan: `${sessionLabel} · ${plan.months}-month`, price: `₹${plan.monthlyFee || 0}/month`, features: ["Full course access", "Live sessions", mentorshipFeature, pct > 0 ? `${pct}% off full payment` : "Flexible payment", "Certificate on completion"], sessionType };
      return { plan: `${sessionLabel} · ${plan.months}-month`, price: pct > 0 ? `Save ${pct}%` : "One-time", features: ["Full course access", "All materials", pct > 0 ? `₹${plan.fullPayment || 0} one-time (${pct}% off)` : `₹${plan.fullPayment || 0} one-time`, "Lifetime access", sessionType === "premium" ? "Priority support" : "Standard support", "Certificate on completion"], sessionType };
    });
  }
  if (type === "monthly") return [{ plan: sessionLabel, price: `₹${price?.monthlyFee || 0}/month`, features: ["Full course access", "Live sessions", mentorshipFeature, price?.discount > 0 ? `${price.discount}% discount on full payment` : "Flexible payment", "Certificate on completion"], sessionType }];
  const pct = Number(price?.discount) || 0;
  return [{ plan: sessionLabel, price: pct > 0 ? `Save ${pct}%` : "One-time", features: ["Full course access", "All materials", pct > 0 ? `₹${price?.fullPayment || 0} one-time (${pct}% off)` : `₹${price?.fullPayment || 0} one-time`, "Lifetime access", sessionType === "premium" ? "Priority support" : "Standard support", "Certificate on completion"], sessionType }];
};

const mapCustomPlanCards = (price) => {
  const sessionType = price?.sessionType || "standard";
  const sessionLabel = sessionType === "premium" ? "Individual" : "Group";
  return getActiveCustomPlans(price).map((plan) => ({
    planId: plan.id,
    plan: plan.name,
    subtitle: plan.description,
    price: `₹${plan.fullPayment.toLocaleString("en-IN")}`,
    mrp: plan.originalPrice > plan.fullPayment
      ? `₹${plan.originalPrice.toLocaleString("en-IN")}`
      : null,
    features: [
      ...plan.perks,
      plan.durationMonths ? `${plan.durationMonths} months access` : null,
      `${sessionLabel} sessions`,
      "One-time payment",
    ].filter(Boolean),
    sessionType,
  }));
};

// Offline courses run at branches; group them by city so a 13-branch course
// reads as three places rather than one long list.
const buildBranchGroups = (branches) => {
  const groups = new Map();

  (Array.isArray(branches) ? branches : []).forEach((branch) => {
    if (!branch?.branchName) return;
    const city = branch.city?.cityName || "Other locations";
    if (!groups.has(city)) groups.set(city, []);
    groups.get(city).push({
      id: branch._id,
      name: branch.branchName,
      slug: slugifyBranch(branch.branchName),
      address: branch.location || "",
      hours: branch.branchTimings?.length >= 2
        ? `${formatTimeLabel(branch.branchTimings[0])} – ${formatTimeLabel(branch.branchTimings[1])}`
        : "",
      days: branch.branchOpenDays?.join(", ") || "",
    });
  });

  return Array.from(groups, ([city, items]) => ({ city, items }));
};

const transformCourseData = (courseRecord, courseFallbackImage) => {
  const selectedPrice = courseRecord?.price?.find((p) => p?.isSelected) || courseRecord?.price?.find((p) => p?.isActive !== false) || courseRecord?.price?.[0];
  return {
    id: courseRecord?._id,
    title: courseRecord?.name || "Untitled Course",
    category: courseRecord?.category?.name || "Not specified",
    level: courseRecord?.level || "beginner",
    mode: courseRecord?.mode || "online",
    description: courseRecord?.description || "No description available",
    duration: courseRecord?.startDate && courseRecord?.endDate
      ? `${new Date(courseRecord.startDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} – ${new Date(courseRecord.endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`
      : "",
    price: selectedPrice ? `₹${selectedPrice.monthlyFee}/month` : "Price not available",
    image: resolveImageUrl(courseRecord?.image, courseFallbackImage),
    rating: courseRecord?.rating || 0,
    reviewsCount: courseRecord?.totalStudents || courseRecord?.enrolledStudents?.length || 0,
    learn: courseRecord?.objectives?.length > 0 ? courseRecord.objectives : ["Comprehensive understanding of core concepts", "Practical hands-on experience", "Industry-relevant skills", "Project-based learning"],
    curriculum: buildCurriculum(courseRecord?.content),
    instructors: buildInstructorCards(courseRecord),
    feeStructure: {
      monthly: courseRecord?.price?.filter((p) => p?.isActive !== false).flatMap((p) => mapFeeStructure(p, "monthly")) || [],
      full: courseRecord?.price?.filter((p) => p?.isActive !== false).flatMap((p) => mapFeeStructure(p, "full")) || [],
      custom: courseRecord?.price?.filter((p) => p?.isActive !== false).flatMap(mapCustomPlanCards) || [],
    },
    branchGroups: buildBranchGroups(courseRecord?.branches),
    branchCount: courseRecord?.branchCount || 0,
    code: courseRecord?.code || "",
  };
};

/* ─── Close icon ─────────────────────────────────────────────────── */
function XIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

/* ─── Animated tab content wrapper ─────────────────────────────── */
function TabPane({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

function SectionTitle({ children }) {
  return <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-5">{children}</h2>;
}

/* ─── Page ───────────────────────────────────────────────────────── */
export default function CourseDetailClient({ initialCourse = null }) {
  const dispatch = useDispatch();
  const pathname = usePathname();
  const { courses, loading, error } = useSelector((state) => state.course);
  const { token, user } = useSelector((state) => state.auth || {});
  const { courseName } = useParams();

  const [isEnrollTermOpen, setEnrollTermOpen] = useState(false);
  const [isBookDemoOpen, setBookDemoOpen] = useState(false);
  const [isLoginOpen, setLoginOpen] = useState(false);
  const [isCallbackOpen, setCallbackOpen] = useState(false);
  const [pendingQueryAction, setPendingQueryAction] = useState(null);
  const [pendingEnrollmentAuth, setPendingEnrollmentAuth] = useState(false);
  const [activeTab, setActiveTab] = useState("Overview");
  const [detailLoading, setDetailLoading] = useState(false);
  const [preferredInstructorId, setPreferredInstructorId] = useState("");
  const [activeInstructor, setActiveInstructor] = useState(null);
  const [openModule, setOpenModule] = useState(null);
  const courseFallbackImage = getCoursePlaceholderImage();
  // Seed from the server-fetched course so the first (SSR) render shows real
  // content + lets generateMetadata emit per-course SEO tags. Client effects
  // below still refresh/confirm the data after hydration.
  const [course, setCourse] = useState(() =>
    initialCourse ? transformCourseData(initialCourse, courseFallbackImage) : null
  );
  const [rawCourse, setRawCourse] = useState(initialCourse || null);

  const hasActiveAuth = () => Boolean(token);
  const isStudentAccount = (account = user) => String(account?.accountType || "").toLowerCase() === "student";
  const showStudentOnlyMessage = (action) => toast.error(`Only student accounts can ${action}.`);

  useEffect(() => { dispatch(fetchCourses()); }, [dispatch]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const action = params.get("action") || (params.get("intent") === "demo" ? "demo" : null);
    if (!action) return;
    setPendingQueryAction(action);
    params.delete("action"); params.delete("intent");
    const nextSearch = params.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}`);
  }, []);

  useEffect(() => {
    let ignore = false;
    const loadCourseDetail = async () => {
      if (!courseName) return;
      if (!courses || courses.length === 0) {
        if (!loading) { setDetailLoading(false); setCourse(null); setRawCourse(null); }
        return;
      }
      const decodedParam = decodeURIComponent(courseName);
      let foundCourse = courses.find((item) => item._id === decodedParam);
      if (!foundCourse) {
        const paramSlug = decodedParam.toLowerCase().replace(/\s+/g, "-");
        foundCourse = courses.find((item) => item.name?.toLowerCase().replace(/\s+/g, "-") === paramSlug);
      }
      if (!foundCourse) { setDetailLoading(false); setCourse(null); setRawCourse(null); return; }
      setDetailLoading(true);
      let resolvedCourse = foundCourse;
      try {
        const response = await fetch(`${BASE_URL}/v1/course/get/${foundCourse._id}`);
        if (response.ok) { const data = await response.json(); resolvedCourse = data?.data || foundCourse; }
      } catch { resolvedCourse = foundCourse; }
      if (ignore) return;
      setRawCourse(resolvedCourse);
      setCourse(transformCourseData(resolvedCourse, courseFallbackImage));
      setDetailLoading(false);
    };
    loadCourseDetail();
    return () => { ignore = true; };
  }, [courseFallbackImage, courseName, courses, loading]);

  useEffect(() => { setActiveInstructor(null); }, [course?.id]);

  useEffect(() => {
    if (!pendingQueryAction || !rawCourse) return;
    if (pendingQueryAction === "demo") { setPreferredInstructorId(""); setBookDemoOpen(true); setPendingQueryAction(null); return; }
    if (pendingQueryAction === "enroll") {
      if (hasActiveAuth()) {
        if (!isStudentAccount()) { showStudentOnlyMessage("enroll in courses"); setPendingQueryAction(null); return; }
        clearEnrollmentResume(); setEnrollTermOpen(true);
      } else {
        if (pathname) saveEnrollmentResume(`${pathname}?action=enroll`);
        setPendingEnrollmentAuth(true); setLoginOpen(true);
      }
      setPendingQueryAction(null);
    }
  }, [pathname, pendingQueryAction, rawCourse, token, user]);

  const openEnrollmentFlow = (instructorId = "") => {
    setPreferredInstructorId(instructorId);
    if (hasActiveAuth()) {
      if (!isStudentAccount()) { showStudentOnlyMessage("enroll in courses"); return; }
      clearEnrollmentResume(); setPendingEnrollmentAuth(false); setEnrollTermOpen(true); return;
    }
    if (pathname) saveEnrollmentResume(`${pathname}?action=enroll`);
    setPendingEnrollmentAuth(true); setLoginOpen(true);
  };

  const openDemoFlow = (instructorId = "") => { setPreferredInstructorId(instructorId); setBookDemoOpen(true); };

  /* ── Loading / error ── */
  // Only show the spinner when we have nothing to render yet — if the course was
  // seeded from the server, keep showing it while client effects refresh.
  if ((loading || detailLoading) && !course) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#CC3700] border-t-transparent" />
        <p className="text-sm text-gray-500">Loading course details…</p>
      </div>
    );
  }
  if (!course) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-5xl">🎵</div>
        <h2 className="text-xl font-bold text-gray-900">{error ? "Something went wrong" : "Course not found"}</h2>
        <p className="text-sm text-gray-500 max-w-xs">{error ? "Please try again later." : "This course doesn't exist or has been removed."}</p>
        <Link href="/courses" className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#CC3700] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#B83100] transition">
          <LuChevronLeft className="w-4 h-4" /> Back to Courses
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafaf8]">

      {/* ════ HERO ════════════════════════════════════════════════ */}
      <div className="relative h-72 sm:h-96 lg:h-[430px] overflow-hidden">
        <img src={course.image} alt={course.title} className="w-full h-full object-cover"
          onError={(e) => { e.currentTarget.src = courseFallbackImage; }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/40 to-black/10" />

        {/* Back */}
        <Link href="/courses"
          className="absolute top-4 left-4 sm:top-6 sm:left-6 inline-flex items-center gap-1.5 rounded-full bg-black/30 backdrop-blur-sm border border-white/20 px-3 py-1.5 text-xs font-medium text-white hover:bg-black/50 transition">
          <LuChevronLeft className="w-3.5 h-3.5" /> Courses
        </Link>

        {/* Info */}
        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8">
          <div className="max-w-4xl">
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="rounded-full bg-[#CC3700]/90 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-white">{course.category}</span>
              {course.code && <span className="rounded-full bg-white/15 backdrop-blur-sm border border-white/20 px-3 py-1 text-xs font-medium text-white/80">{course.code}</span>}
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-tight">{course.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2.5">
              {course.rating > 0 && (
                <span className="flex items-center gap-1 font-semibold text-amber-400 text-sm">
                  <IoMdStar className="w-4 h-4" />{course.rating}
                  {course.reviewsCount > 0 && <span className="text-white/55 font-normal text-xs ml-0.5">({course.reviewsCount})</span>}
                </span>
              )}
              <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${course.mode === "online" ? "bg-emerald-500/80 text-white" : "bg-slate-500/80 text-white"}`}>
                {course.mode === "online" ? <LuWifi className="w-3 h-3" /> : <LuMapPin className="w-3 h-3" />}
                <span className="capitalize">{course.mode}</span>
              </span>
              <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium text-white capitalize">{course.level}</span>
              {course.duration && (
                <span className="flex items-center gap-1 text-white/55 text-xs">
                  <LuClock className="w-3.5 h-3.5" />{course.duration}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ════ BODY ════════════════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_320px] gap-8 items-start py-6 sm:py-8">

          {/* ── Left ── */}
          <div className="min-w-0">

            {/* Mobile price + CTA */}
            <div className="lg:hidden mb-5 rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
              <p className="text-2xl font-extrabold text-[#CC3700]">{course.price}</p>
              {course.branchCount > 0 && <p className="text-xs text-gray-400 mt-0.5">{course.branchCount} branch{course.branchCount > 1 ? "es" : ""} · <span className="capitalize">{course.mode}</span></p>}
              <div className="flex items-stretch gap-3 mt-4">
                <motion.button whileTap={{ scale: 0.96 }} onClick={() => openEnrollmentFlow()}
                  className="flex-1 rounded-xl bg-[#CC3700] py-2.5 text-sm font-bold text-white hover:bg-[#B83100] transition">Enroll Now</motion.button>
                <motion.button whileTap={{ scale: 0.96 }} onClick={() => openDemoFlow()}
                  className="flex-1 rounded-xl border-2 border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">Book Demo</motion.button>
                <ContactActionsMenu onRequestCallback={() => setCallbackOpen(true)} />
              </div>
            </div>

            {/* Sticky tab nav */}
            <div className="sticky top-16 z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 bg-[#fafaf8]/95 backdrop-blur border-b border-gray-200 mb-6">
              <div className="flex overflow-x-auto scrollbar-hide">
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`relative shrink-0 px-4 sm:px-5 py-3.5 text-sm font-medium transition-colors duration-200 ${
                      activeTab === tab ? "text-[#CC3700]" : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    {tab}
                    {activeTab === tab && (
                      <motion.span
                        layoutId="tab-underline"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#CC3700] rounded-full"
                        transition={{ type: "spring", stiffness: 400, damping: 32 }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab panels */}
            <AnimatePresence mode="wait">

              {activeTab === "Overview" && (
                <TabPane key="overview">
                  <div className="space-y-8">
                    <div>
                      <SectionTitle>About this Course</SectionTitle>
                      <p className="text-gray-600 leading-relaxed text-sm sm:text-base">{course.description}</p>
                    </div>
                    <div>
                      <SectionTitle>What You&apos;ll Learn</SectionTitle>
                      {course.learn?.length ? (
                        <ul className="grid sm:grid-cols-2 gap-3">
                          {course.learn.map((item, i) => (
                            <motion.li key={i}
                              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                              className="flex items-start gap-3 rounded-xl bg-white border border-gray-100 p-4 text-sm text-gray-700 shadow-sm">
                              <LuCircleCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />{item}
                            </motion.li>
                          ))}
                        </ul>
                      ) : <p className="text-sm text-gray-400">No objectives added yet.</p>}
                    </div>

                    {course.mode !== "online" && course.branchGroups.length > 0 && (
                      <div>
                        <SectionTitle>Where You&apos;ll Learn</SectionTitle>
                        <p className="-mt-2 mb-4 text-sm text-gray-500">
                          This course runs at {course.branchCount} {course.branchCount === 1 ? "centre" : "centres"}
                          {course.branchGroups.length > 1 ? ` across ${course.branchGroups.length} cities` : ""}. Pick your centre when you enrol.
                        </p>
                        <div className="space-y-5">
                          {course.branchGroups.map((group) => (
                            <div key={group.city}>
                              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#CC3700]">
                                {group.city}
                                <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium normal-case tracking-normal text-orange-600">
                                  {group.items.length}
                                </span>
                              </p>
                              <ul className="grid gap-3 sm:grid-cols-2">
                                {group.items.map((branch) => (
                                  <li key={branch.id}>
                                    <Link
                                      href={`/centers/${branch.slug}`}
                                      className="flex h-full gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-orange-200 hover:shadow-md"
                                    >
                                      <LuMapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#CC3700]" />
                                      <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-900">{branch.name}</p>
                                        {branch.address && (
                                          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-gray-500">{branch.address}</p>
                                        )}
                                        {(branch.days || branch.hours) && (
                                          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-400">
                                            <LuClock className="h-3 w-3 shrink-0" />
                                            {[branch.days, branch.hours].filter(Boolean).join(" · ")}
                                          </p>
                                        )}
                                      </div>
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </TabPane>
              )}

              {activeTab === "Curriculum" && (
                <TabPane key="curriculum">
                  <SectionTitle>Course Curriculum</SectionTitle>
                  {course.curriculum?.length ? (
                    <div className="space-y-3">
                      {course.curriculum.map((module, idx) => (
                        <div key={module.id || idx} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                          <button
                            onClick={() => setOpenModule(openModule === idx ? null : idx)}
                            className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="shrink-0 w-7 h-7 rounded-full bg-orange-100 text-[#CC3700] text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">{module.module}</p>
                                {module.duration && <p className="text-xs text-gray-400 mt-0.5">{module.duration}</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-3">
                              {module.topics?.length > 0 && <span className="text-xs text-gray-400 hidden sm:block">{module.topics.length} topics</span>}
                              <motion.span animate={{ rotate: openModule === idx ? 180 : 0 }} transition={{ duration: 0.2 }} className="block">
                                <LuChevronDown className="w-4 h-4 text-gray-400" />
                              </motion.span>
                            </div>
                          </button>
                          <AnimatePresence>
                            {openModule === idx && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
                                {module.topics?.length ? (
                                  <ul className="px-5 pb-4 divide-y divide-gray-100">
                                    {module.topics.map((topic, ti) => (
                                      <li key={ti} className="flex items-center gap-3 py-2.5">
                                        <LuPlay className="w-3 h-3 text-orange-400 fill-orange-400 shrink-0" />
                                        <span className="text-sm text-gray-700">{topic}</span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : <p className="px-5 pb-4 text-sm text-gray-400">No topics yet.</p>}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-sm text-gray-400">No curriculum added yet.</p>}
                </TabPane>
              )}

              {activeTab === "Instructors" && (
                <TabPane key="instructors">
                  <SectionTitle>Meet Your Instructors</SectionTitle>
                  {course.instructors?.length ? (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {course.instructors.map((instructor, i) => (
                        <motion.button key={instructor.id || i} type="button" onClick={() => setActiveInstructor(instructor)}
                          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                          whileHover={{ y: -3, boxShadow: "0 12px 32px -8px rgba(255,107,53,0.18)" }}
                          className="group flex items-start gap-4 rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-sm hover:border-orange-200 transition-all w-full">
                          <div className="relative shrink-0">
                            <img src={instructor.image} alt={instructor.name}
                              className="h-14 w-14 rounded-full object-cover object-top ring-2 ring-gray-100 group-hover:ring-[#FF6B35]/40 transition-all" />
                            {instructor.rating > 0 && (
                              <span className="absolute -bottom-1 -right-1 flex items-center gap-0.5 rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                <LuStar className="w-2.5 h-2.5 fill-white" />{instructor.rating.toFixed(1)}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-gray-900 text-sm">{instructor.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{instructor.expertise || instructor.branch}</p>
                            <p className="text-xs text-gray-400 mt-1">{instructor.exp}</p>
                            {instructor.yearsExperience && (
                              <span className="mt-2 inline-block rounded-full bg-orange-50 border border-orange-100 px-2 py-0.5 text-[11px] font-medium text-orange-600">{instructor.yearsExperience}</span>
                            )}
                          </div>
                          <span className="shrink-0 text-xs text-[#CC3700] font-semibold opacity-0 group-hover:opacity-100 transition-opacity self-start pt-0.5">View →</span>
                        </motion.button>
                      ))}
                    </div>
                  ) : <p className="text-sm text-gray-400">No instructors listed yet.</p>}
                </TabPane>
              )}

              {activeTab === "Fee Structure" && (
                <TabPane key="fee">
                  <div className="space-y-8">
                    {course.feeStructure.custom?.length > 0 && (
                      <div>
                        <SectionTitle>Special Offers</SectionTitle>
                        <div className="grid sm:grid-cols-2 gap-4">
                          {course.feeStructure.custom.map((plan, i) => (
                            <motion.div key={plan.planId || i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                              className="relative rounded-2xl border border-[#CC3700]/40 bg-gradient-to-br from-orange-50 to-white p-5 sm:p-6 shadow-sm">
                              <span className="absolute -top-2.5 left-5 rounded-full bg-[#CC3700] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Limited offer</span>
                              <h3 className="mt-1 font-bold text-gray-900 text-sm sm:text-base">{plan.plan}</h3>
                              {plan.subtitle && <p className="mt-0.5 text-sm text-gray-500">{plan.subtitle}</p>}
                              <div className="mt-2 flex items-baseline gap-2">
                                <p className="text-2xl font-extrabold text-[#CC3700]">{plan.price}</p>
                                {plan.mrp && <p className="text-sm text-gray-400 line-through">{plan.mrp}</p>}
                              </div>
                              <ul className="mt-4 space-y-2">
                                {plan.features.map((f, fi) => (
                                  <li key={fi} className="flex items-center gap-2 text-sm text-gray-600">
                                    <LuCircleCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />{f}
                                  </li>
                                ))}
                              </ul>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                    {course.feeStructure.monthly?.length > 0 && (
                      <div>
                        <SectionTitle>Monthly Plans</SectionTitle>
                        <div className="grid sm:grid-cols-2 gap-4">
                          {course.feeStructure.monthly.map((plan, i) => (
                            <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                              className={`rounded-2xl border p-5 sm:p-6 shadow-sm ${plan.sessionType === "premium" ? "border-[#CC3700]/30 bg-gradient-to-br from-orange-50 to-white" : "border-gray-100 bg-white"}`}>
                              <div className="flex items-start justify-between gap-3 mb-1">
                                <h3 className="font-bold text-gray-900 text-sm sm:text-base">{plan.plan}</h3>
                                {plan.sessionType === "premium" && <span className="rounded-full bg-[#CC3700] px-2.5 py-0.5 text-[11px] font-semibold text-white shrink-0">Premium</span>}
                              </div>
                              <p className="text-2xl font-extrabold text-[#CC3700]">{plan.price}</p>
                              <ul className="mt-4 space-y-2">
                                {plan.features.map((f, fi) => (
                                  <li key={fi} className="flex items-center gap-2 text-sm text-gray-600">
                                    <LuCircleCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />{f}
                                  </li>
                                ))}
                              </ul>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                    {course.feeStructure.full?.length > 0 && (
                      <div>
                        <SectionTitle>Full Payment Plans</SectionTitle>
                        <div className="grid sm:grid-cols-2 gap-4">
                          {course.feeStructure.full.map((plan, i) => (
                            <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                              className="rounded-2xl border border-gray-100 bg-white p-5 sm:p-6 shadow-sm">
                              <h3 className="font-bold text-gray-900 text-sm sm:text-base">{plan.plan}</h3>
                              <p className="text-2xl font-extrabold text-emerald-600 mt-1">{plan.price}</p>
                              <ul className="mt-4 space-y-2">
                                {plan.features.map((f, fi) => (
                                  <li key={fi} className="flex items-center gap-2 text-sm text-gray-600">
                                    <LuCircleCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />{f}
                                  </li>
                                ))}
                              </ul>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </TabPane>
              )}
            </AnimatePresence>
          </div>

          {/* ── Desktop sidebar ── */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-2xl border border-gray-100 bg-white shadow-xl overflow-hidden">
              <div className="bg-gradient-to-br from-[#FF6B35] to-[#ff9560] px-6 py-5">
                <p className="text-white/75 text-xs font-medium uppercase tracking-wide">Starting from</p>
                <p className="text-3xl font-extrabold text-white mt-1">{course.price}</p>
                {course.branchCount > 0 && <p className="text-white/65 text-xs mt-1">{course.branchCount} branch{course.branchCount > 1 ? "es" : ""} available</p>}
              </div>
              <div className="p-6 space-y-3">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => openEnrollmentFlow()}
                  className="w-full rounded-xl bg-[#CC3700] py-3 text-sm font-bold text-white hover:bg-[#B83100] transition shadow-md shadow-orange-100">
                  Enroll Now
                </motion.button>
                <div className="flex items-stretch gap-3">
                  <motion.button whileTap={{ scale: 0.97 }} onClick={() => openDemoFlow()}
                    className="flex-1 rounded-xl border-2 border-gray-200 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
                    Book a Free Demo
                  </motion.button>
                  <ContactActionsMenu onRequestCallback={() => setCallbackOpen(true)} />
                </div>
                <ul className="mt-2 space-y-2.5 pt-3 border-t border-gray-100">
                  {[
                    { icon: LuBookOpen, text: "Full course access" },
                    { icon: LuUsers, text: "Live interactive sessions" },
                    { icon: LuAward, text: "Certificate on completion" },
                    { icon: course.mode === "online" ? LuWifi : LuMapPin, text: `${course.mode === "online" ? "Online" : "Offline"} learning` },
                  ].map(({ icon: Icon, text }) => (
                    <li key={text} className="flex items-center gap-2.5 text-sm text-gray-600">
                      <Icon className="w-4 h-4 text-[#CC3700] shrink-0" />{text}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* ════ INSTRUCTOR PROFILE MODAL ════════════════════════════ */}
      <AnimatePresence>
        {activeInstructor && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={() => setActiveInstructor(null)}>
            <motion.div
              initial={{ y: 40, opacity: 0, scale: 0.97 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 20, opacity: 0, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="relative my-auto max-h-[calc(100vh-2rem)] w-full max-w-4xl overflow-y-auto rounded-[1.5rem] bg-white shadow-2xl sm:rounded-[2rem]"
              onClick={(e) => e.stopPropagation()}>
              <button type="button" onClick={() => setActiveInstructor(null)}
                className="absolute right-5 top-5 z-10 rounded-full bg-gray-100 p-2.5 text-gray-600 hover:bg-gray-200 transition" aria-label="Close">
                <XIcon className="w-4 h-4" />
              </button>
              <div className="grid overflow-hidden lg:grid-cols-[280px,1fr]">
                <aside className="relative flex flex-col items-center justify-start bg-[radial-gradient(circle_at_top,_rgba(255,107,53,0.12),_transparent_50%),linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] px-6 py-8 text-center">
                  <div className="absolute left-8 top-8 h-20 w-20 rounded-full bg-orange-100 blur-2xl" />
                  <div className="absolute bottom-8 right-8 h-16 w-16 rounded-full bg-amber-100 blur-2xl" />
                  <div className="relative">
                    <div className="rounded-full bg-gradient-to-br from-orange-200 via-gray-100 to-white p-3 shadow-xl">
                      <img src={activeInstructor.image} alt={activeInstructor.name}
                        className="h-36 w-36 sm:h-44 sm:w-44 rounded-full border-8 border-white object-cover object-center"
                        onError={(e) => { e.currentTarget.src = getInitialsImage(activeInstructor.name); }} />
                    </div>
                  </div>
                  <div className="relative mt-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-500">Instructor</p>
                    <h2 className="mt-2 text-xl font-bold text-gray-950">{activeInstructor.name}</h2>
                    <p className="mt-1 text-sm capitalize text-gray-500">{activeInstructor.mode || "Online"} Instructor</p>
                  </div>
                </aside>
                <div className="space-y-4 p-5 sm:p-7">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Students", value: activeInstructor.exp?.split(" ")[0] || "—" },
                      { label: "Rating", value: activeInstructor.rating > 0 ? `${activeInstructor.rating.toFixed(1)}/5` : "New" },
                      { label: "Mode", value: activeInstructor.mode || "Online" },
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded-2xl bg-gray-50 border border-gray-100 p-3 text-center">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
                        <p className="mt-1 text-sm font-bold text-gray-900 capitalize">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {activeInstructor.yearsExperience && <span className="rounded-full bg-orange-50 border border-orange-100 px-3 py-1 text-xs font-medium text-orange-600">{activeInstructor.yearsExperience}</span>}
                    {activeInstructor.qualification && <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">{activeInstructor.qualification}</span>}
                    {activeInstructor.location && <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 flex items-center gap-1"><LuMapPin className="w-3 h-3" />{activeInstructor.location}</span>}
                    {activeInstructor.expertise && <span className="rounded-full bg-blue-50 border border-blue-100 px-3 py-1 text-xs font-medium text-blue-700">{activeInstructor.expertise}</span>}
                  </div>
                  {(activeInstructor.courseDemoVideo || activeInstructor.profileVideo) ? (
                    <div>
                      {activeInstructor.courseDemoVideo && (
                        <>
                          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-orange-500">Course Demo</p>
                          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-black">
                            <video key={activeInstructor.courseDemoVideo} src={activeInstructor.courseDemoVideo} controls playsInline preload="metadata" className="aspect-video w-full bg-black">Your browser cannot preview this video.</video>
                          </div>
                        </>
                      )}
                      {!activeInstructor.courseDemoVideo && activeInstructor.profileVideo && (
                        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-black">
                          <video key={activeInstructor.profileVideo} src={activeInstructor.profileVideo} controls playsInline preload="metadata" className="aspect-video w-full bg-black">Your browser cannot preview this video.</video>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-400">No demo video uploaded yet.</div>
                  )}
                  {activeInstructor.courseCertificates?.length > 0 && (
                    <div>
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-orange-500">Certificates</p>
                      <div className="flex flex-wrap gap-2">
                        {activeInstructor.courseCertificates.map((cert, ci) => (
                          <a key={ci} href={cert} target="_blank" rel="noreferrer"
                            className="flex items-center gap-1.5 rounded-xl border border-orange-100 bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-100 transition">
                            <LuAward className="w-3.5 h-3.5" /> Certificate {ci + 1}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <motion.button type="button" whileTap={{ scale: 0.97 }}
                      onClick={() => { setActiveInstructor(null); openDemoFlow(activeInstructor.id || ""); }}
                      className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
                      Book Demo With This Instructor
                    </motion.button>
                    <motion.button type="button" whileTap={{ scale: 0.97 }}
                      onClick={() => { const id = activeInstructor.id || ""; setActiveInstructor(null); openEnrollmentFlow(id); }}
                      className="flex-1 rounded-xl bg-[#CC3700] px-4 py-3 text-sm font-bold text-white shadow-md shadow-orange-200 hover:bg-[#B83100] transition">
                      Enroll With This Instructor
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════ MODALS ══════════════════════════════════════════════ */}
      <EnrollTerm isOpen={isEnrollTermOpen} onClose={() => setEnrollTermOpen(false)} course={rawCourse} preferredInstructorId={preferredInstructorId} />
      <BookDemoModal isOpen={isBookDemoOpen} onClose={() => setBookDemoOpen(false)} course={rawCourse} preferredInstructorId={preferredInstructorId} />
      <CallbackRequestModal isOpen={isCallbackOpen} onClose={() => setCallbackOpen(false)} course={rawCourse} />
      <LoginModal open={isLoginOpen}
        onClose={() => { setLoginOpen(false); setPendingEnrollmentAuth(false); }}
        nextHref={pathname ? `${pathname}?action=enroll` : "/courses"}
        onSuccess={(payload) => {
          if (!isStudentAccount(payload?.user)) { showStudentOnlyMessage("enroll in courses"); setLoginOpen(false); setPendingEnrollmentAuth(false); return false; }
          clearEnrollmentResume(); setLoginOpen(false);
          if (pendingEnrollmentAuth) { setPendingEnrollmentAuth(false); setEnrollTermOpen(true); }
        }} />
    </div>
  );
}
