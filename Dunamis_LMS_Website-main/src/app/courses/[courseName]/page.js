"use client";

import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Clock, Users } from "lucide-react";
import BookDemoModal from "@/compoents/PopupModals/BookDemoModal";
import EnrollTerm from "@/compoents/PopupModals/EnrollTerms";
import EnrollModal from "@/compoents/PopupModals/EnrollModal";
import LoginModal from "@/compoents/PopupModals/LoginModal";
import { IoMdStar } from "react-icons/io";
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

export default function CourseDetailPage() {
  const dispatch = useDispatch();
  const pathname = usePathname();
  const { courses, loading, error } = useSelector((state) => state.course);
  const { token } = useSelector((state) => state.auth || {});
  const { courseName } = useParams();

  const [isEnrollTermOpen, setEnrollTermOpen] = useState(false);
  const [isEnrollOpen, setEnrollOpen] = useState(false);
  const [isBookDemoOpen, setBookDemoOpen] = useState(false);
  const [isLoginOpen, setLoginOpen] = useState(false);
  const [enrollSelection, setEnrollSelection] = useState(null);
  const [pendingQueryAction, setPendingQueryAction] = useState(null);
  const [pendingEnrollmentAuth, setPendingEnrollmentAuth] = useState(false);

  const [course, setCourse] = useState(null);
  const [rawCourse, setRawCourse] = useState(null);
  const courseFallbackImage = getCoursePlaceholderImage();

  const hasActiveAuth = () => {
    if (typeof window === "undefined") return Boolean(token);
    return Boolean(token || window.localStorage.getItem("auth_token"));
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
    if (courses && courses.length > 0 && courseName) {
      const decodedParam = decodeURIComponent(courseName);
      let foundCourse = courses.find((c) => c._id === decodedParam);
      if (!foundCourse) {
        const paramSlug = decodedParam.toLowerCase().replace(/\s+/g, "-");
        foundCourse = courses.find((c) => {
          const courseSlug = c.name?.toLowerCase().replace(/\s+/g, "-");
          return courseSlug === paramSlug;
        });
      }

      if (foundCourse) {
        const transformedCourse = {
          id: foundCourse._id,
          title: foundCourse.name || "Untitled Course",
          category: foundCourse.category?.name || "Not specified",
          level: foundCourse.level || "beginner",
          mode: foundCourse.mode || "online",
          description: foundCourse.description || "No description available",
          duration:
            foundCourse.startDate && foundCourse.endDate
              ? `${new Date(foundCourse.startDate).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })} - ${new Date(foundCourse.endDate).toLocaleDateString(
                  "en-GB",
                  { day: "2-digit", month: "short", year: "numeric" }
                )}`
              : "",
          price: (() => {
            const priceObj =
              foundCourse.price?.find((p) => p.isSelected) ||
              foundCourse.price?.[0];
            return priceObj
              ? `₹${priceObj.monthlyFee}/month`
              : "Price not available";
          })(),
          image: resolveImageUrl(
            foundCourse.image,
            courseFallbackImage
          ),
          rating: foundCourse.rating || 4.8,
          reviewsCount:
            foundCourse.totalStudents ||
            foundCourse.enrolledStudents?.length ||
            0,
          learn:
            foundCourse.objectives && foundCourse.objectives.length > 0
              ? foundCourse.objectives
              : [
                  "Comprehensive understanding of core concepts",
                  "Practical hands-on experience",
                  "Industry-relevant skills",
                  "Project-based learning",
                ],
          curriculum:
            foundCourse.content?.[0]?.modules?.map((module) => ({
              module: module.title || "Module",
              duration: module.duration || "",
              topics:
                module.lessons
                  ?.flatMap((lesson) => {
                    if (lesson.topics && lesson.topics.length > 0) {
                      return lesson.topics.map(
                        (topic) =>
                          topic.title || topic.description?.substring(0, 100)
                      );
                    }
                    return [lesson.title];
                  })
                  .filter(Boolean) || [],
            })) || [],
          instructors:
            foundCourse.teacher?.map((t) => ({
              name:
                `${t.teacherDetail?.name?.firstName || ""} ${
                  t.teacherDetail?.name?.lastName || ""
                }`.trim() || "Instructor",
              branch: foundCourse.category?.name || "Department",
              exp: `${t.studentCount || 0} students taught`,
              rating: t.averageRating || 0,
              image: resolveImageUrl(
                t.teacherDetail?.profilePicture || t.userId?.image,
                getInitialsImage(
                  `${t.teacherDetail?.name?.firstName || ""} ${
                    t.teacherDetail?.name?.lastName || ""
                  }`.trim() || "Instructor"
                )
              ),
            })) || [],
          feeStructure: {
            monthly:
              foundCourse.price
                ?.filter((p) => p.isActive)
                .map((p) => ({
                  plan:
                    p.sessionType.charAt(0).toUpperCase() +
                    p.sessionType.slice(1),
                  price: `₹${p.monthlyFee}/month`,
                  originalPrice: p.installments
                    ? `₹${p.monthlyFee * p.installments}`
                    : null,
                  features: [
                    "Full course access",
                    "Live sessions",
                    p.sessionType === "premium"
                      ? "1-on-1 mentorship"
                      : "Group mentorship",
                    p.discount > 0
                      ? `${p.discount}% discount on full payment`
                      : "Flexible payment",
                    "Certificate upon completion",
                  ],
                })) || [],
            full:
              foundCourse.price
                ?.filter((p) => p.isActive)
                .map((p) => ({
                  plan:
                    p.sessionType.charAt(0).toUpperCase() +
                    p.sessionType.slice(1),
                  price: `₹${p.fullPayment}`,
                  savings:
                    p.discount > 0 && p.installments
                      ? Math.round(
                          p.monthlyFee * p.installments - p.fullPayment
                        )
                      : null,
                  discount: p.discount || 0,
                  features: [
                    "Full course access",
                    "All course materials",
                    p.discount > 0
                      ? `Save ${p.discount}% (₹${Math.round(
                          p.monthlyFee * (p.installments || 3) - p.fullPayment
                        )})`
                      : "One-time payment",
                    "Lifetime access",
                    p.sessionType === "premium"
                      ? "Priority support"
                      : "Standard support",
                    "Certificate upon completion",
                  ],
                })) || [],
          },
          branches: foundCourse.branches || [],
          branchCount: foundCourse.branchCount || 0,
          code: foundCourse.code || "",
        };

        setCourse(transformedCourse);
        setRawCourse(foundCourse);
      } else {
        setCourse(null);
        setRawCourse(null);
      }
    }
  }, [courses, courseName]);

  useEffect(() => {
    if (!pendingQueryAction || !rawCourse) return;

    if (pendingQueryAction === "demo") {
      setBookDemoOpen(true);
      setPendingQueryAction(null);
      return;
    }

    if (pendingQueryAction === "enroll") {
      if (hasActiveAuth()) {
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
  }, [pathname, pendingQueryAction, rawCourse, token]);

  const openEnrollmentFlow = () => {
    if (hasActiveAuth()) {
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

  if (loading) {
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
                  onClick={openEnrollmentFlow}
                  className="w-full sm:w-auto bg-[#FF6B35] text-white py-2 px-6 rounded-xl cursor-pointer font-medium text-sm"
                >
                  Enroll Now
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setBookDemoOpen(true)}
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

      <EnrollTerm
        isOpen={isEnrollTermOpen}
        onClose={() => setEnrollTermOpen(false)}
        course={rawCourse}
        onNext={(selection) => {
          setEnrollSelection(selection);
          setEnrollTermOpen(false);
          setEnrollOpen(true);
        }}
      />

      <EnrollModal
        isOpen={isEnrollOpen}
        onClose={() => setEnrollOpen(false)}
        course={rawCourse}
        selection={enrollSelection}
      />

      <BookDemoModal
        isOpen={isBookDemoOpen}
        onClose={() => setBookDemoOpen(false)}
        course={rawCourse}
      />

      <LoginModal
        open={isLoginOpen}
        onClose={() => {
          setLoginOpen(false);
          setPendingEnrollmentAuth(false);
        }}
        nextHref={pathname ? `${pathname}?action=enroll` : "/courses"}
        onSuccess={() => {
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
