import { Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Alert, Pressable } from "react-native";

import { useAuth } from "@/lib/AuthProvider";

export default function TabLayout() {
  const { signOut } = useAuth();

  const confirmSignOut = () => {
    Alert.alert("Sign out?", undefined, [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => signOut() },
    ]);
  };

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#FDF8EF" },
        headerTitleStyle: { color: "#332F28", fontWeight: "700" },
        headerShadowVisible: false,
        headerRight: () => (
          <Pressable onPress={confirmSignOut} hitSlop={10} className="mr-4">
            <SymbolView
              name="rectangle.portrait.and.arrow.right"
              fallback={null}
              tintColor="#8A8477"
              size={20}
            />
          </Pressable>
        ),
        tabBarActiveTintColor: "#BC5A2C",
        tabBarInactiveTintColor: "#8A8477",
        tabBarStyle: {
          backgroundColor: "#FDF8EF",
          borderTopColor: "#E9E6E1",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Recipes",
          tabBarIcon: ({ color }) => (
            <SymbolView
              name="fork.knife"
              fallback={null}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="foods"
        options={{
          title: "My Foods",
          tabBarIcon: ({ color }) => (
            <SymbolView
              name="leaf.fill"
              fallback={null}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: "Cook Log",
          tabBarIcon: ({ color }) => (
            <SymbolView
              name="calendar"
              fallback={null}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
    </Tabs>
  );
}
