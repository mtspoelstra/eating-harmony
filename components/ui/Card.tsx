import { View, ViewProps } from "react-native";

export function Card({ className = "", ...rest }: ViewProps & { className?: string }) {
  return (
    <View
      className={`rounded-card bg-white p-4 shadow-sm shadow-ink-900/5 ${className}`}
      {...rest}
    />
  );
}
