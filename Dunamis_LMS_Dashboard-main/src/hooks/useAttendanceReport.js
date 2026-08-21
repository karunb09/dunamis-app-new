import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { fetchDailyAttendance } from "../api/attendanceReportApi";

export const attendanceReportKeys = {
  all: ["attendance-report"],
  daily: (params) => ["attendance-report", "daily", params],
};

export function useDailyAttendance(params) {
  return useQuery({
    queryKey: attendanceReportKeys.daily(params),
    queryFn: () => fetchDailyAttendance(params),
    placeholderData: keepPreviousData,
    // Flat, unlike useMonthlyInsights: a past day is not frozen here, because
    // late marking is exactly what this report tracks.
    staleTime: 60_000,
  });
}
