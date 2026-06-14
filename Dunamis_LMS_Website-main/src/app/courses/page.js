// Server component: fetches the course list on the server (ISR) and hands it to
// the interactive client island. Static SEO metadata for this route already
// lives in ./layout.js. The previous version was a "use client" page that
// fetched in useEffect, so crawlers saw an empty shell — this restores real
// server-rendered content.
import CoursesClient from "./CoursesClient";
import { getCoursesServer } from "@/lib/serverCourses";

export const revalidate = 300; // ISR (seconds)

export default async function CoursesPage() {
  const initialCourses = await getCoursesServer();
  return <CoursesClient initialCourses={initialCourses} />;
}
