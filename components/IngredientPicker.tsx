import { SymbolView } from "expo-symbols";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Chip } from "@/components/ui/Chip";
import { TextField } from "@/components/ui/TextField";
import { RecipeIngredientInput } from "@/lib/api";
import { Food } from "@/lib/types";

export function IngredientPicker({
  label,
  items,
  value,
  onChange,
  onCreate,
  placeholder,
}: {
  label: string;
  items: Food[];
  value: RecipeIngredientInput[];
  onChange: (value: RecipeIngredientInput[]) => void;
  onCreate: (name: string) => Promise<Food>;
  placeholder: string;
}) {
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  const selectedIds = value.map((v) => v.foodId);
  const unselected = items.filter((i) => !selectedIds.includes(i.id));

  const filtered = useMemo(() => {
    if (!query.trim()) return unselected;
    return unselected.filter((i) => i.name.toLowerCase().includes(query.trim().toLowerCase()));
  }, [unselected, query]);

  const exactMatch = items.some((i) => i.name.toLowerCase() === query.trim().toLowerCase());

  const addFood = (food: Food) => onChange([...value, { foodId: food.id, quantity: null }]);
  const removeFood = (foodId: string) => onChange(value.filter((v) => v.foodId !== foodId));
  const setQuantity = (foodId: string, quantity: string) =>
    onChange(value.map((v) => (v.foodId === foodId ? { ...v, quantity } : v)));

  const handleCreate = async () => {
    const name = query.trim();
    if (!name) return;
    setCreating(true);
    try {
      const food = await onCreate(name);
      addFood(food);
      setQuery("");
    } finally {
      setCreating(false);
    }
  };

  return (
    <View>
      <Text className="mb-1.5 text-sm font-medium text-ink-600">{label}</Text>

      {value.length > 0 && (
        <View className="mb-3 gap-2">
          {value.map((v) => {
            const food = items.find((i) => i.id === v.foodId);
            return (
              <View key={v.foodId} className="flex-row items-center gap-2">
                <Text className="w-24 shrink-0 text-sm text-ink-800" numberOfLines={2}>
                  {food?.name ?? "…"}
                </Text>
                <TextField
                  className="flex-1"
                  value={v.quantity ?? ""}
                  onChangeText={(t) => setQuantity(v.foodId, t)}
                  placeholder="e.g. 2 cups"
                />
                <Pressable onPress={() => removeFood(v.foodId)} hitSlop={8} className="p-1">
                  <SymbolView
                    name="xmark.circle.fill"
                    fallback={null}
                    tintColor="#8A8477"
                    size={18}
                  />
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      <TextField value={query} onChangeText={setQuery} placeholder={placeholder} autoCapitalize="none" />

      {query.trim().length > 0 && !exactMatch && (
        <View className="mt-2">
          <Chip
            label={creating ? "Adding…" : `+ Add "${query.trim()}"`}
            tone="sage"
            onPress={creating ? undefined : handleCreate}
          />
        </View>
      )}

      {filtered.length > 0 && (
        <View className="mt-2.5 flex-row flex-wrap gap-2">
          {filtered.map((item) => (
            <Chip key={item.id} label={item.name} onPress={() => addFood(item)} />
          ))}
        </View>
      )}
    </View>
  );
}
