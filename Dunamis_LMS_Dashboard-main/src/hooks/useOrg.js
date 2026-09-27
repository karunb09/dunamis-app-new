import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/orgApi";

export const orgKeys = {
  all: ["org"],
  staff: ["org", "staff"],
  chart: ["org", "chart"],
  zones: ["org", "zones"],
};

export function useStaffDirectory(options = {}) {
  return useQuery({ queryKey: orgKeys.staff, queryFn: api.fetchStaffDirectory, staleTime: 60_000, ...options });
}

export function useOrgChart() {
  return useQuery({ queryKey: orgKeys.chart, queryFn: api.fetchOrgChart, staleTime: 30_000 });
}

export function useZones() {
  return useQuery({ queryKey: orgKeys.zones, queryFn: api.fetchZones, staleTime: 60_000 });
}

// A placement or zone change can move people and coverage anywhere in the
// chart, so the whole namespace is refetched.
const useOrgMutation = (mutationFn) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSettled: () => queryClient.invalidateQueries({ queryKey: orgKeys.all }),
  });
};

export const useSaveOrgPlacement = () => useOrgMutation(api.saveOrgPlacement);
export const useCreateZone = () => useOrgMutation(api.createZone);
export const useRenameZone = () => useOrgMutation(api.renameZone);
export const useDeleteZone = () => useOrgMutation(api.deleteZone);
