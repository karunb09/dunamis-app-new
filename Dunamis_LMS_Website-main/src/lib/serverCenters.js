// Server-side offline-centre (branch) data access for the public centres pages.
// Same ISR + timeout approach as serverCourses.js so /centers and
// /centers/[slug] are server-rendered with real content + per-centre metadata.

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

export const CENTERS_REVALIDATE = 300;
const FETCH_TIMEOUT_MS = 6000;

// Must match the client's slug derivation (branchName -> slug).
export const slugifyBranch = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "");

export async function getCentersServer() {
  if (!BASE_URL) return [];
  try {
    const res = await fetch(`${BASE_URL}/v1/branch/get-all-branch`, {
      next: { revalidate: CENTERS_REVALIDATE },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (res.status === 404) return [];
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.branches) ? data.branches : [];
  } catch {
    return [];
  }
}

export function findCenterBySlug(centers, slug) {
  if (!Array.isArray(centers) || !slug) return null;
  const target = decodeURIComponent(slug);
  return centers.find((c) => slugifyBranch(c.branchName) === target) || null;
}
