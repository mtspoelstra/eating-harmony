import { Text, View } from "react-native";

export function EmptyState({ emoji, title, subtitle }: { emoji: string; title: string; subtitle: string }) {
  return (
    <View className="flex-1 items-center justify-center px-10 py-20">
      <Text className="mb-3 text-5xl">{emoji}</Text>
      <Text className="mb-1.5 text-center text-lg font-semibold text-ink-800">{title}</Text>
      <Text className="text-center text-sm leading-5 text-ink-400">{subtitle}</Text>
    </View>
  );
}
