"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSelector } from "react-redux";
import { HiArrowRight, HiBookOpen, HiRefresh } from "react-icons/hi";
import StudentShell from "@/components/student/StudentShell";
import { getWebsiteToken, getWebsiteUser } from "@/lib/authSession";
import { resolveImageUrl, getCoursePlaceholderImage } from "@/lib/resolveImageUrl";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

const getCourseId = (course) => course?._id || course?.id || "";

const getCourseName = (course) =>
  course?.name || course?.title || course?.courseName || "Course";

const getInstructorName = (enrollment) => {
  const instructor = enrollment?.teacherId || enrollment?.teacher || enrollment?.instructor;
  const name = instructor?.userId?.name || instructor?.name;

  if (typeof name === "string") return name;

  const firstName = name?.firstName || instructor?.firstName || "";
  const lastName = name?.lastName || instructor?.lastName || "";

  return `${firstName} ${lastName}`.trim() || "Instructor will be assigned";
};

const normalizeEnrollment = (enrollment) => {
  const course = enrollment?.courseId || enrollment?.course || enrollment;
  const progress = Number(enrollment?.progress || enrollment?.completionPercentage || 0);

  return {
    id: getCourseId(course),
    name: getCourseName(course),
    category: course?.category?.name || course?.category || "Course",
    mode: course?.mode || enrollment?.mode || "online",
    level: course?.level || "",
    image: resolveImageUrl(course?.image || course?.thumbnail, getCoursePlaceholderImage()),
    instructor: getInstructorName(enrollment),
    progress: Number.isFinite(progress) ? Math.max(0, Math.min(100, progress)) : 0,
    status: enrollment?.status || enrollment?.paymentStatus || "Active",
  };
};

export default function StudentMyCoursesPage() {
  const authUser = useSelector((state) => state.auth?.user);
  const authToken = useSelector((state) => state.auth?.token);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const session = useMemo(() => {
    if (typeof window === "undefined") return { user: authUser, token: authToken };

    return {
      user: authUser || getWebsiteUser(),
      token: authToken || getWebsiteToken(),
    };
  }, [authToken, authUser]);

  const loadStudent = async () => {
    const studentId = session.user?.roleId;

    if (!studentId) {
      setLoading(false);
      setError("Your student profile is not linked to this account yet.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${BASE_URL}/v1/student/${studentId}`, {
        credentials: "include",
        headers: session.token
          ? {
              Authorization: `Bearer ${session.token}`,
            }
          : {},
      });
      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Unable to load your courses.");
      }

      setStudent(data.student || data.data || null);
    } catch (err) {
      setError(err.message || "Unable to load your courses.");
      setStudent(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudent();
  }, [session.user?.roleId, session.token]);

  const courses = useMemo(() => {
    const enrolledCourses = Array.isArray(student?.enrolledCourses)
      ? student.enrolledCourses
      : [];

    return enrolledCourses.map(normalizeEnrollment).filter((course) => course.id);
  }, [student]);

  return (
    <StudentShell
      title="My Courses"
      description="Your enrolled courses are now loaded from the website student portal foundation."
    >
      <div className="rounded-[2rem] border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">Enrolled courses</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-950">{courses.length} active course{courses.length === 1 ? "" : "s"}</h2>
          </div>
          <button
            type="button"
            onClick={loadStudent}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-stone-300 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <HiRefresh className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="mt-6 grid gap-4">
          {[0, 1].map((item) => (
            <div key={item} className="h-44 animate-pulse rounded-[2rem] bg-white shadow-sm" />
          ))}
        </div>
      ) : error ? (
        <div className="mt-6 rounded-[2rem] border border-red-100 bg-red-50 p-6 text-red-700">
          <p className="font-semibold">Unable to load courses</p>
          <p className="mt-2 text-sm">{error}</p>
        </div>
      ) : courses.length === 0 ? (
        <div className="mt-6 rounded-[2rem] border border-dashed border-orange-200 bg-white p-8 text-center shadow-sm">
          <HiBookOpen className="mx-auto h-10 w-10 text-orange-500" />
          <h2 className="mt-4 text-xl font-bold text-slate-950">No enrolled courses yet</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Once you enroll in a course, it will appear here with your instructor and learning progress.
          </p>
          <Link
            href="/courses"
            className="mt-5 inline-flex items-center justify-center rounded-full bg-orange-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-700"
          >
            Explore Courses
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-4">
          {courses.map((course) => (
            <article
              key={course.id}
              className="overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-sm transition hover:border-orange-200 hover:shadow-md"
            >
              <div className="grid gap-0 lg:grid-cols-[220px_1fr]">
                <img
                  src={course.image}
                  alt={course.name}
                  className="h-56 w-full object-cover lg:h-full"
                />
                <div className="p-5 sm:p-6">
                  <div className="flex flex-wrap gap-2">
                    {[course.category, course.mode, course.level].filter(Boolean).map((tag) => (
                      <span key={tag} className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold capitalize text-orange-700">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <h3 className="mt-4 text-xl font-bold text-slate-950">{course.name}</h3>
                  <p className="mt-2 text-sm text-slate-500">By {course.instructor}</p>

                  <div className="mt-5">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                      <span>Progress</span>
                      <span>{course.progress}%</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100">
                      <div className="h-full rounded-full bg-orange-600" style={{ width: `${course.progress}%` }} />
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm font-semibold text-emerald-700">{course.status}</span>
                    <Link
                      href={`/courses/${course.id}`}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-stone-200 px-5 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                    >
                      View Course
                      <HiArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </StudentShell>
  );
}
