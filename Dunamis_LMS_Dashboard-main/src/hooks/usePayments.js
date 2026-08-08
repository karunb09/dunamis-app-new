import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import * as paymentsApi from "../api/paymentsApi";

export const paymentKeys = {
  all: ["payments"],
  list: (params) => ["payments", "list", params],
  dues: (params) => ["payments", "dues", params],
  needsAttention: (params) => ["payments", "needs-attention", params],
  needsAttentionCount: ["payments", "needs-attention", "count"],
  detail: (id) => ["payments", "detail", id],
};

export function useDues(params) {
  return useQuery({
    queryKey: paymentKeys.dues(params),
    queryFn: () => paymentsApi.fetchDues(params),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function usePaymentsList(params) {
  return useQuery({
    queryKey: paymentKeys.list(params),
    queryFn: () => paymentsApi.fetchPayments(params),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useNeedsAttention(params) {
  return useQuery({
    queryKey: paymentKeys.needsAttention(params),
    queryFn: () => paymentsApi.fetchNeedsAttention(params),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useNeedsAttentionCount() {
  return useQuery({
    queryKey: paymentKeys.needsAttentionCount,
    queryFn: paymentsApi.fetchNeedsAttentionCount,
    refetchInterval: 120_000,
    staleTime: 60_000,
  });
}

export function usePaymentDetail(id) {
  return useQuery({
    queryKey: paymentKeys.detail(id),
    queryFn: () => paymentsApi.fetchPaymentDetail(id),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

// A re-verify can change both the queue and its badge count, so invalidate the
// whole namespace rather than patching two differently-shaped caches.
export function useReverifyPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => paymentsApi.reverifyPayment(id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: paymentKeys.all }),
  });
}

// Recording cash clears a due and adds a transaction, so both the dues list and
// the ledger are stale afterwards.
export function useRecordCashInstallment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => paymentsApi.recordCashInstallment(payload),
    onSettled: () => queryClient.invalidateQueries({ queryKey: paymentKeys.all }),
  });
}
