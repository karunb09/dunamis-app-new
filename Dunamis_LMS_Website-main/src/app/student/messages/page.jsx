"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { HiChatAlt2, HiPaperAirplane, HiPlus } from "react-icons/hi";
import StudentShell from "@/components/student/StudentShell";
import { getWebsiteToken } from "@/lib/authSession";
import { API_BASE } from "@/lib/apiBase";

// Authenticated calls go through the BFF proxy (JWT injected from httpOnly cookie).
const BASE_URL = API_BASE;
const POLL_MS = 15000;

const ContactRow = ({ contact, busy, onSelect }) => (
  <button
    type="button"
    onClick={onSelect}
    disabled={busy}
    className="flex w-full items-center justify-between gap-3 rounded-2xl border border-stone-200 px-4 py-3 text-left transition hover:border-orange-200 hover:bg-orange-50/60 disabled:opacity-50"
  >
    <span className="min-w-0">
      <span className="block truncate text-sm font-semibold text-slate-950">
        {contact.teacherName}
      </span>
      <span className="block truncate text-xs text-slate-500">{contact.courseName}</span>
    </span>
    <span className="shrink-0 text-xs font-semibold text-orange-600">
      {busy ? "Opening..." : contact.conversationId ? "Open" : "Message"}
    </span>
  </button>
);

const timeLabel = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";

  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();

  return date.toLocaleString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    ...(sameDay ? {} : { day: "numeric", month: "short" }),
  });
};

export default function StudentMessagesPage() {
  const authToken = useSelector((state) => state.auth?.token);
  const [conversations, setConversations] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [starting, setStarting] = useState("");
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef(null);

  const authHeaders = useCallback(() => {
    const token = authToken || getWebsiteToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [authToken]);

  const request = useCallback(
    async (path, options = {}) => {
      const response = await fetch(`${BASE_URL}/v1/messages${path}`, {
        credentials: "include",
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
          ...(options.headers || {}),
        },
      });
      const data = await response.json();
      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Something went wrong.");
      }
      return data;
    },
    [authHeaders]
  );

  const loadConversations = useCallback(async () => {
    try {
      const data = await request("/conversations");
      setConversations(data.conversations || []);
      setError("");
    } catch (err) {
      setError(err.message || "Unable to load your messages.");
    } finally {
      setLoading(false);
    }
  }, [request]);

  const loadContacts = useCallback(async () => {
    try {
      const data = await request("/contacts");
      setContacts(data.contacts || []);
    } catch {
      // The picker is optional — a failure here must not blank the thread list.
    }
  }, [request]);

  // Resolve-or-create: an instructor the learner already has a thread with
  // reuses it rather than opening a second one.
  const startWith = async (contact) => {
    const key = `${contact.teacherId}|${contact.courseId}`;
    setStarting(key);
    try {
      const data = await request("/conversations", {
        method: "POST",
        body: JSON.stringify({
          teacherId: contact.teacherId,
          courseId: contact.courseId,
        }),
      });
      setPicking(false);
      await loadConversations();
      await loadContacts();
      setActiveId(data.conversation._id);
    } catch (err) {
      setError(err.message || "Could not start that conversation.");
    } finally {
      setStarting("");
    }
  };

  const loadThread = useCallback(
    async (conversationId) => {
      if (!conversationId) return;
      try {
        const data = await request(`/conversations/${conversationId}/messages`);
        setMessages(data.messages || []);
      } catch (err) {
        setError(err.message || "Unable to load this conversation.");
      }
    },
    [request]
  );

  useEffect(() => {
    loadConversations();
    loadContacts();
  }, [loadConversations, loadContacts]);

  useEffect(() => {
    if (!activeId && conversations.length) setActiveId(conversations[0]._id);
  }, [activeId, conversations]);

  useEffect(() => {
    if (!activeId) return undefined;

    loadThread(activeId);
    request(`/conversations/${activeId}/read`, { method: "POST" })
      .then(loadConversations)
      .catch(() => {});

    // Polled rather than pushed — no websocket in this stack. A backgrounded
    // tab stops polling until it is looked at again.
    const timer = setInterval(() => {
      if (!document.hidden) {
        loadThread(activeId);
        loadConversations();
      }
    }, POLL_MS);

    return () => clearInterval(timer);
  }, [activeId, loadThread, loadConversations, request]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, activeId]);

  const active = useMemo(
    () => conversations.find((item) => item._id === activeId) || null,
    [conversations, activeId]
  );

  const submit = async (event) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending || !activeId) return;

    setSending(true);
    try {
      await request(`/conversations/${activeId}/messages`, {
        method: "POST",
        body: JSON.stringify({ body }),
      });
      setDraft("");
      await Promise.all([loadThread(activeId), loadConversations()]);
    } catch (err) {
      setError(err.message || "Message not sent.");
    } finally {
      setSending(false);
    }
  };

  return (
    <StudentShell
      title="Messages"
      description="Talk to your instructor about a class, homework, or anything you missed."
    >
      {error ? (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-[2rem] border border-orange-100 bg-white p-10 text-center text-sm text-slate-500">
          Loading your messages...
        </div>
      ) : conversations.length === 0 ? (
        <div className="rounded-[2rem] border border-orange-100 bg-white p-10 text-center">
          <HiChatAlt2 className="mx-auto h-8 w-8 text-orange-400" />
          <h2 className="mt-3 text-lg font-bold text-slate-950">No conversations yet</h2>
          {contacts.length === 0 ? (
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
              Once you are enrolled in a class, your instructor appears here and
              you can message them any time — during class or after.
            </p>
          ) : (
            <>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
                Message an instructor about a class, homework, or anything you
                missed.
              </p>
              <div className="mx-auto mt-6 grid max-w-lg gap-2">
                {contacts.map((contact) => (
                  <ContactRow
                    key={`${contact.teacherId}-${contact.courseId}`}
                    contact={contact}
                    busy={starting === `${contact.teacherId}|${contact.courseId}`}
                    onSelect={() => startWith(contact)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <aside className="rounded-[2rem] border border-orange-100 bg-white p-2">
            {contacts.length > 0 ? (
              <div className="p-1">
                <button
                  type="button"
                  onClick={() => setPicking((open) => !open)}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-orange-200 px-3 py-2.5 text-sm font-semibold text-orange-700 transition hover:bg-orange-50"
                >
                  <HiPlus className="h-4 w-4" />
                  {picking ? "Close" : "New message"}
                </button>

                {picking ? (
                  <div className="mt-2 grid gap-1.5 border-b border-stone-100 pb-3">
                    {contacts.map((contact) => (
                      <ContactRow
                        key={`${contact.teacherId}-${contact.courseId}`}
                        contact={contact}
                        busy={starting === `${contact.teacherId}|${contact.courseId}`}
                        onSelect={() => {
                          if (contact.conversationId) {
                            setPicking(false);
                            setActiveId(contact.conversationId);
                            return;
                          }
                          startWith(contact);
                        }}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            <ul className="max-h-[60vh] space-y-1 overflow-y-auto">
              {conversations.map((item) => (
                <li key={item._id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(item._id)}
                    className={`w-full rounded-2xl px-3 py-3 text-left transition ${
                      item._id === activeId
                        ? "bg-orange-50 text-orange-700"
                        : "text-slate-600 hover:bg-stone-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-slate-950">
                        {item.teacher.name}
                      </p>
                      {item.unread > 0 ? (
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-600 px-1.5 text-[11px] font-bold text-white">
                          {item.unread}
                        </span>
                      ) : null}
                    </div>
                    <p className="truncate text-xs text-slate-500">{item.courseName}</p>
                    {item.lastMessagePreview ? (
                      <p className="mt-0.5 truncate text-xs text-slate-400">
                        {item.lastSenderRole === "student" ? "You: " : ""}
                        {item.lastMessagePreview}
                      </p>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <section className="flex min-h-[60vh] flex-col rounded-[2rem] border border-orange-100 bg-white">
            {active ? (
              <>
                <div className="border-b border-stone-100 px-5 py-4">
                  <p className="font-bold text-slate-950">{active.teacher.name}</p>
                  <p className="text-xs text-slate-500">{active.courseName}</p>
                </div>

                <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
                  {messages.length === 0 ? (
                    <p className="text-center text-sm text-slate-400">
                      No messages yet — say hello.
                    </p>
                  ) : (
                    messages.map((message) => {
                      const mine = message.senderRole === "student";
                      return (
                        <div
                          key={message._id}
                          className={`flex ${mine ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                              mine
                                ? "bg-orange-600 text-white"
                                : "bg-stone-100 text-slate-800"
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

                <form onSubmit={submit} className="flex gap-2 border-t border-stone-100 p-4">
                  <input
                    type="text"
                    value={draft}
                    maxLength={2000}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Write a message..."
                    className="flex-1 rounded-2xl border border-stone-200 px-4 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || sending}
                    className="inline-flex items-center gap-2 rounded-2xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:opacity-50"
                  >
                    <HiPaperAirplane className="rotate-90" />
                    Send
                  </button>
                </form>
              </>
            ) : null}
          </section>
        </div>
      )}
    </StudentShell>
  );
}
