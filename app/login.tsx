import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useAuth } from "@/lib/AuthProvider";

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isSignUp = mode === "signUp";

  const onSubmit = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Missing info", "Enter an email and password to continue.");
      return;
    }
    setSubmitting(true);
    try {
      if (isSignUp) {
        await signUp(email.trim(), password);
        Alert.alert(
          "Check your email",
          "We sent a confirmation link — confirm it, then sign in here."
        );
        setMode("signIn");
      } else {
        await signIn(email.trim(), password);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      Alert.alert(isSignUp ? "Couldn't sign up" : "Couldn't sign in", message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-cream-50"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerClassName="flex-1 justify-center px-7 py-10"
        keyboardShouldPersistTaps="handled"
      >
        <Text className="mb-2 text-4xl">🌿</Text>
        <Text className="mb-1 text-3xl font-bold text-ink-900">Eating Harmony</Text>
        <Text className="mb-8 text-base leading-5 text-ink-400">
          Recipes that nourish, matched to what feels good for your body right now.
        </Text>

        <View className="gap-4">
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            placeholder="you@example.com"
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            placeholder="••••••••"
          />
        </View>

        <View className="mt-7">
          <Button
            label={isSignUp ? "Create account" : "Sign in"}
            onPress={onSubmit}
            loading={submitting}
          />
        </View>

        <View className="mt-5 flex-row justify-center">
          <Text className="text-sm text-ink-400">
            {isSignUp ? "Already have an account?" : "New here?"}{" "}
          </Text>
          <Text
            className="text-sm font-semibold text-terracotta-500"
            onPress={() => setMode(isSignUp ? "signIn" : "signUp")}
          >
            {isSignUp ? "Sign in" : "Create an account"}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
