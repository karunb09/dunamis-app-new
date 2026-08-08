import dayjs from "dayjs";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { fetchMonthlyInsights, fetchInsightMonths } from "../api/insightsApi";

export const insightKeys = {
  monthly: (month) => ["insights", "monthly", month],
  months: ["insights", "months"],
};

export function useMonthlyInsights(month) {
  const isCurrent = month === dayjs().format("YYYY-MM");

  return useQuery({
    queryKey: insightKeys.monthly(month),
    queryFn: () => fetchMonthlyInsights(month),
    enabled: !!month,
    placeholderData: keepPreviousData,
    staleTime: isCurrent ? 60_000 : 5 * 60_000,
  });
}

export function useInsightMonths() {
  return useQuery({
    queryKey: insightKeys.months,
    queryFn: fetchInsightMonths,
    staleTime: 5 * 60_000,
  });
}
