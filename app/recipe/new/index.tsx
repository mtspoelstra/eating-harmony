import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Pressable, Text, View } from "react-native";

export default function NewRecipeChoiceScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-cream-50 p-5">
      <ChoiceCard
        emoji="✍️"
        title="Add manually"
        subtitle="Type in your own recipe, step by step."
        icon="pencil"
        onPress={() => router.push("/recipe/new/manual")}
      />
      <ChoiceCard
        emoji="✨"
        title="Generate a recipe"
        subtitle="Let AI put together a recipe from your current foods."
        icon="sparkles"
        onPress={() => router.push("/recipe/new/generate")}
      />
    </View>
  );
}

function ChoiceCard({
  emoji,
  title,
  subtitle,
  icon,
  onPress,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  icon: "pencil" | "sparkles";
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="mb-4 flex-row items-center gap-4 rounded-card bg-white p-5 shadow-sm shadow-ink-900/5 active:opacity-70"
    >
      <View className="h-14 w-14 items-center justify-center rounded-2xl bg-sage-100">
        <Text className="text-2xl">{emoji}</Text>
      </View>
      <View className="flex-1">
        <Text className="mb-1 text-lg font-semibold text-ink-800">{title}</Text>
        <Text className="text-sm leading-5 text-ink-400">{subtitle}</Text>
      </View>
      <SymbolView name={icon} fallback={null} tintColor="#8A8477" size={18} />
    </Pressable>
  );
}
