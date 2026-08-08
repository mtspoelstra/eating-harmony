import { Link } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, Text, View } from "react-native";

import { RecipeCard } from "@/components/RecipeCard";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { useRecipesQuery } from "@/hooks/useRecipes";
import { useTagsQuery } from "@/hooks/useTags";
import { isCurrentDiet } from "@/lib/recipeStats";

type ViewMode = "current" | "all";

export default function RecipesScreen() {
  const { data: recipes, isLoading } = useRecipesQuery();
  const { data: tags } = useTagsQuery();
  const [mode, setMode] = useState<ViewMode>("current");
  const [activeTagId, setActiveTagId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = recipes ?? [];
    if (mode === "current") list = list.filter(isCurrentDiet);
    if (activeTagId) list = list.filter((r) => r.tags.some((t) => t.id === activeTagId));
    return list;
  }, [recipes, mode, activeTagId]);

  const usedTags = useMemo(() => {
    const idsInUse = new Set((recipes ?? []).flatMap((r) => r.tags.map((t) => t.id)));
    return (tags ?? []).filter((t) => idsInUse.has(t.id));
  }, [recipes, tags]);

  return (
    <View className="flex-1 bg-cream-50">
      <View className="px-5 pb-3 pt-2">
        <View className="mb-3 flex-row items-center justify-between">
          <View className="flex-1 flex-row rounded-pill bg-ink-100 p-1">
            <SegmentButton
              label="Current Diet"
              active={mode === "current"}
              onPress={() => setMode("current")}
            />
            <SegmentButton
              label="All Recipes"
              active={mode === "all"}
              onPress={() => setMode("all")}
            />
          </View>
          <Link href="/recipe/new" asChild>
            <Pressable className="ml-3 h-11 w-11 items-center justify-center rounded-full bg-terracotta-400 active:bg-terracotta-500">
              <SymbolView name="plus" fallback={null} tintColor="#fff" size={22} />
            </Pressable>
          </Link>
        </View>

        {usedTags.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2 pr-4"
          >
            <Chip
              label="All tags"
              tone="terracotta"
              selected={activeTagId === null}
              onPress={() => setActiveTagId(null)}
            />
            {usedTags.map((tag) => (
              <Chip
                key={tag.id}
                label={tag.name}
                tone="terracotta"
                selected={activeTagId === tag.id}
                onPress={() => setActiveTagId(tag.id === activeTagId ? null : tag.id)}
              />
            ))}
          </ScrollView>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-5 pb-10"
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => <RecipeCard recipe={item} />}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              emoji={mode === "current" ? "🌱" : "📖"}
              title={mode === "current" ? "Nothing matches your current foods yet" : "No recipes yet"}
              subtitle={
                mode === "current"
                  ? "Add ingredients to My Foods, or add a recipe made entirely from what you're already eating."
                  : "Tap + to add your first recipe — it'll show here, and under Current Diet once every ingredient is on your list."
              }
            />
          ) : null
        }
      />
    </View>
  );
}

function SegmentButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 items-center rounded-pill py-2 ${active ? "bg-white shadow-sm shadow-ink-900/10" : ""}`}
    >
      <Text className={`text-sm font-semibold ${active ? "text-terracotta-500" : "text-ink-400"}`}>
        {label}
      </Text>
    </Pressable>
  );
}
