import { Pressable, Text, View } from "react-native";

export function Chip({
  label,
  selected,
  onPress,
  tone = "sage",
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  tone?: "sage" | "terracotta";
}) {
  const selectedClasses =
    tone === "sage"
      ? "bg-sage-500 border-sage-500"
      : "bg-terracotta-400 border-terracotta-400";
  const unselectedClasses = "bg-transparent border-ink-100";
  const textSelected = "text-white";
  const textUnselected = "text-ink-600";

  const Wrapper = onPress ? Pressable : View;

  return (
    <Wrapper
      onPress={onPress}
      className={`rounded-pill border px-3.5 py-1.5 ${
        selected ? selectedClasses : unselectedClasses
      }`}
    >
      <Text className={`text-sm font-medium ${selected ? textSelected : textUnselected}`}>
        {label}
      </Text>
    </Wrapper>
  );
}
