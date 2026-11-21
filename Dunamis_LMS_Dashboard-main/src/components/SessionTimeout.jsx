import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { extendSession, logout, logoutUser } from "../redux/authSlice";
import { markSessionEnded, syncSessionExpiry } from "../utils/authSession";

const WARN_MS = 15 * 1000;

// Warns 15 seconds before the session ends and lets the user stay or leave.
// With no answer, or once the session is already over (a laptop woken from
// sleep, or a sign-out in another tab), it signs them out and returns them to
// the sign-in page, which sends them back to the same screen afterwards.
const SessionTimeout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const signedIn = useSelector((state) => Boolean(state.auth?.token));
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [extending, setExtending] = useState(false);
  const ending = useRef(false);
  const sawSession = useRef(false);
  const stayButton = useRef(null);
  const locationRef = useRef(location);
  locationRef.current = location;
  const open = secondsLeft !== null;

  const endSession = useCallback(() => {
    if (ending.current) return;
    ending.current = true;
    setSecondsLeft(null);
    markSessionEnded();
    dispatch(logout());
    navigate("/", { replace: true, state: { from: locationRef.current } });
  }, [dispatch, navigate]);

  useEffect(() => {
    if (!signedIn) {
      setSecondsLeft(null);
      sawSession.current = false;
      ending.current = false;
      return undefined;
    }

    const check = () => {
      const expiry = syncSessionExpiry();
      if (!expiry) {
        if (sawSession.current) endSession();
        return;
      }
      sawSession.current = true;
      const left = expiry - Date.now();
      if (left <= 0) {
        endSession();
        return;
      }
      setSecondsLeft(left <= WARN_MS ? Math.ceil(left / 1000) : null);
    };

    check();
    const timer = setInterval(check, 1000);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, [endSession, signedIn]);

  useEffect(() => {
    if (open) stayButton.current?.focus();
  }, [open]);

  const stay = async () => {
    setExtending(true);
    const result = await dispatch(extendSession());
    setExtending(false);
    if (extendSession.rejected.match(result)) {
      endSession();
      return;
    }
    setSecondsLeft(null);
  };

  const signOut = () => {
    ending.current = true;
    setSecondsLeft(null);
    dispatch(logoutUser()).finally(() => navigate("/", { replace: true }));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 p-4 backdrop-blur-sm motion-safe:animate-fade-in sm:items-center">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="session-timeout-title"
        aria-describedby="session-timeout-text"
        className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-xl motion-safe:animate-modal-in"
      >
        <div
          aria-hidden="true"
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-2xl font-bold tabular-nums text-orange-700 ring-4 ring-orange-100"
        >
          {secondsLeft}
        </div>
        <h2 id="session-timeout-title" className="mt-4 text-xl font-bold text-slate-900">
          Are you still there?
        </h2>
        <p id="session-timeout-text" className="mt-2 text-sm leading-6 text-slate-600">
          For your security, you&apos;ll be signed out in{" "}
          <strong className="tabular-nums text-slate-900">{secondsLeft}</strong>{" "}
          {secondsLeft === 1 ? "second" : "seconds"}.
        </p>
        <div className="mt-6 space-y-2">
          <button
            ref={stayButton}
            type="button"
            onClick={stay}
            disabled={extending}
            className="min-h-12 w-full rounded-2xl bg-[#FF6B35] text-sm font-semibold text-white transition hover:bg-[#fd5a1f] focus:outline-none focus:ring-2 focus:ring-orange-200 active:scale-[0.97] disabled:opacity-70"
          >
            {extending ? "One moment…" : "Stay signed in"}
          </button>
          <button
            type="button"
            onClick={signOut}
            disabled={extending}
            className="min-h-12 w-full rounded-2xl text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionTimeout;
