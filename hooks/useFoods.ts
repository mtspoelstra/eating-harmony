import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { addOrRestoreFood, fetchFoods, removeFoodFromCurrent } from "@/lib/api";
import { useAuth } from "@/lib/AuthProvider";

export function useFoodsQuery() {
  return useQuery({ queryKey: ["foods"], queryFn: fetchFoods });
}

export function useAddFoodMutation() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    mutationFn: (name: string) => addOrRestoreFood(session!.user.id, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["foods"] }),
  });
}

export function useRemoveFoodMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (foodId: string) => removeFoodFromCurrent(foodId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["foods"] });
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
    },
  });
}
