import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as courseApi from "../api/courseApi";

// Centralised query keys so every cache read/invalidate references the same
// source of truth.
export const courseKeys = {
  all: ["courses"],
  lists: () => [...courseKeys.all, "list"],
  detail: (id) => [...courseKeys.all, "detail", id],
};

// ----- Queries -----

export function useCoursesQuery(options = {}) {
  return useQuery({
    queryKey: courseKeys.lists(),
    queryFn: courseApi.fetchCourses,
    ...options,
  });
}

export function useCourseDetailsQuery(courseId, options = {}) {
  return useQuery({
    queryKey: courseKeys.detail(courseId),
    queryFn: () => courseApi.fetchCourseDetails(courseId),
    enabled: Boolean(courseId),
    ...options,
  });
}

// ----- Mutations -----
// Each mutation invalidates the course list (and detail where relevant) on
// success, so any mounted component refetches automatically — replacing the
// manual courseList splicing the slice did in every reducer.

export function useCreateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: courseApi.createCourse,
    onSuccess: () => qc.invalidateQueries({ queryKey: courseKeys.lists() }),
  });
}

export function useUpdateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: courseApi.updateCourse,
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: courseKeys.lists() });
      if (variables?.courseId) {
        qc.invalidateQueries({ queryKey: courseKeys.detail(variables.courseId) });
      }
    },
  });
}

export function useDeleteCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: courseApi.deleteCourse,
    onSuccess: () => qc.invalidateQueries({ queryKey: courseKeys.lists() }),
  });
}
