import { useEffect, useRef, useState } from "react";

const prefersReducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

const AnimatedNumber = ({ value, format = (v) => v, duration = 900 }) => {
  const animate = typeof value === "number" && Number.isFinite(value) && !prefersReducedMotion();
  const [display, setDisplay] = useState(0);
  const displayRef = useRef(0);

  useEffect(() => {
    if (!animate) return undefined;

    // Start from whatever is on screen so a mid-count data refresh doesn't jump back to 0.
    const from = displayRef.current;
    const decimals = Math.min(2, (String(value).split(".")[1] || "").length);
    const start = performance.now();
    let frame;

    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      const next =
        progress === 1 ? value : Number((from + (value - from) * eased).toFixed(decimals));
      displayRef.current = next;
      setDisplay(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [animate, value, duration]);

  return format(animate ? display : value);
};

export default AnimatedNumber;
