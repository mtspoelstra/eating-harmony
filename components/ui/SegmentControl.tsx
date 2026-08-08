import { Pressable, Text, View } from "react-native";

export function SegmentControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <View className="flex-row rounded-pill bg-ink-100 p-1">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            className="flex-1 items-center rounded-pill py-2"
            style={active ? styles.activeBg : undefined}
          >
            <Text className="text-sm font-semibold" style={active ? styles.activeText : styles.inactiveText}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = {
  activeBg: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#211F1A",
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  activeText: { color: "#BC5A2C" },
  inactiveText: { color: "#8A8477" },
} as const;
