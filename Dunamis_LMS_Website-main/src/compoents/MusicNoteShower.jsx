"use client";
import { useEffect, useState } from "react";

const SYMBOLS = ["♩", "♪", "♫", "♬", "♭", "♮", "♯"];
const COUNT = 18;

function generateNotes() {
  return Array.from({ length: COUNT }, (_, i) => ({
    id: i,
    symbol: SYMBOLS[i % SYMBOLS.length],
    left: 4 + Math.random() * 92,
    duration: 16 + Math.random() * 14,
    delay: -(Math.random() * 16),
    size: 14 + Math.floor(Math.random() * 22),
    opacity: 0.25 + Math.random() * 0.3,
  }));
}

export default function MusicNoteShower() {
  const [notes] = useState(generateNotes);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setActive(mq.matches);
    const h = (e) => setActive(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  if (!active) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-10 overflow-hidden"
      aria-hidden="true"
    >
      {notes.map((n) => (
        <span
          key={n.id}
          className="absolute top-0 select-none pointer-events-none"
          style={{
            left: `${n.left}%`,
            fontSize: n.size,
            color: `rgba(255, 107, 53, ${n.opacity})`,
            textShadow: "0 1px 4px rgba(0,0,0,0.18)",
            animation: `shower-fall ${n.duration}s linear ${n.delay}s infinite`,
          }}
        >
          {n.symbol}
        </span>
      ))}
    </div>
  );
}
