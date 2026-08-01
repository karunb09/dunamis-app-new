"use client";

import { useCallback, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { FaWhatsapp } from "react-icons/fa";

export default function WhatsAppButton() {
  const pathname = usePathname() || "/";
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const offsetRef = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);
  const hasMoved = useRef(false);
  const origin = useRef({ mx: 0, my: 0, ox: 0, oy: 0 });

  const onPointerDown = useCallback((e) => {
    dragging.current = true;
    hasMoved.current = false;
    origin.current = {
      mx: e.clientX,
      my: e.clientY,
      ox: offsetRef.current.x,
      oy: offsetRef.current.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e) => {
    if (!dragging.current) return;
    const dx = e.clientX - origin.current.mx;
    const dy = e.clientY - origin.current.my;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMoved.current = true;
    const next = { x: origin.current.ox + dx, y: origin.current.oy + dy };
    offsetRef.current = next;
    setOffset(next);
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const onClick = useCallback((e) => {
    if (hasMoved.current) e.preventDefault();
  }, []);

  // Keep the floating bubble out of the authenticated student portal / auth screens.
  if (
    pathname.startsWith("/student") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup")
  ) {
    return null;
  }

  return (
    <a
      href="https://wa.me/+919398246083"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={onClick}
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      className="fixed bottom-24 right-4 z-50 flex h-16 w-16 cursor-grab touch-none select-none items-center justify-center rounded-3xl bg-gradient-to-br from-green-400 to-green-600 text-white shadow-[0_18px_30px_-10px_rgba(22,163,74,0.85)] ring-4 ring-white/80 active:cursor-grabbing hover:shadow-[0_24px_38px_-12px_rgba(22,163,74,0.9)]"
    >
      <FaWhatsapp className="h-8 w-8 drop-shadow" />
    </a>
  );
}
