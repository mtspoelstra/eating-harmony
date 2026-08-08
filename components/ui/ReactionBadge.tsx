import { Text, View } from "react-native";

import { Reaction } from "@/lib/types";

const REACTION_META: Record<Reaction, { label: string; bg: string; text: string }> = {
  great: { label: "Felt great", bg: "bg-sage-100", text: "text-sage-700" },
  okay: { label: "Felt okay", bg: "bg-cream-300", text: "text-terracotta-600" },
  rough: { label: "Rough day", bg: "bg-terracotta-100", text: "text-terracotta-600" },
};

export function ReactionBadge({ reaction }: { reaction: Reaction }) {
  const meta = REACTION_META[reaction];
  return (
    <View className={`self-start rounded-pill px-3 py-1 ${meta.bg}`}>
      <Text className={`text-xs font-semibold ${meta.text}`}>{meta.label}</Text>
    </View>
  );
}

export const REACTION_OPTIONS: { value: Reaction; label: string; emoji: string }[] = [
  { value: "great", label: "Felt great", emoji: "🌿" },
  { value: "okay", label: "Felt okay", emoji: "🌤️" },
  { value: "rough", label: "Rough day", emoji: "🍂" },
];
