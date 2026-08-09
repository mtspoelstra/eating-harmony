import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { Alert, Modal, Pressable, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import {
  useCreateFoodCategoryMutation,
  useDeleteFoodCategoryMutation,
  useFoodCategoriesQuery,
  useSetFoodCategoryMutation,
} from "@/hooks/useFoodCategories";
import { Food } from "@/lib/types";

export function CategoryPickerModal({
  food,
  onClose,
}: {
  food: Food | null;
  onClose: () => void;
}) {
  const { data: categories } = useFoodCategoriesQuery();
  const setCategory = useSetFoodCategoryMutation();
  const createCategory = useCreateFoodCategoryMutation();
  const deleteCategory = useDeleteFoodCategoryMutation();
  const [newName, setNewName] = useState("");

  const currentCategoryId = food?.categories[0]?.id ?? null;

  const choose = (categoryId: string | null) => {
    if (!food) return;
    setCategory.mutate({ foodId: food.id, categoryId });
    onClose();
  };

  const onCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const category = await createCategory.mutateAsync(trimmed);
    setNewName("");
    choose(category.id);
  };

  const onDelete = (categoryId: string, name: string) => {
    Alert.alert(`Delete "${name}"?`, "Foods in this category won't be deleted, just uncategorized.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteCategory.mutate(categoryId) },
    ]);
  };

  return (
    <Modal visible={!!food} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-ink-900/40" onPress={onClose}>
        <Pressable className="rounded-t-3xl bg-cream-50 p-5 pb-10" onPress={(e) => e.stopPropagation()}>
          <Text className="mb-1 text-lg font-bold text-ink-900">Category for {food?.name}</Text>
          <Text className="mb-4 text-sm text-ink-400">Organize your foods list into groups.</Text>

          <View className="gap-2">
            <Pressable
              onPress={() => choose(null)}
              className={`flex-row items-center justify-between rounded-2xl border px-4 py-3 ${
                currentCategoryId === null ? "border-terracotta-400 bg-terracotta-50" : "border-ink-100 bg-white"
              }`}
            >
              <Text className="text-base text-ink-800">Uncategorized</Text>
            </Pressable>
            {(categories ?? []).map((cat) => (
              <View
                key={cat.id}
                className={`flex-row items-center justify-between rounded-2xl border px-4 py-3 ${
                  currentCategoryId === cat.id ? "border-terracotta-400 bg-terracotta-50" : "border-ink-100 bg-white"
                }`}
              >
                <Pressable onPress={() => choose(cat.id)} className="flex-1">
                  <Text className="text-base text-ink-800">{cat.name}</Text>
                </Pressable>
                <Pressable onPress={() => onDelete(cat.id, cat.name)} hitSlop={8} className="p-1">
                  <SymbolView name="trash" fallback={null} tintColor="#BC5A2C" size={16} />
                </Pressable>
              </View>
            ))}
          </View>

          <View className="mt-4 flex-row items-end gap-3">
            <TextField
              className="flex-1"
              label="New category"
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. Beverages"
            />
            <Button label="Add" variant="secondary" onPress={onCreate} disabled={!newName.trim()} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
