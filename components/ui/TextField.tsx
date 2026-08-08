import { Text, TextInput, TextInputProps, View } from "react-native";

export function TextField({
  label,
  className = "",
  ...rest
}: TextInputProps & { label?: string; className?: string }) {
  return (
    <View className={className}>
      {label && <Text className="mb-1.5 text-sm font-medium text-ink-600">{label}</Text>}
      <TextInput
        placeholderTextColor="#8A8477"
        className="rounded-2xl border border-ink-100 bg-white px-4 py-3.5 text-base text-ink-800"
        {...rest}
      />
    </View>
  );
}
