import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import * as api from "../api/instructorPayApi";

export const instructorPayKeys = {
  all: ["instructor-pay"],
  month: (params) => ["instructor-pay", "month", params],
  teacher: (teacherId) => ["instructor-pay", "teacher", teacherId],
  rates: ["instructor-pay", "rates"],
  config: ["instructor-pay", "config"],
};

export function usePayoutsForMonth(params) {
  return useQuery({
    queryKey: instructorPayKeys.month(params),
    queryFn: () => api.fetchPayoutsForMonth(params),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function usePayoutsForTeacher(teacherId) {
  return useQuery({
    queryKey: instructorPayKeys.teacher(teacherId),
    queryFn: () => api.fetchPayoutsForTeacher(teacherId),
    enabled: Boolean(teacherId),
    staleTime: 60_000,
  });
}

// Every write below can change both the month list and a teacher's own history,
// so the whole namespace is invalidated rather than patching two caches.
const usePayMutation = (mutationFn) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSettled: () => queryClient.invalidateQueries({ queryKey: instructorPayKeys.all }),
  });
};

export const useGeneratePayouts = () => usePayMutation(api.generatePayouts);

export const useSaveAdjustments = () =>
  usePayMutation(({ id, adjustments }) => api.saveAdjustments(id, adjustments));

export const useApprovePayout = () => usePayMutation((id) => api.approvePayout(id));

export const useSetPayStatus = () =>
  usePayMutation(({ id, ...body }) => api.setPayStatus(id, body));

export function useInstructorRates() {
  return useQuery({
    queryKey: instructorPayKeys.rates,
    queryFn: api.fetchRates,
    staleTime: 300_000,
  });
}

export function usePayConfig() {
  return useQuery({
    queryKey: instructorPayKeys.config,
    queryFn: api.fetchPayConfig,
    staleTime: 300_000,
  });
}

export const useCreateRate = () => usePayMutation(api.createRate);

export const useUpdateRate = () =>
  usePayMutation(({ id, ...body }) => api.updateRate(id, body));

export const useDeleteRate = () => usePayMutation((id) => api.deleteRate(id));

export const useUpdatePayConfig = () => usePayMutation(api.updatePayConfig);
