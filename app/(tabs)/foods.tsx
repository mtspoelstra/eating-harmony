import { useMemo, useState } from "react";
import { Alert, FlatList, Pressable, Text, View } from "react-native";
import { SymbolView } from "expo-symbols";

import { CategoryManagerModal } from "@/components/CategoryManagerModal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentControl } from "@/components/ui/SegmentControl";
import { TextField } from "@/components/ui/TextField";
import { useFoodCategoriesQuery, useSetFoodCategoryMutation } from "@/hooks/useFoodCategories";
import {
  countRecipesUsingFood,
  useAddFoodMutation,
  useDeleteFoodMutation,
  useFoodsQuery,
  useUpdateFoodStatusMutation,
} from "@/hooks/useFoods";
import { Food, FoodStatus } from "@/lib/types";

type ListItem =
  | { type: "header"; id: string; name: string; count: number; collapsed: boolean }
  | { type: "food"; food: Food };

const STATUS_LABELS: Record<FoodStatus, string> = {
  current: "Current",
  paused: "Paused",
  exception: "Exceptions",
};

const ADD_PLACEHOLDER: Record<FoodStatus, string> = {
  current: "Add a food you're eating now",
  paused: "Add a food you're pausing",
  exception: "Add an exception food",
};

export default function FoodsScreen() {
  const { data: foods, isLoading } = useFoodsQuery();
  const { data: categories } = useFoodCategoriesQuery();
  const addFood = useAddFoodMutation();
  const updateStatus = useUpdateFoodStatusMutation();
  const deleteFood = useDeleteFoodMutation();
  const setCategory = useSetFoodCategoryMutation();
  const [name, setName] = useState("");
  const [status, setStatus] = useState<FoodStatus>("current");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selectedFoodId, setSelectedFoodId] = useState<string | null>(null);
  const [managerOpen, setManagerOpen] = useState(false);

  const list = useMemo(
    () =>
      [...(foods ?? [])]
        .filter((f) => f.status === status)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [foods, status]
  );

  const selectedFood = list.find((f) => f.id === selectedFoodId) ?? null;

  const items = useMemo<ListItem[]>(() => {
    const byCategory = new Map<string, Food[]>();
    const uncategorized: Food[] = [];
    for (const food of list) {
      const cat = food.categories[0];
      if (!cat) {
        uncategorized.push(food);
      } else {
        const arr = byCategory.get(cat.id) ?? [];
        arr.push(food);
        byCategory.set(cat.id, arr);
      }
    }

    const result: ListItem[] = [];
    for (const cat of categories ?? []) {
      const inCategory = byCategory.get(cat.id) ?? [];
      const isCollapsed = collapsed.has(cat.id);
      result.push({
        type: "header",
        id: cat.id,
        name: cat.name,
        count: inCategory.length,
        collapsed: isCollapsed,
      });
      if (!isCollapsed) inCategory.forEach((food) => result.push({ type: "food", food }));
    }
    if (uncategorized.length > 0) {
      const isCollapsed = collapsed.has("uncategorized");
      result.push({
        type: "header",
        id: "uncategorized",
        name: "Uncategorized",
        count: uncategorized.length,
        collapsed: isCollapsed,
      });
      if (!isCollapsed) uncategorized.forEach((food) => result.push({ type: "food", food }));
    }
    return result;
  }, [list, categories, collapsed]);

  const toggleCollapsed = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onHeaderPress = (headerId: string) => {
    if (selectedFoodId) {
      setCategory.mutate({
        foodId: selectedFoodId,
        categoryId: headerId === "uncategorized" ? null : headerId,
      });
      setSelectedFoodId(null);
    } else {
      toggleCollapsed(headerId);
    }
  };

  const onAdd = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setName("");
    try {
      await addFood.mutateAsync({ name: trimmed, status });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't add that food.";
      Alert.alert("Couldn't add food", message);
    }
  };

  const onChangeStatus = (food: Food) => {
    const options: { label: string; value: FoodStatus }[] = (
      ["current", "paused", "exception"] as FoodStatus[]
    )
      .filter((s) => s !== food.status)
      .map((s) => ({ label: `Move to ${STATUS_LABELS[s]}`, value: s }));

    Alert.alert(food.name, "Where should this food live?", [
      ...options.map((opt) => ({
        text: opt.label,
        onPress: () => updateStatus.mutate({ foodId: food.id, status: opt.value }),
      })),
      { text: "Cancel", style: "cancel" as const },
    ]);
  };

  const onDelete = async (food: Food) => {
    let usedBy = 0;
    try {
      usedBy = await countRecipesUsingFood(food.id);
    } catch {
      // If the check fails, still warn -- just without a count.
      usedBy = -1;
    }

    const warning =
      usedBy > 0
        ? `${food.name} is used in ${usedBy} recipe${usedBy === 1 ? "" : "s"}. Deleting it removes it from ${
            usedBy === 1 ? "that recipe" : "those recipes"
          } too. This can't be undone.`
        : usedBy === -1
          ? `${food.name} will be permanently deleted, and removed from any recipe using it. This can't be undone.`
          : `${food.name} will be permanently deleted. This can't be undone.`;

    Alert.alert(`Delete ${food.name}?`, warning, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteFood.mutate(food.id) },
    ]);
  };

  return (
    <View className="flex-1 bg-cream-50 px-5 pt-2">
      <View className="mb-4">
        <SegmentControl
          value={status}
          onChange={(v) => {
            setStatus(v);
            setSelectedFoodId(null);
          }}
          options={[
            { value: "current", label: "Current" },
            { value: "paused", label: "Paused" },
            { value: "exception", label: "Exceptions" },
          ]}
        />
      </View>

      <View className="flex-row items-end gap-3 pb-3">
        <TextField
          className="flex-1"
          label={ADD_PLACEHOLDER[status]}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Sweet potato"
          returnKeyType="done"
          onSubmitEditing={onAdd}
        />
        <Button label="Add" onPress={onAdd} loading={addFood.isPending} />
      </View>

      <Pressable onPress={() => setManagerOpen(true)} className="mb-3 self-start">
        <Text className="text-sm font-semibold text-sage-600">Manage categories</Text>
      </Pressable>

      {selectedFood && (
        <View className="mb-3 flex-row items-center justify-between rounded-2xl bg-terracotta-50 px-4 py-2.5">
          <Text className="flex-1 text-sm font-medium text-terracotta-600">
            Assigning "{selectedFood.name}" — tap a category below
          </Text>
          <Pressable onPress={() => setSelectedFoodId(null)} hitSlop={8}>
            <Text className="text-sm font-semibold text-ink-600">Cancel</Text>
          </Pressable>
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(item, i) =>
          item.type === "header" ? `h-${item.id}` : `f-${item.food.id}-${i}`
        }
        contentContainerClassName="gap-2 pb-10"
        showsVerticalScrollIndicator={false}
        extraData={selectedFoodId}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              emoji={status === "exception" ? "⚠️" : "🥕"}
              title={
                status === "current"
                  ? "Nothing here yet"
                  : status === "paused"
                    ? "Nothing paused"
                    : "No exceptions"
              }
              subtitle={
                status === "current"
                  ? "Add the foods you're currently eating and tolerating well — recipes made entirely from this list show up under Current Diet."
                  : status === "paused"
                    ? "Foods you usually tolerate but are taking a break from live here. Move one back to Current any time."
                    : "Ingredients a recipe calls for that aren't part of your diet show up here."
              }
            />
          ) : null
        }
        renderItem={({ item, index }) =>
          item.type === "header" ? (
            <Pressable
              onPress={() => onHeaderPress(item.id)}
              className={`flex-row items-center justify-between rounded-xl px-2 py-2 ${
                index === 0 ? "mt-0" : "mt-2"
              } ${selectedFoodId ? "bg-sage-100" : ""}`}
            >
              <Text
                className={`text-sm font-bold uppercase tracking-wide ${
                  selectedFoodId ? "text-sage-700" : "text-ink-400"
                }`}
              >
                {item.name} · {item.count}
              </Text>
              <SymbolView
                name={
                  selectedFoodId
                    ? "checkmark.circle"
                    : item.collapsed
                      ? "chevron.down"
                      : "chevron.up"
                }
                fallback={null}
                tintColor={selectedFoodId ? "#5A7A4B" : "#8A8477"}
                size={14}
              />
            </Pressable>
          ) : (
            <Card
              className={`flex-row items-center justify-between border py-3 ${
                item.food.id === selectedFoodId
                  ? "border-terracotta-400 bg-terracotta-50"
                  : "border-transparent"
              }`}
            >
              <Pressable
                className="flex-1"
                onPress={() =>
                  setSelectedFoodId((prev) => (prev === item.food.id ? null : item.food.id))
                }
              >
                <Text className="text-base font-medium text-ink-800">{item.food.name}</Text>
                <Text className="mt-0.5 text-xs text-ink-400">
                  {item.food.categories[0]?.name ?? "Uncategorized"}
                </Text>
              </Pressable>
              <View className="flex-row items-center gap-1">
                <Pressable
                  onPress={() => onChangeStatus(item.food)}
                  hitSlop={10}
                  className="rounded-full p-1.5 active:bg-sage-100"
                >
                  <SymbolView
                    name="arrow.left.arrow.right"
                    fallback={null}
                    tintColor="#5A7A4B"
                    size={18}
                  />
                </Pressable>
                <Pressable
                  onPress={() => onDelete(item.food)}
                  hitSlop={10}
                  className="rounded-full p-1.5 active:bg-ink-100"
                >
                  <SymbolView name="trash" fallback={null} tintColor="#BC5A2C" size={19} />
                </Pressable>
              </View>
            </Card>
          )
        }
      />

      <CategoryManagerModal visible={managerOpen} onClose={() => setManagerOpen(false)} />
    </View>
  );
}
