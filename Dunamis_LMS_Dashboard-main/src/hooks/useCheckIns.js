import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import * as api from "../api/checkInApi";

export const checkInKeys = {
  all: ["check-ins"],
  today: ["check-ins", "today"],
  history: (month) => ["check-ins", "history", month],
  report: (params) => ["check-ins", "report", params],
};

export function useMyCheckInToday() {
  return useQuery({
    queryKey: checkInKeys.today,
    queryFn: api.fetchMyCheckInToday,
    staleTime: 15_000,
  });
}

export function useMyCheckInHistory(month) {
  return useQuery({
    queryKey: checkInKeys.history(month),
    queryFn: () => api.fetchMyCheckInHistory(month),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function useCheckInReport(params) {
  return useQuery({
    queryKey: checkInKeys.report(params),
    queryFn: () => api.fetchCheckInReport(params),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

// A check-in, check-out or note changes today's view, the history and the
// report alike, so the whole namespace is invalidated.
const useCheckInMutation = (mutationFn) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSettled: () => queryClient.invalidateQueries({ queryKey: checkInKeys.all }),
  });
};

export const useCheckIn = () => useCheckInMutation(api.submitCheckIn);

export const useCheckOut = () =>
  useCheckInMutation(({ id, ...body }) => api.submitCheckOut(id, body));

export const useAddCheckInNote = () =>
  useCheckInMutation(({ id, ...body }) => api.addCheckInNote(id, body));
