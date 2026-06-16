import { useQuery } from "@tanstack/react-query";
import * as studentApi from "../api/studentApi";

export const studentKeys = {
  all: ["students"],
  byType: (type) => [...studentKeys.all, "byType", type ?? "all"],
  detail: (id) => [...studentKeys.all, "detail", id],
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
