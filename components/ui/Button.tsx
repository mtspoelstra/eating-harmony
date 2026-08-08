import { ActivityIndicator, Pressable, Text } from "react-native";

type Variant = "primary" | "secondary" | "ghost";

const VARIANT_STYLES: Record<Variant, { container: string; text: string }> = {
  primary: { container: "bg-terracotta-400 active:bg-terracotta-500", text: "text-white" },
  secondary: { container: "bg-sage-100 active:bg-sage-200", text: "text-sage-700" },
  ghost: { container: "bg-transparent active:bg-ink-100", text: "text-ink-800" },
};

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
}) {
  const styles = VARIANT_STYLES[variant];
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={`flex-row items-center justify-center rounded-pill px-6 py-3.5 ${styles.container} ${
        isDisabled ? "opacity-50" : ""
      }`}
    >
      {loading && <ActivityIndicator className="mr-2" color="#fff" />}
      <Text className={`text-base font-semibold ${styles.text}`}>{label}</Text>
    </Pressable>
  );
}
