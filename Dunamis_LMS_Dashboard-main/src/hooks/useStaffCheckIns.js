import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import * as api from "../api/staffCheckInApi";

export const staffCheckInKeys = {
  all: ["staff-check-ins"],
  today: ["staff-check-ins", "today"],
  history: (month) => ["staff-check-ins", "history", month],
  report: (params) => ["staff-check-ins", "report", params],
};

export function useMyStaffToday() {
  return useQuery({
    queryKey: staffCheckInKeys.today,
    queryFn: api.fetchMyStaffToday,
    staleTime: 15_000,
  });
}

export function useMyStaffHistory(month) {
  return useQuery({
    queryKey: staffCheckInKeys.history(month),
    queryFn: () => api.fetchMyStaffHistory(month),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function useStaffCheckInReport(params) {
  return useQuery({
    queryKey: staffCheckInKeys.report(params),
    queryFn: () => api.fetchStaffCheckInReport(params),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

// A check-in, check-out or note changes today's view, the history and the
// report alike, so the whole namespace is invalidated.
const useStaffMutation = (mutationFn) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSettled: () => queryClient.invalidateQueries({ queryKey: staffCheckInKeys.all }),
  });
};

export const useStaffCheckIn = () => useStaffMutation(api.submitStaffCheckIn);

export const useStaffCheckOut = () =>
  useStaffMutation(({ id, ...body }) => api.submitStaffCheckOut(id, body));

export const useAddStaffCheckInNote = () =>
  useStaffMutation(({ id, ...body }) => api.addStaffCheckInNote(id, body));
