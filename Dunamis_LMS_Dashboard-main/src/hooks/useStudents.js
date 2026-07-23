import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import * as studentApi from "../api/studentApi";

export const studentKeys = {
  all: ["students"],
  byType: (type) => [...studentKeys.all, "byType", type ?? "all"],
  detail: (id) => [...studentKeys.all, "detail", id],
  overview: (id) => [...studentKeys.all, "overview", id],
  attendanceHomework: (id, courseId) => [...studentKeys.all, "attendanceHomework", id, courseId ?? "all"],
};

export function useStudentsByType(type, options = {}) {
  return useQuery({
    queryKey: studentKeys.byType(type),
    queryFn: () => studentApi.fetchStudentsByType(type),
    ...options,
  });
}

export function useStudentById(id, options = {}) {
  return useQuery({
    queryKey: studentKeys.detail(id),
    queryFn: () => studentApi.fetchStudentById(id),
    enabled: Boolean(id),
    ...options,
  });
}

export function useStudentOverview(id, options = {}) {
  return useQuery({
    queryKey: studentKeys.overview(id),
    queryFn: () => studentApi.fetchStudentOverview(id),
    enabled: Boolean(id),
    ...options,
  });
}

export function useStudentAttendanceHomework(id, courseId, options = {}) {
  return useQuery({
    queryKey: studentKeys.attendanceHomework(id, courseId),
    queryFn: () =>
      studentApi.fetchStudentAttendanceHomework(id, courseId ? { courseId } : {}),
    enabled: Boolean(id),
    ...options,
  });
}

const patchFollowUps = (data, id, followUps) => {
  const patchList = (list) =>
    Array.isArray(list)
      ? list.map((s) =>
          s._id === id ? { ...s, followUps: { ...s.followUps, ...followUps } } : s
        )
      : list;
  return {
    ...data,
    registered: patchList(data.registered),
    enrolled: patchList(data.enrolled),
    demo: patchList(data.demo),
  };
};

export function useUpdateStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => studentApi.updateStudent(id, payload),
    onMutate: async ({ id, payload }) => {
      if (!payload?.followUps) return {};
      const queryKey = studentKeys.byType(undefined);
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      if (previous) {
        queryClient.setQueryData(queryKey, patchFollowUps(previous, id, payload.followUps));
      }
      return { previous, queryKey };
    },
    onError: (err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
      const hint = err.response?.data?.hint;
      toast.error(hint ? `${err.message} ${hint}` : err.message);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: studentKeys.all }),
  });
}
