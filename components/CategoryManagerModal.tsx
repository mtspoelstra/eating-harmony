import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { Alert, Modal, Pressable, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import {
  useCreateFoodCategoryMutation,
  useDeleteFoodCategoryMutation,
  useFoodCategoriesQuery,
} from "@/hooks/useFoodCategories";

export function CategoryManagerModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { data: categories } = useFoodCategoriesQuery();
  const createCategory = useCreateFoodCategoryMutation();
  const deleteCategory = useDeleteFoodCategoryMutation();
  const [newName, setNewName] = useState("");

  const onCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    await createCategory.mutateAsync(trimmed);
    setNewName("");
  };

  const onDelete = (categoryId: string, name: string) => {
    Alert.alert(`Delete "${name}"?`, "Foods in this category won't be deleted, just uncategorized.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteCategory.mutate(categoryId) },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-ink-900/40" onPress={onClose}>
        <Pressable className="rounded-t-3xl bg-cream-50 p-5 pb-10" onPress={(e) => e.stopPropagation()}>
          <Text className="mb-1 text-lg font-bold text-ink-900">Manage categories</Text>
          <Text className="mb-4 text-sm text-ink-400">
            Add new categories here, or remove ones you don't need.
          </Text>

          <View className="gap-2">
            {(categories ?? []).map((cat) => (
              <View
                key={cat.id}
                className="flex-row items-center justify-between rounded-2xl border border-ink-100 bg-white px-4 py-3"
              >
                <Text className="text-base text-ink-800">{cat.name}</Text>
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
              onSubmitEditing={onCreate}
            />
            <Button label="Add" variant="secondary" onPress={onCreate} disabled={!newName.trim()} />
          </View>

          <View className="mt-4">
            <Button label="Done" variant="ghost" onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
