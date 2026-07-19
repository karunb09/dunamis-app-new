import { useQuery } from "@tanstack/react-query";
import { fetchOpsStatus } from "../api/opsApi";

export const opsKeys = {
  status: ["ops", "status"],
};

export function useOpsStatus() {
  return useQuery({
    queryKey: opsKeys.status,
    queryFn: fetchOpsStatus,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 15_000,
  });
}
