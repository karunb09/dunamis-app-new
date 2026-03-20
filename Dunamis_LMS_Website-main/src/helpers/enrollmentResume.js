"use client";

export const ENROLLMENT_RESUME_KEY = "enrollmentResume";

export function saveEnrollmentResume(target) {
  try {
    if (typeof window === "undefined") return;
    const payload =
      typeof target === "string"
        ? { nextHref: target, timestamp: Date.now() }
        : {
            ...(target || {}),
            nextHref: target?.nextHref || target?.href || "/payment-confirmation",
            timestamp: Date.now(),
          };
    window.sessionStorage.setItem(
      ENROLLMENT_RESUME_KEY,
      JSON.stringify(payload)
    );
  } catch (error) {}
}

export function readEnrollmentResume() {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.sessionStorage.getItem(ENROLLMENT_RESUME_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

export function clearEnrollmentResume() {
  try {
    if (typeof window === "undefined") return;
    window.sessionStorage.removeItem(ENROLLMENT_RESUME_KEY);
  } catch (error) {}
}

export function resolveEnrollmentResumeHref(fallback = "/payment-confirmation") {
  const resume = readEnrollmentResume();
  return resume?.nextHref || fallback;
}
