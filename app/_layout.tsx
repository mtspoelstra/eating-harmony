import "react-native-reanimated";
import "../global.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

import { AuthProvider, useAuth } from "@/lib/AuthProvider";

export { ErrorBoundary } from "expo-router";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

export default function RootLayout() {
  const [loaded, error] = useFonts({});

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function RootLayoutNav() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const onLoginScreen = segments[0] === "login";
    if (!session && !onLoginScreen) {
      router.replace("/login");
    } else if (session && onLoginScreen) {
      router.replace("/");
    }
  }, [session, loading, segments, router]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-cream-50">
        <ActivityIndicator color="#BC5A2C" size="large" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#FDF8EF" },
        headerTintColor: "#332F28",
        headerShadowVisible: false,
        contentStyle: { backgroundColor: "#FDF8EF" },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen
        name="recipe/new"
        options={{ title: "New Recipe", presentation: "modal" }}
      />
      <Stack.Screen
        name="recipe/[id]/edit"
        options={{ title: "Edit Recipe", presentation: "modal" }}
      />
      <Stack.Screen
        name="recipe/[id]/log"
        options={{ title: "Log a Cook", presentation: "modal" }}
      />
    </Stack>
  );
}
