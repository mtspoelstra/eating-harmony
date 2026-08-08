import { useMutation } from "@tanstack/react-query";

import { generateRecipe } from "@/lib/api";
import { GenerateRecipeParams } from "@/lib/types";

export function useGenerateRecipeMutation() {
  return useMutation({
    mutationFn: (params: GenerateRecipeParams) => generateRecipe(params),
  });
}
