import { useRouter } from "expo-router";

import { RecipeForm } from "@/components/RecipeForm";
import { useCreateRecipeMutation } from "@/hooks/useRecipes";

export default function ManualNewRecipeScreen() {
  const router = useRouter();
  const createRecipe = useCreateRecipeMutation();

  return (
    <RecipeForm
      submitLabel="Create recipe"
      submitting={createRecipe.isPending}
      onSubmit={async (input) => {
        const id = await createRecipe.mutateAsync(input);
        router.replace(`/recipe/${id}`);
      }}
    />
  );
}
