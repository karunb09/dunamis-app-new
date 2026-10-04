import { useCallback, useEffect, useState } from "react";
import { getCurrentFix } from "../../utils/geolocation";
import { distanceMeters } from "../../utils/checkInFormat";

// Mirrors services/checkInCore.js so the preview never promises a check-in the
// server will refuse.
const ACCURACY_ALLOWANCE_CAP_M = 100;

export const useNow = (intervalMs = 30000) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
};

export const fenceFor = (branch, fix) => {
  if (!branch?.geo || !fix) return null;
  const distanceM = distanceMeters(fix, branch.geo);
  return {
    distanceM,
    inside: distanceM - Math.min(fix.accuracyM, ACCURACY_ALLOWANCE_CAP_M) <= branch.radiusM,
  };
};

// The nearest branch the person is standing inside, if any.
export const nearestInsideId = (branches, fix) =>
  branches
    .map((branch) => ({ branch, fence: fenceFor(branch, fix) }))
    .filter(({ fence }) => fence?.inside)
    .sort((a, b) => a.fence.distanceM - b.fence.distanceM)[0]?.branch._id || null;

// The device's location: one reading on arrival (only once there is a branch to
// measure against, so someone with no centre is never asked), and a fresh one
// on demand via locate().
export const useLiveFix = (enabled) => {
  const [fix, setFix] = useState(null);
  const [fixError, setFixError] = useState("");
  const [locating, setLocating] = useState(false);

  const locate = useCallback(async () => {
    setLocating(true);
    try {
      const reading = await getCurrentFix();
      setFix(reading);
      setFixError("");
      return reading;
    } catch (err) {
      setFixError(err.message);
      throw err;
    } finally {
      setLocating(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    getCurrentFix()
      .then((reading) => {
        if (!cancelled) setFix(reading);
      })
      .catch((err) => {
        if (!cancelled) setFixError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { fix, fixError, locating, firstReading: enabled && !fix && !fixError, locate };
};
