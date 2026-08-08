import { useMemo, useState } from "react";
import { Alert, FlatList, Pressable, Text, View } from "react-native";
import { SymbolView } from "expo-symbols";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentControl } from "@/components/ui/SegmentControl";
import { TextField } from "@/components/ui/TextField";
import { useAddFoodMutation, useFoodsQuery, useUpdateFoodBucketMutation } from "@/hooks/useFoods";
import { Food } from "@/lib/types";

type ViewMode = "current" | "all";

export default function FoodsScreen() {
  const { data: foods, isLoading } = useFoodsQuery();
  const addFood = useAddFoodMutation();
  const updateBucket = useUpdateFoodBucketMutation();
  const [name, setName] = useState("");
  const [mode, setMode] = useState<ViewMode>("current");

  const list = useMemo(() => {
    const sorted = [...(foods ?? [])].sort((a, b) => a.name.localeCompare(b.name));
    return mode === "current"
      ? sorted.filter((f) => f.is_current)
      : sorted.filter((f) => f.is_all_foods);
  }, [foods, mode]);

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

      <View className="flex-row items-end gap-3 pb-4">
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

      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        contentContainerClassName="gap-2.5 pb-10"
        showsVerticalScrollIndicator={false}
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
        renderItem={({ item }) => (
          <Card className="flex-row items-center justify-between py-3.5">
            <Text className="flex-1 text-base font-medium text-ink-800">{item.name}</Text>
            <View className="flex-row items-center gap-1">
              <Pressable
                onPress={() => onMove(item)}
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
                onPress={() => onArchive(item)}
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
        )}
      />
    </View>
  );
}
