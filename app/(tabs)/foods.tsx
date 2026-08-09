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
import { useAddFoodMutation, useFoodsQuery, useUpdateFoodBucketMutation } from "@/hooks/useFoods";
import { Food } from "@/lib/types";

type ViewMode = "current" | "all";

type ListItem =
  | { type: "header"; id: string; name: string; count: number; collapsed: boolean }
  | { type: "food"; food: Food };

export default function FoodsScreen() {
  const { data: foods, isLoading } = useFoodsQuery();
  const { data: categories } = useFoodCategoriesQuery();
  const addFood = useAddFoodMutation();
  const updateBucket = useUpdateFoodBucketMutation();
  const setCategory = useSetFoodCategoryMutation();
  const [name, setName] = useState("");
  const [mode, setMode] = useState<ViewMode>("current");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selectedFoodId, setSelectedFoodId] = useState<string | null>(null);
  const [managerOpen, setManagerOpen] = useState(false);

  const list = useMemo(() => {
    const sorted = [...(foods ?? [])].sort((a, b) => a.name.localeCompare(b.name));
    return mode === "current"
      ? sorted.filter((f) => f.is_current)
      : sorted.filter((f) => f.is_all_foods);
  }, [foods, mode]);

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
      result.push({ type: "header", id: cat.id, name: cat.name, count: inCategory.length, collapsed: isCollapsed });
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
      setCategory.mutate({ foodId: selectedFoodId, categoryId: headerId === "uncategorized" ? null : headerId });
      setSelectedFoodId(null);
    } else {
      toggleCollapsed(headerId);
    }
  };

  const onFoodPress = (food: Food) => {
    setSelectedFoodId((prev) => (prev === food.id ? null : food.id));
  };

  const onAdd = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setName("");
    try {
      await addFood.mutateAsync(trimmed);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't add that food.";
      Alert.alert("Couldn't add food", message);
    }
  };

  const onArchive = (food: Food) => {
    Alert.alert(
      `Remove ${food.name}?`,
      "It'll be tucked away completely — recipes using it will move out of Current Diet. You can always re-add it later.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () =>
            updateBucket.mutate({ foodId: food.id, is_current: false, is_all_foods: false }),
        },
      ]
    );
  };

  const onMove = (food: Food) => {
    if (food.is_current) {
      updateBucket.mutate({ foodId: food.id, is_current: false, is_all_foods: true });
    } else {
      updateBucket.mutate({ foodId: food.id, is_current: true, is_all_foods: false });
    }
  };

  return (
    <View className="flex-1 bg-cream-50 px-5 pt-2">
      <View className="mb-4">
        <SegmentControl
          value={mode}
          onChange={setMode}
          options={[
            { value: "current", label: "Current Foods" },
            { value: "all", label: "All Foods" },
          ]}
        />
      </View>

      <View className="flex-row items-end gap-3 pb-3">
        <TextField
          className="flex-1"
          label="Add a food you're currently eating"
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
        keyExtractor={(item, i) => (item.type === "header" ? `h-${item.id}` : `f-${item.food.id}-${i}`)}
        contentContainerClassName="gap-2 pb-10"
        showsVerticalScrollIndicator={false}
        extraData={selectedFoodId}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              emoji="🥕"
              title={mode === "current" ? "Nothing here yet" : "No foods yet"}
              subtitle={
                mode === "current"
                  ? "Add the foods you're currently eating and tolerating well — recipes made entirely from this list will show up under Current Diet."
                  : "Foods you've moved out of Current Foods land here, so you can quickly bring them back later."
              }
            />
          ) : null
        }
        renderItem={({ item, index }) =>
          item.type === "header" ? (
            <Pressable
              onPress={() => onHeaderPress(item.id)}
              className={`flex-row items-center justify-between rounded-xl px-2 py-2 ${index === 0 ? "mt-0" : "mt-2"} ${
                selectedFoodId ? "bg-sage-100" : ""
              }`}
            >
              <Text
                className={`text-sm font-bold uppercase tracking-wide ${selectedFoodId ? "text-sage-700" : "text-ink-400"}`}
              >
                {item.name} · {item.count}
              </Text>
              <SymbolView
                name={selectedFoodId ? "checkmark.circle" : item.collapsed ? "chevron.down" : "chevron.up"}
                fallback={null}
                tintColor={selectedFoodId ? "#5A7A4B" : "#8A8477"}
                size={14}
              />
            </Pressable>
          ) : (
            <Card
              className={`flex-row items-center justify-between border py-3 ${
                item.food.id === selectedFoodId ? "border-terracotta-400 bg-terracotta-50" : "border-transparent"
              }`}
            >
              <Pressable className="flex-1" onPress={() => onFoodPress(item.food)}>
                <Text className="text-base font-medium text-ink-800">{item.food.name}</Text>
                <Text className="mt-0.5 text-xs text-ink-400">
                  {item.food.categories[0]?.name ?? "Uncategorized"}
                </Text>
              </Pressable>
              <View className="flex-row items-center gap-1">
                <Pressable
                  onPress={() => onMove(item.food)}
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
                  onPress={() => onArchive(item.food)}
                  hitSlop={10}
                  className="rounded-full p-1.5 active:bg-ink-100"
                >
                  <SymbolView
                    name="trash"
                    fallback={null}
                    tintColor="#BC5A2C"
                    size={19}
                  />
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
