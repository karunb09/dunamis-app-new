"use client";

import { HiArrowLeft, HiX } from "react-icons/hi";

// Full-screen sheet on phones, centred dialog from `sm` up. Header, scrolling
// body and footer are separate rows of one flex column, so the footer (the
// main button) never scrolls away and never covers the inputs.
export default function DemoSheet({
  panelRef,
  bodyRef,
  labelledBy,
  title,
  subtitle,
  onBack,
  backLabel = "Back",
  onClose,
  aside,
  footer,
  children,
}) {
  return (
    // Above the floating WhatsApp and chat launchers (z-50/51/55), which would
    // otherwise sit over the time grid and the main button on phones.
    <div className="enter-fade fixed inset-0 z-[60] flex bg-black/60 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={`enter-up flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl outline-none sm:h-auto sm:max-h-[min(92dvh,860px)] sm:rounded-3xl ${
          aside ? "sm:max-w-xl lg:max-w-5xl lg:flex-row" : "sm:max-w-xl"
        }`}
      >
        {aside ? (
          <aside className="relative hidden w-[38%] shrink-0 overflow-hidden bg-[#09090f] p-8 text-white lg:block">
            <div aria-hidden="true" className="absolute inset-0 opacity-30">
              <div className="absolute -left-10 top-0 h-44 w-44 rounded-full bg-[#FF6B35] blur-3xl" />
              <div className="absolute bottom-0 right-0 h-52 w-52 rounded-full bg-[#47c9c4] blur-3xl" />
            </div>
            <div className="relative">{aside}</div>
          </aside>
        ) : null}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="flex min-h-14 shrink-0 items-center gap-2 border-b border-slate-100 px-2 py-2 sm:px-4">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                aria-label={backLabel}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100"
              >
                <HiArrowLeft className="text-xl" />
              </button>
            ) : (
              <span className="w-2 shrink-0 sm:w-0" />
            )}
            <div className="min-w-0 flex-1">
              <h2 id={labelledBy} className="truncate text-base font-bold text-slate-900 sm:text-lg">
                {title}
              </h2>
              {subtitle ? (
                <p className="truncate text-[13px] font-medium text-slate-600">{subtitle}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <HiX className="text-xl" />
            </button>
          </header>

          <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
            {children}
          </div>

          {footer ? (
            <footer className="shrink-0 border-t border-slate-100 bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
              {footer}
            </footer>
          ) : null}
        </div>
      </div>
    </div>
  );
}
