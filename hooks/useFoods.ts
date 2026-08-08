import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { addOrRestoreFood, fetchFoods, setFoodCurrent } from "@/lib/api";
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

export function useSetFoodCurrentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ foodId, isCurrent }: { foodId: string; isCurrent: boolean }) =>
      setFoodCurrent(foodId, isCurrent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["foods"] });
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
    },
  });
}
