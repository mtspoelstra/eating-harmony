import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";

import { RecipeForm, RecipeFormInitial } from "@/components/RecipeForm";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { TextField } from "@/components/ui/TextField";
import { useFoodsQuery } from "@/hooks/useFoods";
import { useGenerateRecipeMutation } from "@/hooks/useGenerateRecipe";
import { useCreateRecipeMutation } from "@/hooks/useRecipes";
import { useFindOrCreateTagMutation } from "@/hooks/useTags";
import { CookTime, Difficulty, GeneratedRecipe, RecipeIngredient, Tag } from "@/lib/types";

type Step =
  | "mode"
  | "ingredients"
  | "time"
  | "difficulty"
  | "mealType"
  | "cuisine"
  | "extra"
  | "generating"
  | "review";

const TIMES: CookTime[] = ["Under 15 min", "15–30 min", "30–60 min", "60+ min"];
const DIFFICULTIES: Difficulty[] = ["Simple", "Moderate", "Complex"];
const MEAL_TYPES = ["Any", "Breakfast", "Lunch", "Dinner", "Snack", "Dessert", "Romantic Dinner"];
const CUISINES = [
  "Any",
  "Italian",
  "Thai",
  "Indian",
  "Mexican",
  "American",
  "Mediterranean",
  "Chinese",
  "Japanese",
  "French",
  "Middle Eastern",
];

export default function GenerateRecipeScreen() {
  const router = useRouter();
  const { data: foods } = useFoodsQuery();
  const currentFoods = (foods ?? []).filter((f) => f.status === "current");

  const generateRecipe = useGenerateRecipeMutation();
  const findOrCreateTag = useFindOrCreateTagMutation();
  const createRecipe = useCreateRecipeMutation();

  const [step, setStep] = useState<Step>("mode");
  const [mode, setMode] = useState<"surprise" | "choose" | null>(null);
  const [selectedIngredientIds, setSelectedIngredientIds] = useState<string[]>([]);
  const [time, setTime] = useState<CookTime | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [mealType, setMealType] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [customMealType, setCustomMealType] = useState("");
  const [customCuisine, setCustomCuisine] = useState("");
  const [extraRequests, setExtraRequests] = useState("");

  const [generated, setGenerated] = useState<GeneratedRecipe | null>(null);
  const [resolvedTags, setResolvedTags] = useState<Tag[]>([]);

  const runGeneration = async (finalExtraRequests: string) => {
    setStep("generating");
    try {
      const tagNames = [mealType, cuisine].filter((v) => v && v !== "Any");
      const [result, ...tags] = await Promise.all([
        generateRecipe.mutateAsync({
          mode: mode!,
          ingredientIds: mode === "choose" ? selectedIngredientIds : undefined,
          time: time!,
          difficulty: difficulty!,
          mealType: mealType === "Any" ? "" : mealType,
          cuisine: cuisine === "Any" ? "" : cuisine,
          extraRequests: finalExtraRequests.trim() || undefined,
        }),
        ...tagNames.map((n) => findOrCreateTag.mutateAsync(n)),
      ]);
      setGenerated(result);
      setResolvedTags(tags);
      setStep("review");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't generate a recipe.";
      Alert.alert("Generation failed", message);
      setStep("extra");
    }
  };

  if (step === "generating") {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-cream-50">
        <ActivityIndicator color="#BC5A2C" size="large" />
        <Text className="text-sm text-ink-400">Cooking up something for you…</Text>
      </View>
    );
  }

  if (step === "review" && generated) {
    const ingredients: RecipeIngredient[] = [];
    for (const gi of generated.ingredients) {
      const food = currentFoods.find((f) => f.id === gi.foodId);
      if (food) ingredients.push({ ...food, quantity: gi.quantity });
    }

    const initial: RecipeFormInitial = {
      name: generated.name,
      photo_url: null,
      notes: generated.notes,
      steps: generated.steps,
      ingredients,
      tags: resolvedTags,
    };

    return (
      <View className="flex-1">
        <View className="items-center bg-sage-100 py-2.5">
          <Text
            className="text-sm font-semibold text-sage-700"
            onPress={() => runGeneration(extraRequests)}
          >
            ✨ Not quite right? Tap to generate a different one
          </Text>
        </View>
        <RecipeForm
          key={generated.name + generated.steps.join("")}
          initial={initial}
          submitLabel="Save recipe"
          submitting={createRecipe.isPending}
          onSubmit={async (input) => {
            const id = await createRecipe.mutateAsync(input);
            router.replace(`/recipe/${id}`);
          }}
        />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-cream-50" contentContainerClassName="p-5 gap-6">
      {step === "mode" && (
        <StepSection title="How should we build it?">
          <View className="gap-2.5">
            <BigChoice
              emoji="🎲"
              label="Surprise me"
              subtitle="Pull together ingredients from my current foods automatically."
              onPress={() => {
                setMode("surprise");
                setStep("time");
              }}
            />
            <BigChoice
              emoji="🧺"
              label="Let me pick ingredients"
              subtitle="Choose specific foods from my current list to build around."
              onPress={() => {
                setMode("choose");
                setStep("ingredients");
              }}
            />
          </View>
        </StepSection>
      )}

      {step === "ingredients" && (
        <StepSection title="Pick a few ingredients">
          {currentFoods.length === 0 ? (
            <Text className="text-sm text-ink-400">
              You don't have any Current Foods yet — add some under My Foods first.
            </Text>
          ) : (
            <View className="flex-row flex-wrap gap-2">
              {currentFoods.map((food) => (
                <Chip
                  key={food.id}
                  label={food.name}
                  tone="terracotta"
                  selected={selectedIngredientIds.includes(food.id)}
                  onPress={() =>
                    setSelectedIngredientIds((prev) =>
                      prev.includes(food.id) ? prev.filter((id) => id !== food.id) : [...prev, food.id]
                    )
                  }
                />
              ))}
            </View>
          )}
          <Button
            label="Next"
            onPress={() => setStep("time")}
            disabled={selectedIngredientIds.length === 0}
          />
        </StepSection>
      )}

      {step === "time" && (
        <StepSection title="How much time do you have?">
          <View className="gap-2.5">
            {TIMES.map((t) => (
              <Chip key={t} label={t} selected={time === t} onPress={() => { setTime(t); setStep("difficulty"); }} />
            ))}
          </View>
        </StepSection>
      )}

      {step === "difficulty" && (
        <StepSection title="How much effort are you up for?">
          <View className="gap-2.5">
            {DIFFICULTIES.map((d) => (
              <Chip
                key={d}
                label={d}
                selected={difficulty === d}
                onPress={() => { setDifficulty(d); setStep("mealType"); }}
              />
            ))}
          </View>
        </StepSection>
      )}

      {step === "mealType" && (
        <StepSection title="What kind of meal?">
          <View className="flex-row flex-wrap gap-2">
            {MEAL_TYPES.map((m) => (
              <Chip key={m} label={m} tone="sage" selected={mealType === m} onPress={() => { setMealType(m); setStep("cuisine"); }} />
            ))}
          </View>
          <Text className="mt-1 text-sm font-medium text-ink-600">Something else?</Text>
          <View className="flex-row items-end gap-3">
            <TextField className="flex-1" value={customMealType} onChangeText={setCustomMealType} placeholder="e.g. Post-workout" />
            <Button
              label="Use this"
              variant="secondary"
              onPress={() => { setMealType(customMealType.trim()); setStep("cuisine"); }}
              disabled={!customMealType.trim()}
            />
          </View>
        </StepSection>
      )}

      {step === "cuisine" && (
        <StepSection title="Any style you're craving?">
          <View className="flex-row flex-wrap gap-2">
            {CUISINES.map((c) => (
              <Chip key={c} label={c} tone="sage" selected={cuisine === c} onPress={() => { setCuisine(c); setStep("extra"); }} />
            ))}
          </View>
          <Text className="mt-1 text-sm font-medium text-ink-600">Something else?</Text>
          <View className="flex-row items-end gap-3">
            <TextField className="flex-1" value={customCuisine} onChangeText={setCustomCuisine} placeholder="e.g. Fusion" />
            <Button
              label="Use this"
              variant="secondary"
              onPress={() => { setCuisine(customCuisine.trim()); setStep("extra"); }}
              disabled={!customCuisine.trim()}
            />
          </View>
        </StepSection>
      )}

      {step === "extra" && (
        <StepSection title="Anything else we should know?">
          <TextField
            value={extraRequests}
            onChangeText={setExtraRequests}
            placeholder="e.g. make it kid-friendly, keep it low-sodium..."
            multiline
            numberOfLines={4}
            className="min-h-24"
            textAlignVertical="top"
          />
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button label="No more requests" variant="secondary" onPress={() => runGeneration("")} />
            </View>
            <View className="flex-1">
              <Button label="Generate" onPress={() => runGeneration(extraRequests)} />
            </View>
          </View>
        </StepSection>
      )}
    </ScrollView>
  );
}

function StepSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-4">
      <Text className="text-xl font-bold text-ink-900">{title}</Text>
      {children}
    </View>
  );
}

function BigChoice({
  emoji,
  label,
  subtitle,
  onPress,
}: {
  emoji: string;
  label: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <View className="rounded-card bg-white p-4 shadow-sm shadow-ink-900/5">
      <Text className="mb-1 text-2xl">{emoji}</Text>
      <Text className="mb-1 text-base font-semibold text-ink-800">{label}</Text>
      <Text className="mb-3 text-sm leading-5 text-ink-400">{subtitle}</Text>
      <Button label="Choose" variant="secondary" onPress={onPress} />
    </View>
  );
}
