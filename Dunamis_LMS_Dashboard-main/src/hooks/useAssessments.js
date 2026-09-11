import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/assessmentsApi";

export const assessmentKeys = {
  all: ["assessments"],
  teacher: ["assessments", "teacher"],
};

export function useTeacherAssessments() {
  return useQuery({
    queryKey: assessmentKeys.teacher,
    queryFn: api.fetchTeacherAssessments,
    staleTime: 30_000,
  });
}

// Every write moves an assessment between tabs, so the whole list is refetched
// rather than patched in place.
const useAssessmentMutation = (mutationFn) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSettled: () => queryClient.invalidateQueries({ queryKey: assessmentKeys.all }),
  });
};

export const useSendQuestionnaire = () => useAssessmentMutation(api.sendQuestionnaire);

export const useScoreAssessment = () =>
  useAssessmentMutation(({ id, ...body }) => api.scoreAssessment(id, body));

export const useIssueCertificate = () => useAssessmentMutation((id) => api.issueCertificate(id));
