import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createFoodCategory, deleteFoodCategory, fetchFoodCategories, setFoodCategory } from "@/lib/api";
import { useAuth } from "@/lib/AuthProvider";

export function useFoodCategoriesQuery() {
  return useQuery({ queryKey: ["foodCategories"], queryFn: fetchFoodCategories });
}

export function useCreateFoodCategoryMutation() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    mutationFn: (name: string) => createFoodCategory(session!.user.id, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["foodCategories"] }),
  });
}

export function useDeleteFoodCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteFoodCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["foodCategories"] });
      queryClient.invalidateQueries({ queryKey: ["foods"] });
    },
  });
}

export function useSetFoodCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { foodId: string; categoryId: string | null }) =>
      setFoodCategory(vars.foodId, vars.categoryId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["foods"] }),
  });
}
