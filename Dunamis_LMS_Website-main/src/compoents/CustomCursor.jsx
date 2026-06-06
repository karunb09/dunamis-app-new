"use client";

import { useEffect, useRef } from "react";

export default function CustomCursor() {
  const dotWrapRef = useRef(null);
  const ringWrapRef = useRef(null);
  const ringInnerRef = useRef(null);

  const pos = useRef({ x: -300, y: -300 });
  const ringPos = useRef({ x: -300, y: -300 });
  const hovering = useRef(false);
  const rafId = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Only activate on fine-pointer (mouse) devices — skip touch screens
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const INTERACTIVE =
      "a, button, [role='button'], label, select, summary, .cursor-pointer, [tabindex]:not([tabindex='-1'])";

    const onMove = (e) => {
      pos.current = { x: e.clientX, y: e.clientY };
    };

    const onOver = (e) => {
      hovering.current = !!e.target.closest(INTERACTIVE);
    };

    const onLeave = () => {
      pos.current = { x: -300, y: -300 };
    };

    const animate = () => {
      const { x, y } = pos.current;

      if (dotWrapRef.current) {
        dotWrapRef.current.style.transform = `translate(${x}px, ${y}px)`;
      }

      // Lerp ring toward cursor for smooth trailing effect
      ringPos.current.x += (x - ringPos.current.x) * 0.13;
      ringPos.current.y += (y - ringPos.current.y) * 0.13;

      if (ringWrapRef.current) {
        ringWrapRef.current.style.transform = `translate(${ringPos.current.x}px, ${ringPos.current.y}px)`;
      }

      if (ringInnerRef.current) {
        if (hovering.current) {
          ringInnerRef.current.style.width = "52px";
          ringInnerRef.current.style.height = "52px";
          ringInnerRef.current.style.borderColor = "#FF6B35";
          ringInnerRef.current.style.borderWidth = "2px";
          ringInnerRef.current.style.background = "rgba(255,107,53,0.1)";
        } else {
          ringInnerRef.current.style.width = "34px";
          ringInnerRef.current.style.height = "34px";
          ringInnerRef.current.style.borderColor = "rgba(239,106,50,0.4)";
          ringInnerRef.current.style.borderWidth = "1.5px";
          ringInnerRef.current.style.background = "transparent";
        }
      }

      rafId.current = requestAnimationFrame(animate);
    };

    document.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseover", onOver, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    rafId.current = requestAnimationFrame(animate);

    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(rafId.current);
    };
  }, []);

  return (
    <>
      {/* Music note + precise click dot */}
      <div
        ref={dotWrapRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          pointerEvents: "none",
          zIndex: 99999,
          willChange: "transform",
        }}
      >
        {/* Orange dot at exact cursor hotspot */}
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
        {/* Music note — hotspot at SVG (5,31) aligned to cursor origin */}
        <div style={{ position: "absolute", top: 0, left: 0, transform: "translate(-5px, -31px)", filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.5))" }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34">
            <ellipse cx="9.5" cy="27.5" rx="8.5" ry="6" transform="rotate(-18 9.5 27.5)" fill="white" opacity="0.8" />
            <line x1="16" y1="24" x2="16" y2="5" stroke="white" strokeWidth="6" strokeLinecap="round" opacity="0.8" />
            <path d="M16 5 C27 1 30 12 20 19" fill="white" opacity="0.8" />
            <ellipse cx="9.5" cy="27.5" rx="6.5" ry="4.5" transform="rotate(-18 9.5 27.5)" fill="#FF6B35" />
            <line x1="16" y1="24" x2="16" y2="5" stroke="#FF6B35" strokeWidth="3.2" strokeLinecap="round" />
            <path d="M16 5 C27 1 30 12 20 19" fill="#FF6B35" />
          </svg>
        </div>
      </div>

      {/* Hover ring — trails behind cursor, expands on interactive elements */}
      <div
        ref={ringWrapRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          pointerEvents: "none",
          zIndex: 99998,
          willChange: "transform",
        }}
      >
        <div
          ref={ringInnerRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            transform: "translate(-50%, -50%)",
            width: "34px",
            height: "34px",
            borderRadius: "50%",
            border: "1.5px solid rgba(239,106,50,0.4)",
            background: "transparent",
            transition:
              "width 0.18s ease, height 0.18s ease, border-color 0.18s ease, border-width 0.18s ease, background 0.18s ease",
          }}
        />
      </div>
    </>
  );
}
