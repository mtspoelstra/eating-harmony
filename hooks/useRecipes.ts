import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createRecipe,
  deleteRecipe,
  fetchRecipe,
  fetchRecipes,
  RecipeInput,
  updateRecipe,
} from "@/lib/api";
import { useAuth } from "@/lib/AuthProvider";

export function useRecipesQuery() {
  return useQuery({ queryKey: ["recipes"], queryFn: fetchRecipes });
}

export function useRecipeQuery(id: string | undefined) {
  return useQuery({
    queryKey: ["recipe", id],
    queryFn: () => fetchRecipe(id as string),
    enabled: !!id,
  });
}

export function useCreateRecipeMutation() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    mutationFn: (input: RecipeInput) => createRecipe(session!.user.id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["recipes"] }),
  });
}

export function useUpdateRecipeMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RecipeInput) => updateRecipe(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      queryClient.invalidateQueries({ queryKey: ["recipe", id] });
    },
  });
}

export function useDeleteRecipeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRecipe(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["recipes"] }),
  });
}
