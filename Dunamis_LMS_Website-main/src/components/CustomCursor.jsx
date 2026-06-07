"use client";

import { useEffect, useRef } from "react";

export default function CustomCursor() {
  const wrapRef = useRef(null);
  const pos = useRef({ x: -300, y: -300 });
  const rafId = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const onMove = (e) => {
      pos.current = { x: e.clientX, y: e.clientY };
    };
    const onLeave = () => {
      pos.current = { x: -300, y: -300 };
    };

    const animate = () => {
      const { x, y } = pos.current;
      if (wrapRef.current) {
        wrapRef.current.style.transform = `translate(${x}px, ${y}px)`;
      }
      rafId.current = requestAnimationFrame(animate);
    };

    document.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    rafId.current = requestAnimationFrame(animate);

    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(rafId.current);
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        pointerEvents: "none",
        zIndex: 99999,
        willChange: "transform",
      }}
    >
      {/* Small dot at exact click hotspot */}
      <div
        style={{
          position: "absolute",
          top: "-2.5px",
          left: "-2.5px",
          width: "5px",
          height: "5px",
          borderRadius: "50%",
          background: "#FF6B35",
          boxShadow: "0 0 6px 2px rgba(255,107,53,0.5)",
        }}
      />
      {/* Music note */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          transform: "translate(-10px, -28px)",
          fontSize: "28px",
          lineHeight: 1,
          color: "#FF6B35",
          textShadow: "0 0 6px rgba(255,107,53,0.5), 0 1px 4px rgba(0,0,0,0.6)",
        }}
      >
        ♫
      </div>
    </div>
  );
}
