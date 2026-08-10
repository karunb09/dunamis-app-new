// helpers/session.js
export const SESSION_KEY = "enrollSelection";
export const TERM_KEY = "enrollTerm";

// Merge fields into the selection for the course being enrolled in.
// Only one course is held at a time: switching course starts a clean object,
// because a blind merge left the previous course's deliveryMode, branch,
// instructor, slot and referral code behind for the next one to pick up.
export function upsertEnrollSelection(patch) {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    const prev = raw ? JSON.parse(raw) : {};
    const switchingCourse =
      patch.courseId &&
      prev.courseId &&
      String(patch.courseId) !== String(prev.courseId);

    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        ...(switchingCourse ? {} : prev),
        ...patch,
        timestamp: Date.now(),
      })
    );
  } catch (e) {}
}

// Legacy direct set/get/clear (kept for compatibility)
export function saveEnrollSelection(sel) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(sel));
  } catch (e) {}
}

export function readEnrollSelection() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function clearEnrollSelection() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch (e) {}
}

// Normalized reader that prefers id/label. Pass expectedCourseId to get null
// rather than another course's leftovers.
export function getCurrentSelection(expectedCourseId = null) {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    const sel = raw ? JSON.parse(raw) : null;
    if (!sel) return null;
    if (
      expectedCourseId &&
      String(sel.courseId || "") !== String(expectedCourseId)
    ) {
      return null;
    }
    return {
      ...sel,
      branchId: sel.branchId ?? null,
      branchLabel: sel.branchLabel ?? sel.branch ?? null,
      branch: sel.branchLabel ?? sel.branch ?? null,
      instructorId: sel.instructorId ?? null,
      instructorLabel: sel.instructorLabel ?? sel.instructor ?? null, // backward-compatible
    };
  } catch (e) {
    return null;
  }
}

// Separate term storage (if you want to keep a split model)
export function saveEnrollTerm(term) {
  try {
    sessionStorage.setItem(TERM_KEY, JSON.stringify(term));
  } catch (e) {}
}

export function readEnrollTerm() {
  try {
    const raw = sessionStorage.getItem(TERM_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function clearEnrollTerm() {
  try {
    sessionStorage.removeItem(TERM_KEY);
  } catch (e) {}
}
