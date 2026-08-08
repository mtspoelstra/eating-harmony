import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchTags, findOrCreateTag } from "@/lib/api";
import { useAuth } from "@/lib/AuthProvider";

export function useTagsQuery() {
  return useQuery({ queryKey: ["tags"], queryFn: fetchTags });
}

export function useFindOrCreateTagMutation() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    mutationFn: (name: string) => findOrCreateTag(session!.user.id, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tags"] }),
  });
}
