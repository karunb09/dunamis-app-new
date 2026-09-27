import axios from "./axios";

// Pure data-access for the website chatbot review page. Caching/loading/error
// are owned by TanStack Query (see hooks/useChatbotInsights.js).

const toError = (err, fallback) => {
  const data = err.response?.data;
  const e = new Error(data?.message || err.message || fallback);
  e.response = err.response;
  return e;
};

export async function fetchChatbotSummary(days) {
  try {
    const { data } = await axios.get("/chatbot/admin/summary", { params: { days } });
    return data.data;
  } catch (err) {
    throw toError(err, "Failed to load chatbot summary");
  }
}

export async function fetchChatbotGroups(params) {
  try {
    const { data } = await axios.get("/chatbot/admin/groups", { params });
    return data.data;
  } catch (err) {
    throw toError(err, "Failed to load questions");
  }
}

export async function fetchChatbotConversation(id) {
  try {
    const { data } = await axios.get(`/chatbot/admin/conversations/${id}`);
    return data.data;
  } catch (err) {
    throw toError(err, "Failed to load the conversation");
  }
}

export async function resolveChatbotGroup(payload) {
  try {
    const { data } = await axios.patch("/chatbot/admin/groups/resolve", payload);
    return data.data;
  } catch (err) {
    throw toError(err, "Failed to update the question");
  }
}
