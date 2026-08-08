import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { addOrRestoreFood, fetchFoods, updateFoodBucket } from "@/lib/api";
import { useAuth } from "@/lib/AuthProvider";

export function useFoodsQuery() {
  return useQuery({ queryKey: ["foods"], queryFn: fetchFoods });
}

export function useAddFoodMutation() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    mutationFn: (name: string) => addOrRestoreFood(session!.user.id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["foods"] });
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
    },
  });
}

export function useUpdateFoodBucketMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { foodId: string; is_current: boolean; is_all_foods: boolean }) =>
      updateFoodBucket(vars.foodId, { is_current: vars.is_current, is_all_foods: vars.is_all_foods }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["foods"] });
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
    },
  });
}
