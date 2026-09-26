import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/chatbotApi";

export const chatbotKeys = {
  all: ["chatbot"],
  summary: (days) => ["chatbot", "summary", days],
  groups: (params) => ["chatbot", "groups", params],
  conversation: (id) => ["chatbot", "conversation", id],
};

export function useChatbotSummary(days) {
  return useQuery({
    queryKey: chatbotKeys.summary(days),
    queryFn: () => api.fetchChatbotSummary(days),
    staleTime: 60_000,
  });
}

export function useChatbotGroups(params) {
  return useQuery({
    queryKey: chatbotKeys.groups(params),
    queryFn: () => api.fetchChatbotGroups(params),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useChatbotConversation(id) {
  return useQuery({
    queryKey: chatbotKeys.conversation(id),
    queryFn: () => api.fetchChatbotConversation(id),
    enabled: Boolean(id),
    staleTime: 5 * 60_000,
  });
}

export function useResolveChatbotGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.resolveChatbotGroup,
    onSettled: () => queryClient.invalidateQueries({ queryKey: chatbotKeys.all }),
  });
}
