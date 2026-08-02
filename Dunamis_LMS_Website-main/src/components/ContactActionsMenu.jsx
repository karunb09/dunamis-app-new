"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LuEllipsisVertical, LuPhone, LuPhoneCall } from "react-icons/lu";

const PHONE_NUMBER = "+919398246083";

export default function ContactActionsMenu({ onRequestCallback, className = "" }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div ref={menuRef} className={`relative shrink-0 ${className}`}>
      <motion.button
        type="button"
        whileTap={{ scale: 0.96 }}
        onClick={() => setOpen((prev) => !prev)}
        aria-label="More contact options"
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex h-full w-11 items-center justify-center rounded-xl border-2 transition ${
          open
            ? "border-[#CC3700] bg-orange-50 text-[#CC3700]"
            : "border-gray-200 text-gray-700 hover:bg-gray-50"
        }`}
      >
        <LuEllipsisVertical className="h-5 w-5" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-30 mt-2 w-52 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg"
          >
            <a
              href={`tel:${PHONE_NUMBER}`}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              <LuPhone className="h-4 w-4 shrink-0 text-[#CC3700]" />
              Call Us
            </a>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onRequestCallback?.();
              }}
              className="flex w-full items-center gap-2.5 border-t border-gray-100 px-4 py-3 text-left text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              <LuPhoneCall className="h-4 w-4 shrink-0 text-[#CC3700]" />
              Request a Callback
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
