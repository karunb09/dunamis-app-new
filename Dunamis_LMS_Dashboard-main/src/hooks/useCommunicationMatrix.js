import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/communicationMatrixApi";

export const matrixKeys = { all: ["communication-matrix"] };

export function useCommunicationMatrix() {
  return useQuery({ queryKey: matrixKeys.all, queryFn: api.fetchMatrix, staleTime: 30_000 });
}

const useMatrixMutation = (mutationFn) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSettled: () => queryClient.invalidateQueries({ queryKey: matrixKeys.all }),
  });
};

export const useSaveMatrixRule = () => useMatrixMutation(api.saveMatrixRule);
export const useResetMatrixRule = () => useMatrixMutation(api.resetMatrixRule);
