import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { RecipeThumbnail } from "@/components/ui/RecipeThumbnail";
import { formatDate, isCurrentDiet, lastCookedOn, timesCooked } from "@/lib/recipeStats";
import { RecipeWithDetails } from "@/lib/types";

export function RecipeCard({ recipe }: { recipe: RecipeWithDetails }) {
  const inDiet = isCurrentDiet(recipe);
  const cooked = timesCooked(recipe);
  const lastCooked = lastCookedOn(recipe);

  return (
    <Link href={`/recipe/${recipe.id}`} asChild>
      <Pressable className="mb-3 flex-row gap-3 rounded-card bg-white p-3 shadow-sm shadow-ink-900/5 active:opacity-70">
        <RecipeThumbnail uri={recipe.photo_url} className="h-20 w-20 rounded-2xl" />
        <View className="flex-1 justify-center">
          <View className="mb-1 flex-row items-center gap-2">
            <Text className="flex-1 text-base font-semibold text-ink-800" numberOfLines={1}>
              {recipe.name}
            </Text>
            {inDiet && (
              <View className="h-2 w-2 rounded-full bg-sage-500" />
            )}
          </View>
          {recipe.tags.length > 0 && (
            <Text className="mb-1 text-xs text-ink-400" numberOfLines={1}>
              {recipe.tags.map((t) => t.name).join(" · ")}
            </Text>
          )}
          <Text className="text-xs text-ink-400">
            {cooked === 0
              ? "Not cooked yet"
              : `Cooked ${cooked}× · last ${lastCooked ? formatDate(lastCooked) : "—"}`}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}
