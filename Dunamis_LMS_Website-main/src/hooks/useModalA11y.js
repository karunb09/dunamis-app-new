"use client";
import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Wires standard dialog behaviour onto an already-open modal panel:
 * Escape to close, a Tab focus trap scoped to the panel, initial focus on
 * open, and focus restored to whatever triggered the modal on close.
 * The panel itself still needs role="dialog" and aria-modal="true".
 */
export function useModalA11y(isOpen, onClose, containerRef) {
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    previouslyFocused.current = document.activeElement;

    const container = containerRef.current;
    const focusFirst = () => {
      const focusables = container?.querySelectorAll(FOCUSABLE_SELECTOR);
      (focusables && focusables[0] ? focusables[0] : container)?.focus();
    };
    const raf = requestAnimationFrame(focusFirst);

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !container) return;

      const focusables = Array.from(
        container.querySelectorAll(FOCUSABLE_SELECTOR)
      ).filter((el) => el.offsetParent !== null);
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", handleKeyDown, true);
      if (previouslyFocused.current?.focus) {
        previouslyFocused.current.focus();
      }
    };
  }, [isOpen, onClose, containerRef]);
}
