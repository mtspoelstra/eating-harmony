import { useMemo, useState } from "react";
import { Alert, FlatList, Pressable, Text, View } from "react-native";
import { SymbolView } from "expo-symbols";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { TextField } from "@/components/ui/TextField";
import { useAddFoodMutation, useFoodsQuery, useSetFoodCurrentMutation } from "@/hooks/useFoods";
import { Food } from "@/lib/types";

type ViewMode = "current" | "all";

export default function FoodsScreen() {
  const { data: foods, isLoading } = useFoodsQuery();
  const addFood = useAddFoodMutation();
  const setCurrent = useSetFoodCurrentMutation();
  const [name, setName] = useState("");
  const [mode, setMode] = useState<ViewMode>("current");

  const list = useMemo(() => {
    const sorted = [...(foods ?? [])].sort((a, b) => a.name.localeCompare(b.name));
    return mode === "current" ? sorted.filter((f) => f.is_current) : sorted;
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

  const onRemove = (food: Food) => {
    Alert.alert(
      `Remove ${food.name}?`,
      "Recipes using this ingredient will move out of Current Diet, but stay in All Recipes.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => setCurrent.mutate({ foodId: food.id, isCurrent: false }),
        },
      ]
    );
  };

  const onRestore = (food: Food) => {
    setCurrent.mutate({ foodId: food.id, isCurrent: true });
  };

  return (
    <View className="flex-1 bg-cream-50 px-5 pt-2">
      <View className="mb-4 flex-row rounded-pill bg-ink-100 p-1">
        <SegmentButton label="Current Foods" active={mode === "current"} onPress={() => setMode("current")} />
        <SegmentButton label="All Foods" active={mode === "all"} onPress={() => setMode("all")} />
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
                  : "Every food you've ever added shows up here, even ones you're not currently eating."
              }
            />
          ) : null
        }
        renderItem={({ item }) => (
          <Card className="flex-row items-center justify-between py-3.5">
            <Text className="text-base font-medium text-ink-800">{item.name}</Text>
            {item.is_current ? (
              <Pressable
                onPress={() => onRemove(item)}
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
            ) : (
              <Pressable
                onPress={() => onRestore(item)}
                hitSlop={10}
                className="rounded-full p-1.5 active:bg-sage-100"
              >
                <SymbolView
                  name="plus.circle"
                  fallback={null}
                  tintColor="#5A7A4B"
                  size={20}
                />
              </Pressable>
            )}
          </Card>
        )}
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
