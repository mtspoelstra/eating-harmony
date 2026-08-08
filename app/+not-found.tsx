import { Link, Stack } from "expo-router";
import { Text, View } from "react-native";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View className="flex-1 items-center justify-center gap-3 bg-cream-50 p-6">
        <Text className="text-lg font-semibold text-ink-800">This screen doesn't exist.</Text>
        <Link href="/" className="py-3">
          <Text className="text-base font-semibold text-terracotta-500">Go to home screen</Text>
        </Link>
      </View>
    </>
  );
}
