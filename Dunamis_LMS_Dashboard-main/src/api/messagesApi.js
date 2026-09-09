import axios from "./axios";

// Pure data-access for learner<->instructor messaging. Caching/loading/error
// are owned by TanStack Query (see hooks/useMessages.js).

const toError = (err, fallback) => {
  const data = err.response?.data;
  const msg = typeof data === "string" ? data : data?.message || err.message || fallback;
  const e = new Error(msg || fallback);
  e.response = err.response;
  return e;
};

export async function fetchConversations() {
  try {
    const { data } = await axios.get("/messages/conversations");
    return data;
  } catch (err) {
    throw toError(err, "Failed to load conversations");
  }
}

// Who the caller may start a thread with — the picker never offers a pair the
// create call would refuse.
export async function fetchContacts() {
  try {
    const { data } = await axios.get("/messages/contacts");
    return data;
  } catch (err) {
    throw toError(err, "Failed to load contacts");
  }
}

export async function startConversation(body) {
  try {
    const { data } = await axios.post("/messages/conversations", body);
    return data;
  } catch (err) {
    throw toError(err, "Failed to start the conversation");
  }
}

export async function fetchUnreadCount() {
  try {
    const { data } = await axios.get("/messages/unread-count");
    return data;
  } catch (err) {
    throw toError(err, "Failed to load unread count");
  }
}

export async function fetchMessages(conversationId, params = {}) {
  try {
    const { data } = await axios.get(
      `/messages/conversations/${conversationId}/messages`,
      { params }
    );
    return data;
  } catch (err) {
    throw toError(err, "Failed to load messages");
  }
}

export async function sendMessage(conversationId, body) {
  try {
    const { data } = await axios.post(
      `/messages/conversations/${conversationId}/messages`,
      { body }
    );
    return data;
  } catch (err) {
    throw toError(err, "Failed to send message");
  }
}

export async function markConversationRead(conversationId) {
  try {
    const { data } = await axios.post(`/messages/conversations/${conversationId}/read`);
    return data;
  } catch (err) {
    throw toError(err, "Failed to mark as read");
  }
}
