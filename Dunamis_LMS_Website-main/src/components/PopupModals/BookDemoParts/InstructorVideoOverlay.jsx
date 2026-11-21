"use client";

import { useEffect } from "react";
import { HiX } from "react-icons/hi";

export default function InstructorVideoOverlay({ video, onClose }) {
  // Window capture runs before the demo sheet's document-level Escape handler,
  // so Escape closes only the video.
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [onClose]);

  return (
    <div
      className="enter-fade fixed inset-0 z-[70] flex items-center justify-center bg-black sm:bg-black/75 sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={video.title}
        className="relative w-full overflow-hidden bg-black sm:max-w-3xl sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          autoFocus
          aria-label="Close video"
          className="absolute right-2 top-2 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black"
        >
          <HiX className="text-2xl" />
        </button>
        <video
          key={video.url}
          src={video.url}
          controls
          autoPlay
          playsInline
          preload="metadata"
          className="aspect-video w-full bg-black"
        >
          This video can&apos;t play in your browser.
        </video>
        <p className="px-4 py-3 text-[15px] font-semibold text-white">{video.title}</p>
      </div>
    </div>
  );
}
