"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import api from "@/lib/axios";
import { API_BASE } from "@/lib/apiBase";

const STORAGE_PREFIX = "dunamis-chatbot:";
const GUEST_KEY = `${STORAGE_PREFIX}guest`;
const IDLE_MS = 10 * 60 * 1000;

const chip = (label, intent) => ({ label, action: { intent } });

const GUEST_CHIPS = [
  chip("Explore courses", "courses.list"),
  chip("Fees & plans", "course.fees"),
  chip("Centres near you", "branches.list"),
  chip("Meet our instructors", "instructors.forCourse"),
  chip("Book a free demo", "demo.book"),
  chip("Talk to us", "contact.human"),
];

const STUDENT_CHIPS = [
  chip("Next class", "me.nextClass"),
  chip("My fees", "me.fees"),
  chip("My homework", "me.homework"),
  chip("My instructor", "me.instructor"),
  chip("Explore courses", "courses.list"),
  chip("Talk to us", "contact.human"),
];

let nextId = 0;
const localId = () => `m${Date.now().toString(36)}${(nextId += 1)}`;

// student is { firstName } for a logged-in student, null for a guest.
const welcomeMessage = (student) => ({
  id: localId(),
  role: "bot",
  text: student
    ? `Hi${student.firstName ? ` ${student.firstName}` : ""}! Ask about your next class, fees or homework — or anything about our courses.`
    : "Hi! I'm the Dunamis assistant. Ask me about courses, fees, centres or instructors — or book a free demo class.",
  reply: { quickReplies: student ? STUDENT_CHIPS : GUEST_CHIPS },
  at: Date.now(),
});

// owner is the storage key this chat belongs to, so a login/logout switch can
// never write one viewer's chat under the other's key.
const freshState = (owner, student) => ({
  owner,
  conversationId: null,
  context: {},
  messages: [welcomeMessage(student)],
  ended: false,
  endedAt: null,
  lastActivityAt: Date.now(),
});

const storage = {
  read(key) {
    try {
      const raw = window.sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  write(key, value) {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage can be blocked (private mode); the chat still works in memory.
    }
  },
  remove(key) {
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      // Nothing stored, nothing to remove.
    }
  },
};

const isIdle = (state) =>
  Boolean(state.conversationId) && !state.ended && Date.now() - state.lastActivityAt > IDLE_MS;

const endLocally = (state) => ({ ...state, ended: true, endedAt: Date.now() });

const botMessage = (text, reply = {}) => ({
  id: localId(),
  role: "bot",
  text,
  reply: { quickReplies: [], ...reply },
  at: Date.now(),
});

export function useChatbot(pagePath) {
  const user = useSelector((state) => state.auth?.user);
  const isStudent = String(user?.accountType || "").toLowerCase() === "student" && Boolean(user?._id);
  const firstName = isStudent ? user.firstName || user.name?.firstName || "" : "";
  const storageKey = isStudent ? `${STORAGE_PREFIX}${user._id}` : GUEST_KEY;
  const fresh = useCallback(
    () => freshState(storageKey, isStudent ? { firstName } : null),
    [storageKey, isStudent, firstName]
  );

  const [state, setState] = useState(() => freshState(null, null));
  const [size, setSize] = useState("normal");
  const [sending, setSending] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;
  const loadedKey = useRef(null);

  // Each viewer has their own stored chat. Leaving a student session (logout or
  // switching accounts) deletes it so personal answers don't outlive the login.
  useEffect(() => {
    const previousKey = loadedKey.current;
    if (previousKey && previousKey !== GUEST_KEY && previousKey !== storageKey) {
      storage.remove(previousKey);
    }
    const stored = storage.read(storageKey);
    const restored = stored?.state?.messages?.length ? { ...stored.state, owner: storageKey } : fresh();
    setState(isIdle(restored) ? endLocally(restored) : restored);
    if (stored?.size) setSize(stored.size);
    loadedKey.current = storageKey;
  }, [storageKey, fresh]);

  useEffect(() => {
    if (state.owner === storageKey) storage.write(storageKey, { state, size });
  }, [state, size, storageKey]);

  useEffect(() => {
    if (!state.conversationId || state.ended) return undefined;
    const timer = window.setInterval(() => {
      if (isIdle(stateRef.current)) setState((prev) => endLocally(prev));
    }, 30 * 1000);
    return () => window.clearInterval(timer);
  }, [state.conversationId, state.ended]);

  // Students go through the BFF so the httpOnly session cookie becomes the JWT;
  // guests call the public endpoint directly.
  const postTurn = useCallback(
    async (payload) => {
      const current = stateRef.current;
      const body = { conversationId: current.conversationId, context: current.context, pagePath, ...payload };
      const { data } = isStudent
        ? await axios.post(`${API_BASE}/v1/chatbot/student/message`, body, { withCredentials: true })
        : await api.post("/v1/chatbot/message", body);
      return data.data;
    },
    [pagePath, isStudent]
  );

  const send = useCallback(
    async ({ text, action, label }) => {
      if (sending) return;
      const current = stateRef.current;
      const base = current.ended ? fresh() : current;
      setState({
        ...base,
        messages: [...base.messages, { id: localId(), role: "user", text: text || label, at: Date.now() }],
        lastActivityAt: Date.now(),
      });
      stateRef.current = base;
      setSending(true);

      try {
        const result = await postTurn(text ? { text } : { action: { ...action, label } });
        setState((prev) => ({
          ...prev,
          conversationId: result.conversationId,
          context: result.context || {},
          ended: result.ended,
          endedAt: result.ended ? Date.now() : null,
          lastActivityAt: Date.now(),
          messages: [
            ...prev.messages,
            { ...botMessage(result.reply.text, result.reply), turnId: result.turnId },
          ],
        }));
      } catch (error) {
        const expired = error?.response?.status === 401;
        setState((prev) => ({
          ...prev,
          messages: [
            ...prev.messages,
            expired
              ? botMessage("Your session has expired — log in again to see your classes and fees.", {
                  actions: [{ type: "link", label: "Log in", href: "/login" }],
                })
              : botMessage(
                  error?.response?.data?.message ||
                    "Sorry, I couldn't reach our team just now. Please try again in a moment."
                ),
          ],
        }));
      } finally {
        setSending(false);
      }
    },
    [postTurn, sending, fresh]
  );

  // Ends the chat on the server; the closing reply is shown unless the visitor
  // is starting over.
  const endChat = useCallback(
    async (reason, outcome = null) => {
      const current = stateRef.current;
      if (current.ended) return;
      if (!current.conversationId) {
        if (reason !== "restarted") setState(endLocally(current));
        return;
      }
      try {
        const result = await postTurn({ action: { intent: "chat.end", reason, outcome } });
        if (reason === "restarted") return;
        setState((prev) => ({
          ...endLocally(prev),
          messages: [...prev.messages, { ...botMessage(result.reply.text, result.reply), turnId: result.turnId }],
        }));
      } catch {
        if (reason !== "restarted") setState((prev) => endLocally(prev));
      }
    },
    [postTurn]
  );

  const newChat = useCallback(() => {
    endChat("restarted");
    setState(fresh());
  }, [endChat, fresh]);

  const updateMessage = useCallback((id, patch) => {
    setState((prev) => ({
      ...prev,
      messages: prev.messages.map((message) =>
        message.id === id ? { ...message, feedback: { ...message.feedback, ...patch } } : message
      ),
    }));
  }, []);

  const postFeedback = useCallback(
    (message, body) =>
      api.post("/v1/chatbot/feedback", {
        conversationId: stateRef.current.conversationId,
        turnId: message.turnId,
        ...body,
      }),
    []
  );

  const rate = useCallback(
    async (message, rating) => {
      updateMessage(message.id, { rating, sent: rating === "up", error: false });
      try {
        await postFeedback(message, { rating });
      } catch {
        updateMessage(message.id, { error: true });
      }
    },
    [postFeedback, updateMessage]
  );

  const explainDown = useCallback(
    async (message, reason, comment) => {
      updateMessage(message.id, { submitting: true, error: false });
      try {
        await postFeedback(message, { rating: "down", reason, comment: comment || null });
        updateMessage(message.id, { submitting: false, sent: true });
      } catch {
        updateMessage(message.id, { submitting: false, error: true });
      }
    },
    [postFeedback, updateMessage]
  );

  return {
    ...state,
    active: Boolean(state.conversationId) && !state.ended,
    size,
    setSize,
    sending,
    send,
    endChat,
    newChat,
    rate,
    explainDown,
  };
}
