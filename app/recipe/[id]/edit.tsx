import { useLocalSearchParams, useRouter } from "expo-router";
import { View } from "react-native";

import { RecipeForm } from "@/components/RecipeForm";
import { useRecipeQuery, useUpdateRecipeMutation } from "@/hooks/useRecipes";

export default function EditRecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: recipe, isLoading } = useRecipeQuery(id);
  const updateRecipe = useUpdateRecipeMutation(id);

  if (isLoading || !recipe) {
    return <View className="flex-1 bg-cream-50" />;
  }

  return (
    <RecipeForm
      initial={recipe}
      submitLabel="Save changes"
      submitting={updateRecipe.isPending}
      onSubmit={async (input) => {
        await updateRecipe.mutateAsync(input);
        router.back();
      }}
    />
  );
}
