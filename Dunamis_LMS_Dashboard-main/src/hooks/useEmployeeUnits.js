import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/employeeUnitApi";

export const unitKeys = { all: ["employee-units"] };

export function useEmployeeUnits() {
  return useQuery({ queryKey: unitKeys.all, queryFn: api.fetchUnits, staleTime: 60_000 });
}

// What the hiring and admin forms offer: active units only.
export function useActiveUnits() {
  const { data = [], ...rest } = useEmployeeUnits();
  return { units: data.filter((unit) => unit.isActive), ...rest };
}

const useUnitMutation = (mutationFn) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSettled: () => queryClient.invalidateQueries({ queryKey: unitKeys.all }),
  });
};

export const useCreateUnit = () => useUnitMutation(api.createUnit);
export const useUpdateUnit = () => useUnitMutation(api.updateUnit);
export const useDeleteUnit = () => useUnitMutation(api.deleteUnit);
