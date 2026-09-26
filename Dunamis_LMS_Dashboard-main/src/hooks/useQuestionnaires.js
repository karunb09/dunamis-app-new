import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/questionnairesApi";

export const questionnaireKeys = {
  all: ["questionnaires"],
  list: (params) => ["questionnaires", "list", params],
};

export function useQuestionnaires(params = {}) {
  return useQuery({
    queryKey: questionnaireKeys.list(params),
    queryFn: () => api.fetchQuestionnaires(params),
    staleTime: 60_000,
  });
}

const useQuestionnaireMutation = (mutationFn) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSettled: () => queryClient.invalidateQueries({ queryKey: questionnaireKeys.all }),
  });
};

export const useCreateQuestionnaire = () => useQuestionnaireMutation(api.createQuestionnaire);

export const useUpdateQuestionnaire = () =>
  useQuestionnaireMutation(({ id, ...body }) => api.updateQuestionnaire(id, body));

export const useDuplicateQuestionnaire = () =>
  useQuestionnaireMutation((id) => api.duplicateQuestionnaire(id));

export const useDeleteQuestionnaire = () =>
  useQuestionnaireMutation((id) => api.deleteQuestionnaire(id));
