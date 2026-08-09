import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { RecipeThumbnail } from "@/components/ui/RecipeThumbnail";
import {
  exceptionCount,
  formatDate,
  isCurrentDiet,
  lastCookedOn,
  pausedCount,
  timesCooked,
} from "@/lib/recipeStats";
import { RecipeWithDetails } from "@/lib/types";

const MAX_DOTS = 4;

export function RecipeCard({ recipe }: { recipe: RecipeWithDetails }) {
  const router = useRouter();
  const inDiet = isCurrentDiet(recipe);
  const paused = pausedCount(recipe);
  const exceptions = exceptionCount(recipe);
  const cooked = timesCooked(recipe);
  const lastCooked = lastCookedOn(recipe);

  return (
    <Pressable
      onPress={() => router.push(`/recipe/${recipe.id}`)}
      className="mb-3 flex-row gap-3 rounded-card bg-white p-3 shadow-sm shadow-ink-900/5 active:opacity-70"
    >
      <RecipeThumbnail uri={recipe.photo_url} className="h-20 w-20 rounded-2xl" />
      <View className="flex-1 justify-center">
        <View className="mb-1 flex-row items-center gap-2">
          <Text className="flex-1 text-base font-semibold text-ink-800" numberOfLines={1}>
            {recipe.name}
          </Text>
          {inDiet ? (
            <View className="h-2 w-2 rounded-full bg-sage-500" />
          ) : (
            <View className="flex-row items-center gap-1">
              <DotGroup count={exceptions} className="bg-terracotta-500" />
              <DotGroup count={paused} className="bg-ink-100" />
            </View>
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
  );
}

/** Renders one dot per ingredient, collapsing to "N+" past MAX_DOTS so a
 *  recipe with many off-list ingredients doesn't overflow the card. */
function DotGroup({ count, className }: { count: number; className: string }) {
  if (count === 0) return null;
  if (count > MAX_DOTS) {
    return (
      <View className="flex-row items-center gap-0.5">
        <View className={`h-2 w-2 rounded-full ${className}`} />
        <Text className="text-[10px] font-semibold text-ink-400">{count}</Text>
      </View>
    );
  }
  return (
    <View className="flex-row items-center gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} className={`h-2 w-2 rounded-full ${className}`} />
      ))}
    </View>
  );
}
