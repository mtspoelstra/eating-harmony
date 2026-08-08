import { useMemo, useState } from "react";
import { Text, View } from "react-native";

import { Chip } from "@/components/ui/Chip";
import { TextField } from "@/components/ui/TextField";

type Item = { id: string; name: string };

export function MultiSelectPicker<T extends Item>({
  label,
  items,
  selectedIds,
  onChange,
  onCreate,
  placeholder,
}: {
  label: string;
  items: T[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onCreate: (name: string) => Promise<T>;
  placeholder: string;
}) {
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  const selected = items.filter((i) => selectedIds.includes(i.id));
  const unselected = items.filter((i) => !selectedIds.includes(i.id));

  const filtered = useMemo(() => {
    if (!query.trim()) return unselected;
    return unselected.filter((i) => i.name.toLowerCase().includes(query.trim().toLowerCase()));
  }, [unselected, query]);

  const exactMatch = items.some((i) => i.name.toLowerCase() === query.trim().toLowerCase());

  const toggle = (id: string) => onChange([...selectedIds, id]);
  const remove = (id: string) => onChange(selectedIds.filter((s) => s !== id));

  const handleCreate = async () => {
    const name = query.trim();
    if (!name) return;
    setCreating(true);
    try {
      const item = await onCreate(name);
      onChange([...selectedIds, item.id]);
      setQuery("");
    } finally {
      setCreating(false);
    }
  };

  return (
    <View>
      <Text className="mb-1.5 text-sm font-medium text-ink-600">{label}</Text>

      {selected.length > 0 && (
        <View className="mb-2.5 flex-row flex-wrap gap-2">
          {selected.map((item) => (
            <Chip key={item.id} label={item.name} tone="terracotta" selected onPress={() => remove(item.id)} />
          ))}
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
            <Chip key={item.id} label={item.name} onPress={() => toggle(item.id)} />
          ))}
        </View>
      )}
    </View>
  );
}
