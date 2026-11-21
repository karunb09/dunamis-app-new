"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { extendSession, logoutSession } from "@/store/authSlice";
import { getSessionExpiry } from "@/lib/authSession";

const WARN_MS = 15 * 1000;

// Warns a signed-in visitor 15 seconds before their session ends and lets them
// stay or leave. With no answer, or once the session is already over (a tab
// woken from sleep, or a sign-out in another tab), it signs them out and sends
// them to log in, returning them to the same page afterwards.
export default function SessionTimeout() {
  const dispatch = useDispatch();
  const router = useRouter();
  const signedIn = useSelector((state) => Boolean(state.auth?.token && state.auth?.user));
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [extending, setExtending] = useState(false);
  const ending = useRef(false);
  const sawExpiry = useRef(false);
  const stayButton = useRef(null);
  const open = secondsLeft !== null;

  const endSession = useCallback(async () => {
    if (ending.current) return;
    ending.current = true;
    setSecondsLeft(null);
    await dispatch(logoutSession());
    const here = `${window.location.pathname}${window.location.search}`;
    router.replace(`/login?portal=student&reason=expired&next=${encodeURIComponent(here)}`);
  }, [dispatch, router]);

  useEffect(() => {
    if (!signedIn) {
      setSecondsLeft(null);
      sawExpiry.current = false;
      ending.current = false;
      return undefined;
    }

    const check = () => {
      const expiry = getSessionExpiry();
      if (!expiry) {
        // The cookies went away under us: signed out in another tab.
        if (sawExpiry.current) endSession();
        return;
      }
      sawExpiry.current = true;
      const left = expiry - Date.now();
      if (left <= 0) {
        endSession();
        return;
      }
      // Another tab may have extended the session; the cookie is shared.
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

  const logOut = async () => {
    ending.current = true;
    setSecondsLeft(null);
    await dispatch(logoutSession());
    router.replace("/login?portal=student");
  };

  if (!open) return null;

  return (
    <div className="enter-fade fixed inset-0 z-[90] flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="session-timeout-title"
        aria-describedby="session-timeout-text"
        className="enter-up w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl"
      >
        <div
          aria-hidden="true"
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-2xl font-bold tabular-nums text-[#CC3700] ring-4 ring-orange-100"
        >
          {secondsLeft}
        </div>
        <h2 id="session-timeout-title" className="mt-4 text-xl font-bold text-slate-900">
          Are you still there?
        </h2>
        <p id="session-timeout-text" className="mt-2 text-[15px] leading-6 text-slate-700">
          For your security, you&apos;ll be signed out in{" "}
          <strong className="tabular-nums">{secondsLeft}</strong>{" "}
          {secondsLeft === 1 ? "second" : "seconds"}.
        </p>
        <div className="mt-6 space-y-2">
          <button
            ref={stayButton}
            type="button"
            onClick={stay}
            disabled={extending}
            className="min-h-12 w-full rounded-2xl bg-[#CC3700] text-base font-semibold text-white transition hover:bg-[#B83100] active:scale-[0.97] disabled:opacity-70"
          >
            {extending ? "One moment…" : "Stay signed in"}
          </button>
          <button
            type="button"
            onClick={logOut}
            disabled={extending}
            className="min-h-12 w-full rounded-2xl text-[15px] font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
