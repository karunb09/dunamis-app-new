"use client";

import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Clock, Users } from "lucide-react";
import BookDemoModal from "@/compoents/PopupModals/BookDemoModal";
import EnrollTerm from "@/compoents/PopupModals/EnrollTerms";
import LoginModal from "@/compoents/PopupModals/LoginModal";
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
import { buildTeacherName } from "@/helpers/courseSlots";

// Public course read; stays direct. Auth state comes from the store (seeded from
// the httpOnly session cookie), not from localStorage.
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "";

const buildCurriculum = (contentItems = []) => {
  const items = Array.isArray(contentItems)
    ? contentItems
    : contentItems
      ? [contentItems]
      : [];

  return items.flatMap((contentItem) => {
    const modules = Array.isArray(contentItem?.modules) ? contentItem.modules : [];

    return modules.map((module, index) => ({
      id: module?._id || `${contentItem?._id || "content"}-${index}`,
      module: module?.title || "Module",
      duration: module?.duration || "",
      topics:
        module?.lessons
          ?.flatMap((lesson) => {
            if (Array.isArray(lesson?.topics) && lesson.topics.length > 0) {
              return lesson.topics
                .map(
                  (topic) =>
                    topic?.title || topic?.description?.substring(0, 100) || ""
                )
                .filter(Boolean);
            }

            return lesson?.title ? [lesson.title] : [];
          })
          .filter(Boolean) || [],
    }));
  });
};

const normalizeImageKey = (value) => {
  const text = String(value || '').trim().replace(/\\/g, '/');
  if (!text) return '';

  try {
    const url = new URL(text, 'https://dunamis.local');
    return url.pathname.replace(/^\/+/, '').toLowerCase();
  } catch {
    return text.replace(/^\/+/, '').toLowerCase();
  }
};

const getInstructorImage = (teacher, courseImage, name) => {
  const courseImageKey = normalizeImageKey(courseImage);
  const candidates = [
    teacher?.teacherDetail?.profilePicture,
    teacher?.teacherDetails?.profilePicture,
    teacher?.teacherApplication?.profilePicture,
    teacher?.profilePicture,
    teacher?.userId?.image,
    teacher?.user?.image,
    teacher?.image,
  ];

  const image = candidates.find((candidate) => {
    const imageKey = normalizeImageKey(candidate);
    return imageKey && imageKey !== courseImageKey;
  });

  return resolveImageUrl(image, getInitialsImage(name));
};

const buildInstructorCards = (courseRecord) =>
  (courseRecord?.teacher || []).map((teacher) => {
    const name = buildTeacherName(teacher);

    return {
      id: teacher?._id || teacher?.id,
      name,
      branch: courseRecord?.category?.name || "Department",
      exp: `${teacher?.studentCount || 0} students taught`,
      rating: Number(teacher?.averageRating) || 0,
      image: getInstructorImage(teacher, courseRecord?.image, name),
      profileVideo: resolveImageUrl(
        teacher?.teacherDetail?.profileVideo || teacher?.profileVideo,
        ""
      ),
      expertise: teacher?.teacherDetail?.areaOfExpertise || "",
      qualification: teacher?.teacherDetail?.highestQualification || "",
      location: [
        teacher?.teacherDetail?.currentCity,
        teacher?.teacherDetail?.currentState,
      ]
        .filter(Boolean)
        .join(", "),
      yearsExperience: teacher?.teacherDetail?.yearOfExperience
        ? `${teacher.teacherDetail.yearOfExperience} years experience`
        : "",
      mode: teacher?.teacherDetail?.mode || courseRecord?.mode || "online",
    };
  });

const mapFeeStructure = (price, type = "monthly") => {
  const sessionType = price?.sessionType || "standard";
  const sessionLabel = sessionType === "premium" ? "Individual" : "Group";
  const mentorshipFeature =
    sessionType === "premium" ? "1-on-1 mentorship" : "Group mentorship";

  // Use tenurePlans when available (new courses); fall back to legacy single-price fields.
  const tenurePlans = Array.isArray(price?.tenurePlans)
    ? price.tenurePlans.filter(
        (p) =>
          p.isActive !== false &&
          (Number(p.monthlyFee) > 0 || Number(p.fullPayment) > 0)
      )
    : [];

  if (tenurePlans.length > 0) {
    return tenurePlans.map((plan) => {
      const pct = Number(plan.discount) || 0;

      if (type === "monthly") {
        return {
          plan: `${sessionLabel} · ${plan.months}-month`,
          price: `₹${plan.monthlyFee || 0}/month`,
          features: [
            "Full course access",
            "Live sessions",
            mentorshipFeature,
            pct > 0 ? `${pct}% off on full payment` : "Flexible payment",
            "Certificate upon completion",
          ],
        };
      }

      return {
        plan: `${sessionLabel} · ${plan.months}-month`,
        // Show percentage only — don't repeat the ₹ amount already visible in monthly card.
        price: pct > 0 ? `Save ${pct}%` : "One-time",
        features: [
          "Full course access",
          "All course materials",
          pct > 0
            ? `Pay ₹${plan.fullPayment || 0} one-time (${pct}% off)`
            : `₹${plan.fullPayment || 0} one-time`,
          "Lifetime access",
          sessionType === "premium" ? "Priority support" : "Standard support",
          "Certificate upon completion",
        ],
      };
    });
  }

  // Legacy single-price fallback.
  if (type === "monthly") {
    return [
      {
        plan: sessionLabel,
        price: `₹${price?.monthlyFee || 0}/month`,
        features: [
          "Full course access",
          "Live sessions",
          mentorshipFeature,
          price?.discount > 0
            ? `${price.discount}% discount on full payment`
            : "Flexible payment",
          "Certificate upon completion",
        ],
      },
    ];
  }

  const pct = Number(price?.discount) || 0;
  return [
    {
      plan: sessionLabel,
      price: pct > 0 ? `Save ${pct}%` : "One-time",
      features: [
        "Full course access",
        "All course materials",
        pct > 0
          ? `Pay ₹${price?.fullPayment || 0} one-time (${pct}% off)`
          : `₹${price?.fullPayment || 0} one-time`,
        "Lifetime access",
        sessionType === "premium" ? "Priority support" : "Standard support",
        "Certificate upon completion",
      ],
    },
  ];
};

const transformCourseData = (courseRecord, courseFallbackImage) => {
  const selectedPrice =
    courseRecord?.price?.find((price) => price?.isSelected) ||
    courseRecord?.price?.find((price) => price?.isActive !== false) ||
    courseRecord?.price?.[0];

  return {
    id: courseRecord?._id,
    title: courseRecord?.name || "Untitled Course",
    category: courseRecord?.category?.name || "Not specified",
    level: courseRecord?.level || "beginner",
    mode: courseRecord?.mode || "online",
    description: courseRecord?.description || "No description available",
    duration:
      courseRecord?.startDate && courseRecord?.endDate
        ? `${new Date(courseRecord.startDate).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })} - ${new Date(courseRecord.endDate).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}`
        : "",
    price: selectedPrice
      ? `₹${selectedPrice.monthlyFee}/month`
      : "Price not available",
    image: resolveImageUrl(courseRecord?.image, courseFallbackImage),
    rating: courseRecord?.rating || 4.8,
    reviewsCount:
      courseRecord?.totalStudents ||
      courseRecord?.enrolledStudents?.length ||
      0,
    learn:
      courseRecord?.objectives && courseRecord.objectives.length > 0
        ? courseRecord.objectives
        : [
            "Comprehensive understanding of core concepts",
            "Practical hands-on experience",
            "Industry-relevant skills",
            "Project-based learning",
          ],
    curriculum: buildCurriculum(courseRecord?.content),
    instructors: buildInstructorCards(courseRecord),
    feeStructure: {
      monthly:
        courseRecord?.price
          ?.filter((price) => price?.isActive !== false)
          .flatMap((price) => mapFeeStructure(price, "monthly")) || [],
      full:
        courseRecord?.price
          ?.filter((price) => price?.isActive !== false)
          .flatMap((price) => mapFeeStructure(price, "full")) || [],
    },
    branches: courseRecord?.branches || [],
    branchCount: courseRecord?.branchCount || 0,
    code: courseRecord?.code || "",
  };
};

export default function CourseDetailPage() {
  const dispatch = useDispatch();
  const pathname = usePathname();
  const { courses, loading, error } = useSelector((state) => state.course);
  const { token, user } = useSelector((state) => state.auth || {});
  const { courseName } = useParams();

  const [isEnrollTermOpen, setEnrollTermOpen] = useState(false);
  const [isBookDemoOpen, setBookDemoOpen] = useState(false);
  const [isLoginOpen, setLoginOpen] = useState(false);
  const [pendingQueryAction, setPendingQueryAction] = useState(null);
  const [pendingEnrollmentAuth, setPendingEnrollmentAuth] = useState(false);
  const [activeTab, setActiveTab] = useState("Overview");
  const [detailLoading, setDetailLoading] = useState(false);
  const [preferredInstructorId, setPreferredInstructorId] = useState("");
  const [activeInstructor, setActiveInstructor] = useState(null);

  const [course, setCourse] = useState(null);
  const [rawCourse, setRawCourse] = useState(null);
  const courseFallbackImage = getCoursePlaceholderImage();

  const hasActiveAuth = () => Boolean(token);

  const isStudentAccount = (account = user) =>
    String(account?.accountType || "").toLowerCase() === "student";

  const showStudentOnlyMessage = (action) => {
    toast.error(`Only student accounts can ${action}.`);
  };

  useEffect(() => {
    dispatch(fetchCourses());
  }, [dispatch]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const action =
      params.get("action") ||
      (params.get("intent") === "demo" ? "demo" : null);

    if (!action) return;

    setPendingQueryAction(action);
    params.delete("action");
    params.delete("intent");

    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}`;
    window.history.replaceState({}, "", nextUrl);
  }, []);

  useEffect(() => {
    let ignore = false;

    const loadCourseDetail = async () => {
      if (!courseName) return;
      if (!courses || courses.length === 0) {
        if (!loading) {
          setDetailLoading(false);
          setCourse(null);
          setRawCourse(null);
        }
        return;
      }

      const decodedParam = decodeURIComponent(courseName);
      let foundCourse = courses.find((item) => item._id === decodedParam);

      if (!foundCourse) {
        const paramSlug = decodedParam.toLowerCase().replace(/\s+/g, "-");
        foundCourse = courses.find((item) => {
          const courseSlug = item.name?.toLowerCase().replace(/\s+/g, "-");
          return courseSlug === paramSlug;
        });
      }

      if (!foundCourse) {
        setDetailLoading(false);
        setCourse(null);
        setRawCourse(null);
        return;
      }

      setDetailLoading(true);

      let resolvedCourse = foundCourse;

      try {
        const response = await fetch(`${BASE_URL}/v1/course/get/${foundCourse._id}`);

        if (response.ok) {
          const data = await response.json();
          resolvedCourse = data?.data || foundCourse;
        }
      } catch {
        resolvedCourse = foundCourse;
      }

      if (ignore) return;

      setRawCourse(resolvedCourse);
      setCourse(transformCourseData(resolvedCourse, courseFallbackImage));
      setDetailLoading(false);
    };

    loadCourseDetail();

    return () => {
      ignore = true;
    };
  }, [courseFallbackImage, courseName, courses, loading]);

  useEffect(() => {
    setActiveInstructor(null);
  }, [course?.id]);

  useEffect(() => {
    if (!pendingQueryAction || !rawCourse) return;

    if (pendingQueryAction === "demo") {
      setPreferredInstructorId("");
      setBookDemoOpen(true);
      setPendingQueryAction(null);
      return;
    }

    if (pendingQueryAction === "enroll") {
      if (hasActiveAuth()) {
        if (!isStudentAccount()) {
          showStudentOnlyMessage("enroll in courses");
          setPendingQueryAction(null);
          return;
        }

        clearEnrollmentResume();
        setEnrollTermOpen(true);
      } else {
        if (pathname) {
          saveEnrollmentResume(`${pathname}?action=enroll`);
        }
        setPendingEnrollmentAuth(true);
        setLoginOpen(true);
      }
      setPendingQueryAction(null);
    }
  }, [pathname, pendingQueryAction, rawCourse, token, user]);

  const openEnrollmentFlow = (instructorId = "") => {
    setPreferredInstructorId(instructorId);

    if (hasActiveAuth()) {
      if (!isStudentAccount()) {
        showStudentOnlyMessage("enroll in courses");
        return;
      }

      clearEnrollmentResume();
      setPendingEnrollmentAuth(false);
      setEnrollTermOpen(true);
      return;
    }

    if (pathname) {
      saveEnrollmentResume(`${pathname}?action=enroll`);
    }
    setPendingEnrollmentAuth(true);
    setLoginOpen(true);
  };

  const openDemoFlow = (instructorId = "") => {
    setPreferredInstructorId(instructorId);
    setBookDemoOpen(true);
  };

  if (loading || detailLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B35] mx-auto mb-4"></div>
            <p className="text-gray-600">Loading course details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error: {error}</p>
          <Link href="/courses" className="text-[#FF6B35] hover:underline">
            ← Back to Courses
          </Link>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="text-center">
          <p className="text-red-500 text-xl mb-2">Course not found!</p>
          <p className="text-gray-600 mb-4">
            The course you're looking for doesn't exist or has been removed.
          </p>
          <Link
            href="/courses"
            className="inline-block bg-[#FF6B35] text-white px-6 py-2 rounded-lg hover:bg-[#FF5722] transition"
          >
            ← Back to Courses
          </Link>
        </div>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/courses"
        className="text-sm text-gray-500 hover:text-black block mb-4"
      >
        ← Back to Courses
      </Link>

      <div className="grid md:grid-cols-2 gap-8 md:gap-10 items-start">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="rounded-xl overflow-hidden shadow-lg"
        >
          <img
            src={course.image}
            alt={course.title}
            className="w-full h-60 sm:h-72 md:h-96 object-cover"
            onError={(e) => {
              e.currentTarget.src = courseFallbackImage;
            }}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full font-medium">
              {course.category}
            </span>
            {course.code && (
              <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full font-medium">
                {course.code}
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mt-3">
            {course.title}
          </h1>
          <p className="text-gray-600 mt-3 sm:mt-4 leading-relaxed text-sm sm:text-base">
            {course.description}
          </p>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-4 sm:mt-5 text-xs sm:text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <IoMdStar className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="font-medium">{course.rating}</span>
              <span className="text-gray-500">
                ({course.reviewsCount} students)
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{course.duration}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span className="capitalize">{course.level}</span>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-5 sm:mt-6"
          >
            <div className="flex flex-col items-start gap-3">
              <div>
                <p className="text-2xl sm:text-3xl font-bold text-[#FF6B35]">
                  {course.price}
                </p>
                <p className="text-xs text-gray-500 mt-1 capitalize">
                  {course.mode} • {course.level}
                  {course.branchCount > 0 &&
                    ` • ${course.branchCount} branch${
                      course.branchCount > 1 ? "es" : ""
                    }`}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-3 w-full">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => openEnrollmentFlow()}
                  className="w-full sm:w-auto bg-[#FF6B35] text-white py-2 px-6 rounded-xl cursor-pointer font-medium text-sm"
                >
                  Enroll Now
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => openDemoFlow()}
                  className="w-full sm:w-auto border-2 border-gray-400 py-2 px-6 rounded-xl cursor-pointer hover:bg-gray-50 text-sm font-medium"
                >
                  Book Demo
                </motion.button>
              </div>
              <p className="text-xs text-gray-500">
                Demo booking starts here without forcing login.
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>

      <div className="mt-10 border-b border-gray-200 flex gap-4 sm:gap-8 overflow-x-auto text-xs sm:text-sm font-medium relative">
        {["Overview", "Curriculum", "Instructors", "Fee Structure"].map(
          (tab) => (
            <button
              key={tab}
              type="button"
              className={`cursor-pointer shrink-0 pb-3 relative ${
                activeTab === tab
                  ? "text-black font-semibold"
                  : "text-gray-500"
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-black rounded-full" />
              )}
            </button>
          )
        )}
      </div>

      <div className="mt-6 sm:mt-8">
        {activeTab === "Overview" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-3">About the Course</h2>
              <p className="text-gray-600 leading-relaxed">
                {course.description}
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">What You&apos;ll Learn</h3>
              {course.learn?.length ? (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {course.learn.map((item, index) => (
                    <li
                      key={`${item}-${index}`}
                      className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-600">No learning objectives added yet.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === "Curriculum" && (
          <div>
            <h2 className="text-2xl font-bold mb-3">Curriculum</h2>
            {course.curriculum?.length ? (
              <div className="space-y-4">
                {course.curriculum.map((module, index) => (
                  <div
                    key={`${module.module}-${index}`}
                    className="rounded-2xl border border-gray-200 bg-white p-5"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <h3 className="text-lg font-semibold">{module.module}</h3>
                      {module.duration ? (
                        <span className="text-sm text-gray-500">
                          {module.duration}
                        </span>
                      ) : null}
                    </div>

                    {module.topics?.length ? (
                      <ul className="mt-4 space-y-2 text-sm text-gray-700">
                        {module.topics.map((topic, topicIndex) => (
                          <li key={`${topic}-${topicIndex}`}>{topic}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-4 text-sm text-gray-600">
                        No topics added for this module yet.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No curriculum added yet.</p>
            )}
          </div>
        )}

        {activeTab === "Instructors" && (
          <div>
            <h2 className="text-2xl font-bold mb-3">Instructors</h2>
            {course.instructors?.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {course.instructors.map((instructor, index) => (
                  <button
                    type="button"
                    key={`${instructor.name}-${index}`}
                    onClick={() => setActiveInstructor(instructor)}
                    className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 text-left transition hover:border-orange-300 hover:shadow-sm"
                  >
                    <img
                      src={instructor.image}
                      alt={instructor.name}
                      className="h-14 w-14 rounded-full object-cover object-top"
                    />
                    <div>
                      <p className="font-semibold text-gray-900">
                        {instructor.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {instructor.exp}
                      </p>
                      <p className="text-sm text-gray-500">
                        {instructor.expertise || instructor.branch}
                      </p>
                      <p className="mt-1 text-xs font-medium text-[#FF6B35]">
                        View profile and choose this instructor
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No instructors listed yet.</p>
            )}
          </div>
        )}

        {activeTab === "Fee Structure" && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-3">Monthly Plans</h2>
              {course.feeStructure.monthly?.length ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {course.feeStructure.monthly.map((plan, index) => (
                    <div
                      key={`${plan.plan}-${index}`}
                      className="rounded-2xl border border-gray-200 bg-white p-5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-lg font-semibold">{plan.plan}</h3>
                        <p className="text-xl font-bold text-[#FF6B35]">
                          {plan.price}
                        </p>
                      </div>
                      <ul className="mt-4 space-y-2 text-sm text-gray-700">
                        {plan.features.map((feature, featureIndex) => (
                          <li key={`${feature}-${featureIndex}`}>{feature}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No monthly plans available.</p>
              )}
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-3">Full Payment Plans</h2>
              {course.feeStructure.full?.length ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {course.feeStructure.full.map((plan, index) => (
                    <div
                      key={`${plan.plan}-${index}`}
                      className="rounded-2xl border border-gray-200 bg-white p-5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-lg font-semibold">{plan.plan}</h3>
                        <p className="text-xl font-bold text-[#FF6B35]">
                          {plan.price}
                        </p>
                      </div>
                      <ul className="mt-4 space-y-2 text-sm text-gray-700">
                        {plan.features.map((feature, featureIndex) => (
                          <li key={`${feature}-${featureIndex}`}>{feature}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No full payment plans available.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {activeInstructor ? (
        <div
          className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setActiveInstructor(null)}
        >
          <div
            className="relative my-auto max-h-[calc(100vh-2rem)] w-full max-w-4xl overflow-y-auto rounded-[1.5rem] bg-white shadow-2xl sm:rounded-[2rem]"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveInstructor(null)}
              className="absolute right-5 top-5 z-10 rounded-full bg-gray-100 p-3 text-gray-600 transition hover:bg-gray-200"
              aria-label="Close instructor profile"
            >
              ×
            </button>

            <div className="grid overflow-hidden lg:grid-cols-[300px,1fr]">
              <aside className="relative flex flex-col items-center justify-start bg-[radial-gradient(circle_at_top,_rgba(255,107,53,0.14),_transparent_44%),linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] px-6 py-8 text-center">
                <div className="absolute left-8 top-8 h-20 w-20 rounded-full bg-orange-100 blur-2xl" />
                <div className="absolute bottom-8 right-8 h-20 w-20 rounded-full bg-amber-100 blur-2xl" />

                <div className="relative">
                  <div className="rounded-full bg-gradient-to-br from-orange-200 via-gray-100 to-white p-3 shadow-[0_24px_70px_-35px_rgba(15,23,42,0.55)]">
                    <img
                      src={activeInstructor.image}
                      alt={activeInstructor.name}
                      className="h-44 w-44 rounded-full border-8 border-white object-cover object-center sm:h-52 sm:w-52"
                      onError={(event) => {
                        event.currentTarget.src = getInitialsImage(activeInstructor.name);
                      }}
                    />
                  </div>
                </div>

                <div className="relative mt-5 max-w-xs">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-500">
                    Instructor profile
                  </p>
                  <h2 className="mt-3 text-2xl font-bold text-gray-950">
                    {activeInstructor.name}
                  </h2>
                  <p className="mt-2 text-sm capitalize text-gray-600">
                    {activeInstructor.mode || "Online"} Instructor
                  </p>
                </div>
              </aside>

              <div className="space-y-4 p-6 lg:p-8">
                <div className="rounded-[1.5rem] border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm font-semibold text-gray-900">
                    {activeInstructor.expertise || activeInstructor.branch || "Course instructor"}
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-white p-3 ring-1 ring-gray-100">
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-gray-400">
                        Students
                      </p>
                      <p className="mt-1 text-base font-bold text-gray-950">
                        {activeInstructor.exp || "0 students taught"}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white p-3 ring-1 ring-gray-100">
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-gray-400">
                        Rating
                      </p>
                      <p className="mt-1 text-base font-bold text-gray-950">
                        {activeInstructor.rating > 0
                          ? `${activeInstructor.rating.toFixed(1)} / 5`
                          : "New"}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white p-3 ring-1 ring-gray-100">
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-gray-400">
                        Mode
                      </p>
                      <p className="mt-1 text-base font-bold capitalize text-gray-950">
                        {activeInstructor.mode || "Online"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                  {activeInstructor.yearsExperience ? (
                    <span className="rounded-full bg-orange-50 px-3 py-1.5 font-medium text-orange-700">
                      {activeInstructor.yearsExperience}
                    </span>
                  ) : null}
                  {activeInstructor.qualification ? (
                    <span className="rounded-full bg-gray-100 px-3 py-1.5 font-medium text-gray-700">
                      {activeInstructor.qualification}
                    </span>
                  ) : null}
                  {activeInstructor.location ? (
                    <span className="rounded-full bg-gray-100 px-3 py-1.5 font-medium text-gray-700">
                      {activeInstructor.location}
                    </span>
                  ) : null}
                </div>

                {activeInstructor.profileVideo ? (
                  <div className="overflow-hidden rounded-[1.5rem] border border-gray-200 bg-black shadow-sm">
                    <video
                      key={activeInstructor.profileVideo}
                      src={activeInstructor.profileVideo}
                      controls
                      playsInline
                      preload="metadata"
                      className="aspect-video w-full bg-black"
                    >
                      Your browser cannot preview this video format.
                    </video>
                  </div>
                ) : (
                  <div className="rounded-[1.5rem] border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
                    Demo video has not been uploaded for this instructor yet.
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveInstructor(null);
                      openDemoFlow(activeInstructor.id || "");
                    }}
                    className="rounded-2xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    Book Demo With This Instructor
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const instructorId = activeInstructor.id || "";
                      setActiveInstructor(null);
                      openEnrollmentFlow(instructorId);
                    }}
                    className="rounded-2xl bg-[#FF6B35] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:bg-[#fd5a1f]"
                  >
                    Enroll With This Instructor
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <EnrollTerm
        isOpen={isEnrollTermOpen}
        onClose={() => setEnrollTermOpen(false)}
        course={rawCourse}
        preferredInstructorId={preferredInstructorId}
      />

      <BookDemoModal
        isOpen={isBookDemoOpen}
        onClose={() => setBookDemoOpen(false)}
        course={rawCourse}
        preferredInstructorId={preferredInstructorId}
      />

      <LoginModal
        open={isLoginOpen}
        onClose={() => {
          setLoginOpen(false);
          setPendingEnrollmentAuth(false);
        }}
        nextHref={pathname ? `${pathname}?action=enroll` : "/courses"}
        onSuccess={(payload) => {
          if (!isStudentAccount(payload?.user)) {
            showStudentOnlyMessage("enroll in courses");
            setLoginOpen(false);
            setPendingEnrollmentAuth(false);
            return false;
          }

          clearEnrollmentResume();
          setLoginOpen(false);
          if (pendingEnrollmentAuth) {
            setPendingEnrollmentAuth(false);
            setEnrollTermOpen(true);
          }
        }}
      />
    </section>
  );
}
