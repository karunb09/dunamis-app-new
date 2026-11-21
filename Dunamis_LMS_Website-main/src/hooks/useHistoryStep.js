"use client";
import { useEffect, useRef } from "react";

// Lets the phone's back button step back through a modal flow instead of
// leaving the page.
//
// `depth` is how many history entries this component should own right now
// (0 = closed, 1 = open, 2 = on its second screen). `base` is how many entries
// a parent flow already owns underneath it, so nested flows (the hero course
// picker with the demo modal on top) share one numbered stack under `key`.
// `onBack` runs when the visitor presses back past one of our entries and
// must lower `depth` by one.
//
// Next's app router patches pushState to carry its own state along, so these
// entries never trigger a router reload when popped.
const pendingUnwind = new Map();

// Several flows may close in the same commit; unwind once, to the lowest goal.
const scheduleUnwind = (key, goal) => {
  const queued = pendingUnwind.has(key);
  pendingUnwind.set(key, Math.min(pendingUnwind.get(key) ?? Infinity, goal));
  if (queued) return;
  queueMicrotask(() => {
    const target = pendingUnwind.get(key);
    pendingUnwind.delete(key);
    const top = Number(window.history.state?.[key]) || 0;
    if (top > target) window.history.go(target - top);
  });
};

export function useHistoryStep(depth, onBack, { base = 0, key = "demoFlow" } = {}) {
  const pushed = useRef(0);
  const baseRef = useRef(base);
  const onBackRef = useRef(onBack);
  baseRef.current = base;
  onBackRef.current = onBack;

  useEffect(() => {
    const handlePop = (event) => {
      const landed = Number(event.state?.[key]) || 0;
      const mine = Math.max(0, Math.min(pushed.current, landed - baseRef.current));
      if (mine >= pushed.current) return;
      pushed.current = mine;
      onBackRef.current?.();
    };
    window.addEventListener("popstate", handlePop);
    return () => {
      window.removeEventListener("popstate", handlePop);
      if (pushed.current > 0) {
        pushed.current = 0;
        scheduleUnwind(key, baseRef.current);
      }
    };
  }, [key]);

  useEffect(() => {
    while (pushed.current < depth) {
      pushed.current += 1;
      window.history.pushState({ [key]: base + pushed.current }, "");
    }
    if (pushed.current > depth) {
      pushed.current = depth;
      scheduleUnwind(key, base + depth);
    }
  }, [base, depth, key]);
}
