import { useMemo, useState } from "react";
import { Alert, FlatList, Pressable, Text, View } from "react-native";
import { SymbolView } from "expo-symbols";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { TextField } from "@/components/ui/TextField";
import { useAddFoodMutation, useFoodsQuery, useRemoveFoodMutation } from "@/hooks/useFoods";
import { Food } from "@/lib/types";

export default function FoodsScreen() {
  const { data: foods, isLoading } = useFoodsQuery();
  const addFood = useAddFoodMutation();
  const removeFood = useRemoveFoodMutation();
  const [name, setName] = useState("");

  const currentFoods = useMemo(
    () => (foods ?? []).filter((f) => f.is_current).sort((a, b) => a.name.localeCompare(b.name)),
    [foods]
  );

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
          onPress: () => removeFood.mutate(food.id),
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-cream-50 px-5 pt-4">
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
        data={currentFoods}
        keyExtractor={(item) => item.id}
        contentContainerClassName="gap-2.5 pb-10"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              emoji="🥕"
              title="Nothing here yet"
              subtitle="Add the foods you're currently eating and tolerating well — recipes made entirely from this list will show up under Current Diet."
            />
          ) : null
        }
        renderItem={({ item }) => (
          <Card className="flex-row items-center justify-between py-3.5">
            <Text className="text-base font-medium text-ink-800">{item.name}</Text>
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
          </Card>
        )}
      />
    </View>
  );
}
