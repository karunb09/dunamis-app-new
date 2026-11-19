import { useQuery } from "@tanstack/react-query";
import { fetchTodaySchedule } from "../api/todayScheduleApi";

export function useTodaySchedule() {
  return useQuery({
    queryKey: ["today-schedule"],
    queryFn: fetchTodaySchedule,
    staleTime: 60_000,
    // Check-ins and the day's progress change while the page is open.
    refetchInterval: 5 * 60_000,
  });
}
