import React, { useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import { toast } from "react-hot-toast";
import { FiMessageSquare, FiSend } from "react-icons/fi";
import {
  useConversations,
  useMarkRead,
  useSendMessage,
  useThread,
} from "../../hooks/useMessages";
import { resolveImageUrl, DEFAULT_AVATAR } from "../../utils/resolveImageUrl";

const timeLabel = (value) => {
  const date = dayjs(value);
  if (!date.isValid()) return "";
  return date.isSame(dayjs(), "day")
    ? date.format("h:mm A")
    : date.format("D MMM, h:mm A");
};

// Instructor side of the learner<->instructor thread. The learner sees the same
// conversation in their portal on the website.
const Messages = () => {
  const [activeId, setActiveId] = useState(null);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef(null);

  const { data, isLoading, isError, error } = useConversations();
  const conversations = data?.conversations || [];
  const active = conversations.find((item) => item._id === activeId) || null;

  const { data: threadData, isLoading: threadLoading } = useThread(activeId);
  const sendMessage = useSendMessage(activeId);
  const markRead = useMarkRead();

  const messages = threadData?.messages || [];

  useEffect(() => {
    if (!activeId && conversations.length) setActiveId(conversations[0]._id);
  }, [activeId, conversations]);

  useEffect(() => {
    if (activeId && active?.unread) markRead.mutate(activeId);
    // markRead is a stable mutation object; re-running on it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, active?.unread]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, activeId]);

  const submit = async (event) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sendMessage.isPending) return;

    try {
      await sendMessage.mutateAsync(body);
      setDraft("");
    } catch (err) {
      toast.error(err.message || "Failed to send message");
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">
          Messages
        </p>
        <h1 className="text-2xl font-bold text-slate-900">Learner messages</h1>
        <p className="text-sm text-slate-500">
          One thread per learner you teach. They see the same conversation in
          their student portal.
        </p>
      </div>

      {isError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error?.message || "Failed to load conversations"}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-3xl border border-slate-200 bg-white p-2">
          {isLoading ? (
            <div className="space-y-2 p-2">
              <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
              <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-12 text-center text-slate-400">
              <FiMessageSquare className="text-2xl" />
              <p className="text-sm">
                Nothing here yet — a thread appears when a learner messages you.
              </p>
            </div>
          ) : (
            <ul className="max-h-[70vh] space-y-1 overflow-y-auto">
              {conversations.map((item) => (
                <li key={item._id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(item._id)}
                    className={`flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition ${
                      item._id === activeId
                        ? "border border-orange-300 bg-orange-50"
                        : "border border-transparent hover:bg-slate-50"
                    }`}
                  >
                    <img
                      src={resolveImageUrl(item.student.image, DEFAULT_AVATAR)}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-full object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {item.student.name}
                        </p>
                        {item.unread > 0 && (
                          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FF6B35] px-1.5 text-[11px] font-bold text-white">
                            {item.unread}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-slate-500">{item.courseName}</p>
                      {item.lastMessagePreview ? (
                        <p className="mt-0.5 truncate text-xs text-slate-400">
                          {item.lastSenderRole === "teacher" ? "You: " : ""}
                          {item.lastMessagePreview}
                        </p>
                      ) : null}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="flex min-h-[60vh] flex-col rounded-3xl border border-slate-200 bg-white">
          {!active ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-slate-400">
              <FiMessageSquare className="text-2xl" />
              <p className="text-sm">Pick a conversation to read it.</p>
            </div>
          ) : (
            <>
              <div className="border-b border-slate-100 px-5 py-4">
                <p className="font-semibold text-slate-900">{active.student.name}</p>
                <p className="text-xs text-slate-500">
                  {active.courseName}
                  {active.courseCode ? ` · ${active.courseCode}` : ""}
                </p>
              </div>

              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
                {threadLoading && !messages.length ? (
                  <p className="text-center text-sm text-slate-400">Loading messages...</p>
                ) : messages.length === 0 ? (
                  <p className="text-center text-sm text-slate-400">
                    No messages yet — say hello.
                  </p>
                ) : (
                  messages.map((message) => {
                    const mine = message.senderRole === "teacher";
                    return (
                      <div
                        key={message._id}
                        className={`flex ${mine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                            mine
                              ? "bg-[#FF6B35] text-white"
                              : "bg-slate-100 text-slate-800"
                          }`}
                        >
                          <p className="whitespace-pre-line">{message.body}</p>
                          <p
                            className={`mt-1 text-[10px] ${
                              mine ? "text-white/70" : "text-slate-400"
                            }`}
                          >
                            {timeLabel(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form onSubmit={submit} className="flex gap-2 border-t border-slate-100 p-4">
                <input
                  type="text"
                  value={draft}
                  maxLength={2000}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write a message..."
                  className="flex-1 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || sendMessage.isPending}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#FF6B35] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#fd5a1f] disabled:opacity-50"
                >
                  <FiSend />
                  Send
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default Messages;
