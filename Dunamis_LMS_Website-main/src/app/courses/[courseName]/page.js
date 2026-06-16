// Server component for a single course: emits per-course SEO metadata
// (generateMetadata) and server-renders content via ISR, then hands the record
// to the interactive client island. Previously this was a "use client" page
// with no per-course metadata and an empty SSR shell.
import CourseDetailClient from "./CourseDetailClient";
import { getCourseServer } from "@/lib/serverCourses";
import { buildMetadata } from "@/lib/seo";
import { resolveImageUrl } from "@/lib/resolveImageUrl";

export const revalidate = 300; // ISR (seconds)

export async function generateMetadata({ params }) {
  const { courseName } = await params;
  const course = await getCourseServer(courseName);
  const path = `/courses/${encodeURIComponent(courseName)}`;

  if (!course) {
    return buildMetadata({ title: "Course Not Found", path });
  }

  const title = course.name || "Course";
  const description = (course.description || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160) || undefined;

  const absoluteImage = resolveImageUrl(course.image, "");
  const image = /^https?:\/\//.test(absoluteImage) ? absoluteImage : undefined;

  return buildMetadata({ title, description, path, ...(image ? { image } : {}) });
}

export default async function CourseDetailPage({ params }) {
  const { courseName } = await params;
  const initialCourse = await getCourseServer(courseName);
  return <CourseDetailClient initialCourse={initialCourse} />;
}
