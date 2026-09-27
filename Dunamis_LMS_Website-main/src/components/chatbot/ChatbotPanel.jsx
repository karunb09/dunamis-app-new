"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  LuArrowUpRight,
  LuBot,
  LuClock,
  LuEllipsisVertical,
  LuLogOut,
  LuMapPin,
  LuMaximize2,
  LuMinimize2,
  LuMinus,
  LuRotateCcw,
  LuSendHorizontal,
  LuStar,
  LuThumbsDown,
  LuThumbsUp,
} from "react-icons/lu";
import { FaWhatsapp } from "react-icons/fa";
import { resolveImageUrl } from "@/lib/resolveImageUrl";
import { WHATSAPP_URL } from "@/lib/siteConfig";

const MAX_LENGTH = 300;

const DOWN_REASONS = [
  { value: "wrong", label: "Wrong answer" },
  { value: "notUnderstood", label: "Didn't understand my question" },
  { value: "missingInfo", label: "Need more details" },
  { value: "other", label: "Other" },
];

const rupees = (amount) => `₹${Number(amount).toLocaleString("en-IN")}`;
const timeLabel = (value) =>
  new Date(value).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
const isInternal = (href) => href?.startsWith("/");

function ActionLink({ href, className, children, onNavigate }) {
  if (isInternal(href)) {
    return (
      <Link href={href} className={className} onClick={onNavigate}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}

function CourseCard({ course, onNavigate }) {
  return (
    <ActionLink
      href={course.href}
      onNavigate={onNavigate}
      className="group flex items-center justify-between gap-3 rounded-2xl border border-orange-100 bg-white px-3.5 py-3 transition hover:border-orange-300 hover:shadow-sm"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900">{course.name}</p>
        <p className="mt-0.5 truncate text-xs capitalize text-slate-500">
          {[course.category, course.mode, course.level].filter(Boolean).join(" · ")}
        </p>
        {course.fromMonthly ? (
          <p className="mt-1 text-xs font-medium text-[#CC3700]">From {rupees(course.fromMonthly)}/month</p>
        ) : null}
      </div>
      <LuArrowUpRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-[#FF6B35]" />
    </ActionLink>
  );
}

function BranchCard({ branch, onNavigate }) {
  return (
    <ActionLink
      href={branch.href}
      onNavigate={onNavigate}
      className="group block rounded-2xl border border-orange-100 bg-white px-3.5 py-3 transition hover:border-orange-300 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-slate-900">{branch.name}</p>
        <LuArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-[#FF6B35]" />
      </div>
      {branch.location || branch.city ? (
        <p className="mt-1 flex items-start gap-1.5 text-xs text-slate-500">
          <LuMapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {[branch.location, branch.city].filter(Boolean).join(", ")}
        </p>
      ) : null}
      {branch.days || branch.hours ? (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
          <LuClock className="h-3.5 w-3.5 shrink-0" />
          {[branch.days, branch.hours].filter(Boolean).join(", ")}
        </p>
      ) : null}
    </ActionLink>
  );
}

function InstructorCard({ instructor, onAction, onNavigate, disabled }) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const initials = instructor.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const photo = instructor.photo && !photoFailed ? resolveImageUrl(instructor.photo, "") : "";

  return (
    <div className="rounded-2xl border border-orange-100 bg-white px-3.5 py-3">
      <div className="flex items-center gap-3">
        {photo ? (
          <img
            src={photo}
            alt=""
            className="h-11 w-11 shrink-0 rounded-full object-cover"
            onError={() => setPhotoFailed(true)}
          />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FFD9C7] to-[#FFF1EB] text-sm font-semibold text-[#FF6B35]">
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-slate-900">
            {instructor.name}
            {instructor.rating ? (
              <span className="inline-flex items-center gap-0.5 text-xs font-medium text-amber-600">
                <LuStar className="h-3 w-3 fill-current" />
                {instructor.rating}
              </span>
            ) : null}
          </p>
          {instructor.expertise ? <p className="truncate text-xs text-slate-500">{instructor.expertise}</p> : null}
          <p className="truncate text-xs text-slate-500">
            {[
              instructor.experienceYears ? `${instructor.experienceYears} yrs experience` : "",
              instructor.languages?.join(", "),
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>
      {instructor.courseId ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              onAction({ type: "bookDemo", courseId: instructor.courseId, instructorId: instructor.id })
            }
            className="rounded-full bg-[#FF6B35] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#fd5a1f] active:scale-[0.97] disabled:opacity-50"
          >
            Book demo with {instructor.name.split(" ")[0]}
          </button>
          {instructor.href ? (
            <ActionLink
              href={instructor.href}
              onNavigate={onNavigate}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-orange-300 hover:text-[#CC3700]"
            >
              {instructor.courseName}
            </ActionLink>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Feedback({ message, chat }) {
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const feedback = message.feedback || {};

  if (feedback.sent && feedback.rating === "down") {
    return <p className="mt-1.5 text-xs text-slate-500">Thanks — this helps us improve.</p>;
  }

  return (
    <div className="mt-1.5">
      <div className="flex items-center gap-1 text-xs text-slate-400">
        <span className="mr-1">Helpful?</span>
        {[
          { rating: "up", Icon: LuThumbsUp, label: "Helpful", active: "bg-emerald-50 text-emerald-600" },
          { rating: "down", Icon: LuThumbsDown, label: "Not helpful", active: "bg-rose-50 text-rose-600" },
        ].map(({ rating, Icon, label, active }) => (
          <button
            key={rating}
            type="button"
            aria-label={label}
            aria-pressed={feedback.rating === rating}
            onClick={() => chat.rate(message, rating)}
            className={`rounded-full p-1.5 transition ${
              feedback.rating === rating ? active : "hover:bg-slate-100 hover:text-slate-600"
            }`}
          >
            <Icon className={`h-3.5 w-3.5 ${feedback.rating === rating ? "fill-current" : ""}`} />
          </button>
        ))}
        {feedback.error ? <span className="ml-1 text-rose-500">Couldn&apos;t save — try again.</span> : null}
      </div>

      {feedback.rating === "down" && !feedback.sent ? (
        <form
          className="enter-fade mt-2 rounded-2xl border border-slate-200 bg-white p-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (reason) chat.explainDown(message, reason, comment.trim());
          }}
        >
          <p className="text-xs font-medium text-slate-700">What went wrong?</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {DOWN_REASONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setReason(option.value)}
                className={`rounded-full border px-2.5 py-1 text-xs transition ${
                  reason === option.value
                    ? "border-orange-300 bg-orange-50 text-orange-700"
                    : "border-slate-200 text-slate-600 hover:border-orange-200"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value.slice(0, MAX_LENGTH))}
            rows={2}
            placeholder="Anything else? (optional)"
            className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          />
          <button
            type="submit"
            disabled={!reason || feedback.submitting}
            className="mt-2 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition disabled:opacity-40"
          >
            {feedback.submitting ? "Sending…" : "Send feedback"}
          </button>
        </form>
      ) : null}
    </div>
  );
}

function BotMessage({ message, isLatest, chat, onAction, onNavigate, busyAction }) {
  const reply = message.reply || {};
  const interactive = !chat.ended && !chat.sending;

  return (
    <div className="enter-up flex items-start gap-2">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#09090f] text-[#FF6B35]">
        <LuBot className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        {message.text ? (
          <div className="w-fit max-w-full whitespace-pre-line rounded-2xl rounded-tl-md border border-slate-100 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-slate-800 shadow-sm">
            {message.text}
          </div>
        ) : null}

        {reply.courses?.map((course) => (
          <CourseCard key={course.id} course={course} onNavigate={onNavigate} />
        ))}
        {reply.branches?.map((branch) => (
          <BranchCard key={branch.id} branch={branch} onNavigate={onNavigate} />
        ))}
        {reply.instructors?.map((instructor) => (
          <InstructorCard
            key={instructor.id}
            instructor={instructor}
            onAction={onAction}
            onNavigate={onNavigate}
            disabled={Boolean(busyAction)}
          />
        ))}

        {reply.actions?.length ? (
          <div className="flex flex-wrap gap-2">
            {reply.actions.map((action) =>
              action.type === "link" ? (
                <ActionLink
                  key={`${action.label}${action.href}`}
                  href={action.href}
                  onNavigate={onNavigate}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-orange-300 hover:text-[#CC3700]"
                >
                  {action.label}
                </ActionLink>
              ) : (
                <button
                  key={`${action.type}${action.courseId}`}
                  type="button"
                  disabled={Boolean(busyAction)}
                  onClick={() => onAction(action)}
                  className={
                    action.type === "bookDemo"
                      ? "rounded-full bg-[#FF6B35] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[#fd5a1f] active:scale-[0.97] disabled:opacity-50"
                      : "rounded-full border border-orange-200 bg-white px-3.5 py-1.5 text-xs font-medium text-[#CC3700] transition hover:bg-orange-50 disabled:opacity-50"
                  }
                >
                  {busyAction === `${action.type}:${action.courseId}` ? "Opening…" : action.label}
                </button>
              )
            )}
          </div>
        ) : null}

        {isLatest && interactive && reply.quickReplies?.length ? (
          <div className="stagger flex flex-wrap gap-1.5 pt-0.5">
            {reply.quickReplies.map((quickReply) => (
              <button
                key={`${quickReply.label}${JSON.stringify(quickReply.action)}`}
                type="button"
                onClick={() => chat.send({ action: quickReply.action, label: quickReply.label })}
                className="rounded-full border border-orange-200 bg-white px-3 py-1.5 text-xs font-medium text-orange-700 transition hover:border-orange-300 hover:bg-orange-50"
              >
                {quickReply.label}
              </button>
            ))}
          </div>
        ) : null}

        {message.turnId ? <Feedback message={message} chat={chat} /> : null}
      </div>
    </div>
  );
}

export default function ChatbotPanel({ chat, onMinimize, onAction, busyAction }) {
  const [draft, setDraft] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const menuRef = useRef(null);
  const large = chat.size === "large";

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [chat.messages.length, chat.sending, chat.ended]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (event) => {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onMinimize();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onMinimize]);

  // A full-screen sheet on phones hides the page it links to.
  const onNavigate = () => {
    if (window.matchMedia("(max-width: 639px)").matches) onMinimize();
  };

  const submit = (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || chat.sending || chat.ended) return;
    setDraft("");
    chat.send({ text });
  };

  const lastBotIndex = chat.messages.map((message) => message.role).lastIndexOf("bot");

  return (
    <div
      role="dialog"
      aria-label="Dunamis assistant"
      className={`flex h-full w-full flex-col overflow-hidden bg-[#fffaf4] shadow-[0_30px_60px_-20px_rgba(9,9,15,0.45)] sm:rounded-3xl sm:border sm:border-slate-200 ${
        large ? "sm:h-[80vh] sm:w-[520px]" : "sm:h-[560px] sm:w-[380px]"
      }`}
    >
      <header className="relative flex items-center gap-3 bg-[#09090f] px-4 py-3.5 text-white">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="orb absolute -right-10 -top-16 h-40 w-40 bg-orange-500/25" style={{ "--dur": "14s" }} />
        </div>
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff8a5c] to-[#FF6B35]">
          <LuBot className="h-5 w-5" />
        </div>
        <div className="relative min-w-0 flex-1">
          <p className="text-sm font-semibold">Dunamis Assistant</p>
          <p className="flex items-center gap-1.5 text-xs text-white/60">
            <span className={`h-1.5 w-1.5 rounded-full ${chat.ended ? "bg-slate-500" : "bg-emerald-400"}`} />
            {chat.ended ? "Chat ended" : "Answers instantly"}
          </p>
        </div>

        <div className="relative flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => chat.setSize(large ? "normal" : "large")}
            aria-label={large ? "Shrink chat" : "Expand chat"}
            className="hidden rounded-xl p-2 text-white/70 transition hover:bg-white/10 hover:text-white sm:flex"
          >
            {large ? <LuMinimize2 className="h-4 w-4" /> : <LuMaximize2 className="h-4 w-4" />}
          </button>

          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat on WhatsApp"
            className="flex rounded-xl p-2 text-green-400 transition hover:bg-white/10 hover:text-green-300"
          >
            <FaWhatsapp className="h-4 w-4" />
          </a>

          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Chat options"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="flex rounded-xl p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <LuEllipsisVertical className="h-4 w-4" />
            </button>
            {menuOpen ? (
              <div
                role="menu"
                className="pop-in absolute right-0 top-full z-10 mt-2 w-44 origin-top-right overflow-hidden rounded-2xl border border-slate-100 bg-white py-1 text-slate-700 shadow-lg"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    chat.newChat();
                    inputRef.current?.focus();
                  }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm transition hover:bg-orange-50"
                >
                  <LuRotateCcw className="h-4 w-4 text-slate-400" /> New chat
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled={chat.ended}
                  onClick={() => {
                    setMenuOpen(false);
                    chat.endChat("visitor");
                  }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm transition hover:bg-orange-50 disabled:opacity-40"
                >
                  <LuLogOut className="h-4 w-4 text-slate-400" /> End chat
                </button>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onMinimize}
            aria-label="Minimize chat"
            className="flex rounded-xl p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <LuMinus className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite">
        {chat.messages.map((message, index) =>
          message.role === "user" ? (
            <div key={message.id} className="enter-up flex justify-end">
              <p className="max-w-[80%] whitespace-pre-line rounded-2xl rounded-tr-md bg-[#FF6B35] px-3.5 py-2.5 text-sm text-white">
                {message.text}
              </p>
            </div>
          ) : (
            <BotMessage
              key={message.id}
              message={message}
              isLatest={index === lastBotIndex}
              chat={chat}
              onAction={onAction}
              onNavigate={onNavigate}
              busyAction={busyAction}
            />
          )
        )}

        {chat.sending ? (
          <div className="enter-fade flex items-center gap-2" aria-label="Assistant is typing">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#09090f] text-[#FF6B35]">
              <LuBot className="h-4 w-4" />
            </div>
            <div className="flex gap-1 rounded-2xl rounded-tl-md border border-slate-100 bg-white px-3.5 py-3">
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
          </div>
        ) : null}

        {chat.ended ? (
          <div className="enter-fade space-y-3 pt-2 text-center">
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              Chat ended{chat.endedAt ? ` · ${timeLabel(chat.endedAt)}` : ""}
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            <button
              type="button"
              onClick={chat.newChat}
              className="rounded-full bg-[#FF6B35] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#fd5a1f] active:scale-[0.97]"
            >
              Start a new chat
            </button>
          </div>
        ) : null}
      </div>

      <form onSubmit={submit} className="border-t border-slate-200 bg-white px-3 py-3">
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 pl-3.5 pr-1.5 focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-100">
          <input
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value.slice(0, MAX_LENGTH))}
            disabled={chat.ended}
            placeholder={chat.ended ? "This chat has ended" : "Ask about courses, fees, centres…"}
            aria-label="Your message"
            className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!draft.trim() || chat.sending || chat.ended}
            aria-label="Send"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FF6B35] text-white transition hover:bg-[#fd5a1f] active:scale-[0.97] disabled:bg-slate-300"
          >
            <LuSendHorizontal className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
