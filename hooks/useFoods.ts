import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  addOrRestoreFood,
  countRecipesUsingFood,
  deleteFood,
  fetchFoods,
  updateFoodStatus,
} from "@/lib/api";
import { useAuth } from "@/lib/AuthProvider";
import { FoodStatus } from "@/lib/types";

export function useFoodsQuery() {
  return useQuery({ queryKey: ["foods"], queryFn: fetchFoods });
}

export function useAddFoodMutation() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    mutationFn: (vars: { name: string; status?: FoodStatus }) =>
      addOrRestoreFood(session!.user.id, vars.name, vars.status ?? "current"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["foods"] });
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
    },
  });
}

export function useUpdateFoodStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { foodId: string; status: FoodStatus }) =>
      updateFoodStatus(vars.foodId, vars.status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["foods"] });
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
    },
  });
}

export function useDeleteFoodMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (foodId: string) => deleteFood(foodId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["foods"] });
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      queryClient.invalidateQueries({ queryKey: ["cookLogs"] });
    },
  });
}

export { countRecipesUsingFood };
