// Server-side course data access for the public marketing pages.
//
// These run on the server (in server components / generateMetadata) and use
// Next.js fetch caching with ISR (revalidate) so the public pages are
// statically served and refreshed in the background — giving real HTML content
// to crawlers and a fast first paint, instead of the previous client-only fetch.

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

// Revalidate window (seconds) for ISR. Tune as course data changes.
export const COURSES_REVALIDATE = 300;

const slugify = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");

// Bound how long a server fetch can block (e.g. during build/ISR) so an
// unreachable backend degrades to empty data instead of hanging.
const FETCH_TIMEOUT_MS = 6000;

export async function getCoursesServer() {
  if (!BASE_URL) return [];
  try {
    const res = await fetch(`${BASE_URL}/v1/course/get`, {
      next: { revalidate: COURSES_REVALIDATE },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (res.status === 404) return [];
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.data) ? data.data : [];
  } catch {
    return [];
  }
}

// Resolve a course by either its _id or a slugified name (the route param can be
// either, matching the client's existing lookup logic), then fetch the full
// record for complete detail.
export async function getCourseServer(idOrSlug) {
  if (!BASE_URL || !idOrSlug) return null;
  const decoded = decodeURIComponent(idOrSlug);

  const courses = await getCoursesServer();
  let found = courses.find((c) => c._id === decoded);
  if (!found) {
    const slug = slugify(decoded);
    found = courses.find((c) => slugify(c.name) === slug);
  }
  if (!found) return null;

  try {
    const res = await fetch(`${BASE_URL}/v1/course/get/${found._id}`, {
      next: { revalidate: COURSES_REVALIDATE },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (res.ok) {
      const data = await res.json();
      return data?.data || found;
    }
  } catch {
    // fall through to the list record
  }
  return found;
}
