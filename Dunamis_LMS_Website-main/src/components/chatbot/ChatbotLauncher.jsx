"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { LuMessageCircle, LuX } from "react-icons/lu";
import { FaWhatsapp } from "react-icons/fa";
import toast from "react-hot-toast";
import api from "@/lib/axios";
import { WHATSAPP_URL } from "@/lib/siteConfig";
import { useChatbot } from "./useChatbot";

const ChatbotPanel = dynamic(() => import("./ChatbotPanel"), { ssr: false });
const BookDemoModal = dynamic(() => import("@/components/PopupModals/BookDemoModal"), { ssr: false });
const CallbackRequestModal = dynamic(() => import("@/components/PopupModals/CallbackRequestModal"), {
  ssr: false,
});

const launcherClass =
  "fixed right-4 h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-[#ff8a5c] to-[#FF6B35] text-white shadow-[0_18px_30px_-10px_rgba(255,107,53,0.85)] ring-4 ring-white/80 transition hover:shadow-[0_24px_38px_-12px_rgba(255,107,53,0.9)] active:scale-[0.97]";

const ActiveDot = () => (
  <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#FF6B35]" />
);

export default function ChatbotLauncher() {
  const pathname = usePathname() || "/";
  const chat = useChatbot(pathname);
  const [open, setOpen] = useState(false);
  const [dialOpen, setDialOpen] = useState(false);
  const [busyAction, setBusyAction] = useState(null);
  const [modal, setModal] = useState(null);
  const courseCache = useRef(new Map());

  const inPortal = pathname.startsWith("/student");

  useEffect(() => {
    setDialOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!dialOpen) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setDialOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [dialOpen]);

  const openChat = useCallback(() => {
    setDialOpen(false);
    setOpen(true);
  }, []);
  const minimize = useCallback(() => setOpen(false), []);

  // Phones get one button. With a chat in progress (or in the portal, where
  // there is no WhatsApp bubble) it reopens the chat in one tap; otherwise it
  // offers the choice between chat and WhatsApp.
  const onMobileTap = () => {
    if (chat.active || inPortal) openChat();
    else setDialOpen((current) => !current);
  };

  const loadCourse = useCallback(async (courseId) => {
    if (!courseCache.current.has(courseId)) {
      const { data } = await api.get(`/v1/course/get/${courseId}`);
      courseCache.current.set(courseId, data.data);
    }
    return courseCache.current.get(courseId);
  }, []);

  const runAction = useCallback(
    async (action) => {
      setBusyAction(`${action.type}:${action.courseId}`);
      try {
        const course = await loadCourse(action.courseId);
        setModal({ type: action.type, course, instructorId: action.instructorId || "" });
      } catch {
        toast.error("Couldn't open that just now. Please try again.");
      } finally {
        setBusyAction(null);
      }
    },
    [loadCourse]
  );

  const closeModal = useCallback(() => setModal(null), []);

  if (pathname.startsWith("/login") || pathname.startsWith("/signup")) {
    return null;
  }

  return (
    <>
      <AnimatePresence>
        {open ? (
          <motion.div
            key="chatbot-panel"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[55] origin-bottom-right sm:inset-auto sm:bottom-6 sm:right-4"
          >
            <ChatbotPanel chat={chat} onMinimize={minimize} onAction={runAction} busyAction={busyAction} />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {!open ? (
        <>
          <button
            type="button"
            onClick={openChat}
            aria-label="Chat with the Dunamis assistant"
            className={`pop-in z-50 hidden md:flex ${inPortal ? "bottom-6" : "bottom-44"} ${launcherClass}`}
          >
            <LuMessageCircle className="h-7 w-7 drop-shadow" />
            {chat.active ? <ActiveDot /> : null}
          </button>

          <AnimatePresence>
            {dialOpen ? (
              <motion.div
                key="chatbot-dial"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-50 md:hidden"
                onClick={() => setDialOpen(false)}
              >
                <div className="absolute bottom-[10.5rem] right-4 flex flex-col items-end gap-2.5">
                  {[
                    {
                      key: "chat",
                      label: "Chat with us",
                      icon: <LuMessageCircle className="h-4 w-4" />,
                      className: "bg-[#FF6B35] text-white",
                      onClick: openChat,
                    },
                    {
                      key: "whatsapp",
                      label: "WhatsApp us",
                      icon: <FaWhatsapp className="h-4 w-4" />,
                      className: "bg-green-500 text-white",
                      href: WHATSAPP_URL,
                    },
                  ].map((item, index) => {
                    const content = (
                      <>
                        {item.icon}
                        {item.label}
                      </>
                    );
                    const pillClass = `flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold shadow-lg ring-4 ring-white/80 active:scale-[0.97] ${item.className}`;
                    return (
                      <motion.div
                        key={item.key}
                        initial={{ opacity: 0, y: 12, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 12, scale: 0.95 }}
                        transition={{ duration: 0.2, delay: (1 - index) * 0.04, ease: [0.16, 1, 0.3, 1] }}
                        onClick={(event) => event.stopPropagation()}
                      >
                        {item.href ? (
                          <a
                            href={item.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setDialOpen(false)}
                            className={pillClass}
                          >
                            {content}
                          </a>
                        ) : (
                          <button type="button" onClick={item.onClick} className={pillClass}>
                            {content}
                          </button>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <button
            type="button"
            onClick={onMobileTap}
            aria-label={
              chat.active || inPortal
                ? "Chat with the Dunamis assistant"
                : dialOpen
                  ? "Close contact options"
                  : "Contact options"
            }
            aria-expanded={chat.active || inPortal ? undefined : dialOpen}
            className={`pop-in bottom-24 z-[51] flex md:hidden ${launcherClass}`}
          >
            {dialOpen ? <LuX className="h-6 w-6" /> : <LuMessageCircle className="h-7 w-7 drop-shadow" />}
            {chat.active ? <ActiveDot /> : null}
          </button>
        </>
      ) : null}

      {/* Rendered outside the animated panel: a transformed ancestor would
          become the containing block for these fixed-position modals. */}
      {modal?.type === "bookDemo" ? (
        <BookDemoModal
          isOpen
          onClose={closeModal}
          course={modal.course}
          preferredInstructorId={modal.instructorId}
          onSuccess={() => chat.endChat("completed", "demo")}
        />
      ) : null}
      {modal?.type === "callback" ? (
        <CallbackRequestModal
          isOpen
          onClose={closeModal}
          course={modal.course}
          onSuccess={() => chat.endChat("completed", "callback")}
        />
      ) : null}
    </>
  );
}
