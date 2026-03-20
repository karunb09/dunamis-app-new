// helpers/session.js
export const SESSION_KEY = "enrollSelection";
export const TERM_KEY = "enrollTerm";

// Merge fields into a single selection object without clobbering
export function upsertEnrollSelection(patch) {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    const prev = raw ? JSON.parse(raw) : {};

    // Guard against accidental overwrite of user-picked fields
    const guarded = {
      ...prev,
      ...(Object.prototype.hasOwnProperty.call(patch, "branch")
        ? { branch: patch.branch }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(patch, "branchId")
        ? { branchId: patch.branchId }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(patch, "branchLabel")
        ? { branchLabel: patch.branchLabel }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(patch, "instructorId")
        ? { instructorId: patch.instructorId }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(patch, "instructorLabel")
        ? { instructorLabel: patch.instructorLabel }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(patch, "slot")
        ? { slot: patch.slot }
        : {}),
      // Copy remaining keys from patch
      ...Object.keys(patch).reduce((acc, k) => {
        if (
          k === "branch" ||
          k === "instructorId" ||
          k === "instructorLabel" ||
          k === "slot"
        )
          return acc;
        acc[k] = patch[k];
        return acc;
      }, {}),
      timestamp: Date.now(),
    };

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(guarded));
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

// Optional: a normalized reader that prefers id/label
export function getCurrentSelection() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    const sel = raw ? JSON.parse(raw) : null;
    if (!sel) return null;
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
