import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/messagesApi";

export const messageKeys = {
  all: ["messages"],
  conversations: ["messages", "conversations"],
  contacts: ["messages", "contacts"],
  unread: ["messages", "unread"],
  thread: (id) => ["messages", "thread", id],
};

// Polled rather than pushed — no websocket in this stack. `document.hidden`
// keeps a backgrounded tab from polling forever.
const pollWhileVisible = (ms) => () => (document.hidden ? false : ms);

export function useConversations() {
  return useQuery({
    queryKey: messageKeys.conversations,
    queryFn: api.fetchConversations,
    refetchInterval: pollWhileVisible(30_000),
    staleTime: 15_000,
  });
}

export function useContacts() {
  return useQuery({
    queryKey: messageKeys.contacts,
    queryFn: api.fetchContacts,
    staleTime: 120_000,
  });
}

export function useStartConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.startConversation,
    onSettled: () => queryClient.invalidateQueries({ queryKey: messageKeys.all }),
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: messageKeys.unread,
    queryFn: api.fetchUnreadCount,
    refetchInterval: pollWhileVisible(60_000),
    staleTime: 30_000,
  });
}

export function useThread(conversationId) {
  return useQuery({
    queryKey: messageKeys.thread(conversationId),
    queryFn: () => api.fetchMessages(conversationId),
    enabled: Boolean(conversationId),
    refetchInterval: pollWhileVisible(15_000),
  });
}

export function useSendMessage(conversationId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => api.sendMessage(conversationId, body),
    onSettled: () => queryClient.invalidateQueries({ queryKey: messageKeys.all }),
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId) => api.markConversationRead(conversationId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: messageKeys.all }),
  });
}
