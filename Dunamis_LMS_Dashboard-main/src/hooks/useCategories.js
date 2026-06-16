import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as categoryApi from "../api/categoryApi";

// Centralised query keys so every cache read/invalidate references the same key.
export const categoryKeys = {
  all: ["categories"],
  lists: () => [...categoryKeys.all, "list"],
};

export function useCategoriesQuery(options = {}) {
  return useQuery({
    queryKey: categoryKeys.lists(),
    queryFn: categoryApi.fetchCategories,
    ...options,
  });
}

// Each mutation invalidates the category list on success so mounted consumers
// refetch automatically — replacing the manual slice splicing + reloads.

export function useCreateCategoryWithSubCategories() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: categoryApi.createCategoryWithSubCategories,
    onSuccess: () => qc.invalidateQueries({ queryKey: categoryKeys.lists() }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: categoryApi.updateCategory,
    onSuccess: () => qc.invalidateQueries({ queryKey: categoryKeys.lists() }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: categoryApi.deleteCategory,
    onSuccess: () => qc.invalidateQueries({ queryKey: categoryKeys.lists() }),
  });
}
