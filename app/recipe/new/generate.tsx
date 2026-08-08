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
import { CookTime, Difficulty, Food, GeneratedRecipe, Tag } from "@/lib/types";

type Step = "mode" | "ingredients" | "time" | "difficulty" | "mealType" | "cuisine" | "generating" | "review";

const TIMES: CookTime[] = ["Under 15 min", "15–30 min", "30–60 min", "60+ min"];
const DIFFICULTIES: Difficulty[] = ["Simple", "Moderate", "Complex"];
const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack", "Dessert", "Romantic Dinner"];
const CUISINES = [
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
  const currentFoods = (foods ?? []).filter((f) => f.is_current);

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

  const [generated, setGenerated] = useState<GeneratedRecipe | null>(null);
  const [resolvedTags, setResolvedTags] = useState<Tag[]>([]);

  const runGeneration = async (finalCuisine: string) => {
    setStep("generating");
    try {
      const [result, mealTag, cuisineTag] = await Promise.all([
        generateRecipe.mutateAsync({
          mode: mode!,
          ingredientIds: mode === "choose" ? selectedIngredientIds : undefined,
          time: time!,
          difficulty: difficulty!,
          mealType,
          cuisine: finalCuisine,
        }),
        findOrCreateTag.mutateAsync(mealType),
        findOrCreateTag.mutateAsync(finalCuisine),
      ]);
      setGenerated(result);
      setResolvedTags([mealTag, cuisineTag]);
      setStep("review");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't generate a recipe.";
      Alert.alert("Generation failed", message);
      setStep("cuisine");
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
    const ingredients: Food[] = currentFoods.filter((f) => generated.ingredientIds.includes(f.id));
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
            onPress={() => runGeneration(cuisine)}
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
              <Chip key={c} label={c} tone="sage" selected={cuisine === c} onPress={() => { setCuisine(c); runGeneration(c); }} />
            ))}
          </View>
          <Text className="mt-1 text-sm font-medium text-ink-600">Something else?</Text>
          <View className="flex-row items-end gap-3">
            <TextField className="flex-1" value={customCuisine} onChangeText={setCustomCuisine} placeholder="e.g. Fusion" />
            <Button
              label="Generate"
              onPress={() => { const v = customCuisine.trim(); setCuisine(v); runGeneration(v); }}
              disabled={!customCuisine.trim()}
            />
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
