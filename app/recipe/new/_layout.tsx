import { Stack } from "expo-router";

export default function NewRecipeLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#FDF8EF" },
        headerTintColor: "#332F28",
        headerShadowVisible: false,
        contentStyle: { backgroundColor: "#FDF8EF" },
      }}
    >
      <Stack.Screen name="index" options={{ title: "New Recipe" }} />
      <Stack.Screen name="manual" options={{ title: "New Recipe" }} />
      <Stack.Screen name="generate" options={{ title: "Generate with AI" }} />
    </Stack>
  );
}
