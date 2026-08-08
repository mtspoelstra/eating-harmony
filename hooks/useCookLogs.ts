import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { addCookLog, deleteCookLog, fetchAllCookLogs } from "@/lib/api";
import { useAuth } from "@/lib/AuthProvider";
import { Reaction } from "@/lib/types";

export function useAllCookLogsQuery() {
  return useQuery({ queryKey: ["cookLogs"], queryFn: fetchAllCookLogs });
}

export function useAddCookLogMutation(recipeId: string) {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    mutationFn: (entry: { cooked_on: string; reaction: Reaction; notes: string | null }) =>
      addCookLog(session!.user.id, recipeId, entry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipe", recipeId] });
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      queryClient.invalidateQueries({ queryKey: ["cookLogs"] });
    },
  });
}

export function useDeleteCookLogMutation(recipeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCookLog(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipe", recipeId] });
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      queryClient.invalidateQueries({ queryKey: ["cookLogs"] });
    },
  });
}
