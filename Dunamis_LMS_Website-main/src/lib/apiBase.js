// Authenticated calls go through the same-origin BFF proxy so the JWT (held in
// an httpOnly cookie) is injected server-side and never touches JavaScript.
// Public reads (courses, centres, mentors, categories) keep using
// NEXT_PUBLIC_BASE_URL directly.
export const API_BASE = "/api/backend";

// Auth lifecycle endpoints (set/clear the httpOnly cookie server-side).
export const AUTH_BASE = "/api/auth";
