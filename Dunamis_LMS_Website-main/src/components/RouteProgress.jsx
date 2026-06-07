"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const isModifiedEvent = (event) =>
  event.metaKey ||
  event.ctrlKey ||
  event.shiftKey ||
  event.altKey ||
  event.button !== 0;

export default function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);
  const currentUrlRef = useRef("");
  const startedRef = useRef(false);

  useEffect(() => {
    currentUrlRef.current = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`;
  }, [pathname, searchParams]);

  useEffect(() => {
    const stopTimers = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    const startProgress = () => {
      stopTimers();
      startedRef.current = true;
      setVisible(true);
      setProgress(12);

      intervalRef.current = setInterval(() => {
        setProgress((value) => {
          if (value >= 78) {
            return value;
          }

          return value + Math.max(4, (82 - value) * 0.12);
        });
      }, 180);
    };

    const finishProgress = () => {
      if (!startedRef.current) {
        return;
      }

      stopTimers();
      setVisible(true);
      setProgress(100);

      timeoutRef.current = setTimeout(() => {
        startedRef.current = false;
        setVisible(false);
        setProgress(0);
      }, 220);
    };

    const handleClick = (event) => {
      if (isModifiedEvent(event)) {
        return;
      }

      const anchor = event.target.closest("a[href]");
      if (!anchor) {
        return;
      }

      if (anchor.target === "_blank" || anchor.hasAttribute("download")) {
        return;
      }

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }

      const url = new URL(anchor.href, window.location.href);

      if (url.origin !== window.location.origin) {
        return;
      }

      const nextUrl = `${url.pathname}${url.search}`;
      if (nextUrl === currentUrlRef.current) {
        return;
      }

      startProgress();
    };

    document.addEventListener("click", handleClick);
    finishProgress();

    return () => {
      document.removeEventListener("click", handleClick);
      stopTimers();
    };
  }, [pathname, searchParams]);

  return (
    <div
      className={`pointer-events-none fixed left-0 right-0 top-0 z-[70] origin-left transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      aria-hidden="true"
    >
      <div
        className="h-1 bg-gradient-to-r from-[#ef6a32] via-[#ffb26f] to-[#47c9c4] shadow-[0_8px_24px_-8px_rgba(239,106,50,0.65)] transition-[width] duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
