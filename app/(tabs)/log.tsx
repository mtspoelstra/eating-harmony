import { useRouter } from "expo-router";
import { useMemo } from "react";
import { FlatList, Pressable, Text, View } from "react-native";

import { EmptyState } from "@/components/ui/EmptyState";
import { ReactionBadge } from "@/components/ui/ReactionBadge";
import { RecipeThumbnail } from "@/components/ui/RecipeThumbnail";
import { useAllCookLogsQuery } from "@/hooks/useCookLogs";
import { CookLogWithRecipe } from "@/lib/types";

type ListItem = { type: "header"; label: string } | { type: "entry"; log: CookLogWithRecipe };

function friendlyDate(iso: string): string {
  const today = new Date();
  const target = new Date(`${iso}T00:00:00`);
  const todayIso = today.toISOString().slice(0, 10);
  const yesterdayIso = new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  if (iso === todayIso) return "Today";
  if (iso === yesterdayIso) return "Yesterday";
  return target.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

export default function LogScreen() {
  const router = useRouter();
  const { data: logs, isLoading } = useAllCookLogsQuery();

  const items = useMemo<ListItem[]>(() => {
    if (!logs) return [];
    const result: ListItem[] = [];
    let lastDate: string | null = null;
    for (const log of logs) {
      if (log.cooked_on !== lastDate) {
        result.push({ type: "header", label: friendlyDate(log.cooked_on) });
        lastDate = log.cooked_on;
      }
      result.push({ type: "entry", log });
    }
    return result;
  }, [logs]);

  return (
    <View className="flex-1 bg-cream-50">
      <FlatList
        data={items}
        keyExtractor={(item, i) => (item.type === "header" ? `h-${item.label}-${i}` : item.log.id)}
        contentContainerClassName="px-5 pb-10 pt-2"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              emoji="📅"
              title="No meals logged yet"
              subtitle="Every time you log a cook from a recipe, it shows up here — most recent first."
            />
          ) : null
        }
        renderItem={({ item, index }) =>
          item.type === "header" ? (
            <Text
              className={`mb-2.5 text-sm font-bold uppercase tracking-wide text-ink-400 ${
                index === 0 ? "mt-0" : "mt-4"
              }`}
            >
              {item.label}
            </Text>
          ) : (
            <Pressable
              onPress={() => router.push(`/recipe/${item.log.recipe.id}`)}
              className="mb-2.5 flex-row items-center gap-3 rounded-card bg-white p-3 shadow-sm shadow-ink-900/5 active:opacity-70"
            >
              <RecipeThumbnail uri={item.log.recipe.photo_url} className="h-14 w-14 rounded-2xl" />
              <View className="flex-1">
                <Text className="mb-1 text-base font-semibold text-ink-800" numberOfLines={1}>
                  {item.log.recipe.name}
                </Text>
                <ReactionBadge reaction={item.log.reaction} />
                {item.log.notes && (
                  <Text className="mt-1 text-xs leading-4 text-ink-400" numberOfLines={2}>
                    {item.log.notes}
                  </Text>
                )}
              </View>
            </Pressable>
          )
        }
      />
    </View>
  );
}
