import * as ImagePicker from "expo-image-picker";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";

import { MultiSelectPicker } from "@/components/MultiSelectPicker";
import { Button } from "@/components/ui/Button";
import { RecipeThumbnail } from "@/components/ui/RecipeThumbnail";
import { TextField } from "@/components/ui/TextField";
import { useAddFoodMutation, useFoodsQuery } from "@/hooks/useFoods";
import { useFindOrCreateTagMutation, useTagsQuery } from "@/hooks/useTags";
import { RecipeInput, uploadRecipePhoto } from "@/lib/api";
import { useAuth } from "@/lib/AuthProvider";
import { RecipeWithDetails } from "@/lib/types";

export function RecipeForm({
  initial,
  onSubmit,
  submitting,
  submitLabel,
}: {
  initial?: RecipeWithDetails;
  onSubmit: (input: RecipeInput) => Promise<void>;
  submitting: boolean;
  submitLabel: string;
}) {
  const { session } = useAuth();
  const { data: foods } = useFoodsQuery();
  const { data: tags } = useTagsQuery();
  const addFood = useAddFoodMutation();
  const addTag = useFindOrCreateTagMutation();

  const [name, setName] = useState(initial?.name ?? "");
  const [photoUri, setPhotoUri] = useState<string | null>(initial?.photo_url ?? null);
  const [photoChanged, setPhotoChanged] = useState(false);
  const [ingredientIds, setIngredientIds] = useState<string[]>(
    initial?.ingredients.map((i) => i.id) ?? []
  );
  const [tagIds, setTagIds] = useState<string[]>(initial?.tags.map((t) => t.id) ?? []);
  const [steps, setSteps] = useState<string[]>(initial?.steps.length ? initial.steps : [""]);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [uploading, setUploading] = useState(false);

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo library access to add a recipe photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setPhotoChanged(true);
    }
  };

  const updateStep = (index: number, value: string) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? value : s)));
  };
  const addStep = () => setSteps((prev) => [...prev, ""]);
  const removeStep = (index: number) => setSteps((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert("Name it", "Give your recipe a name.");
      return;
    }
    if (ingredientIds.length === 0) {
      Alert.alert("Add ingredients", "Pick at least one ingredient.");
      return;
    }

    let photoUrl = initial?.photo_url ?? null;
    if (photoChanged && photoUri) {
      setUploading(true);
      try {
        photoUrl = await uploadRecipePhoto(session!.user.id, photoUri);
      } catch (err) {
        setUploading(false);
        const message = err instanceof Error ? err.message : "Couldn't upload photo.";
        Alert.alert("Photo upload failed", message);
        return;
      }
      setUploading(false);
    } else if (photoChanged && !photoUri) {
      photoUrl = null;
    }

    await onSubmit({
      name,
      steps: steps.map((s) => s.trim()).filter(Boolean),
      notes: notes.trim() || null,
      photo_url: photoUrl,
      ingredientIds,
      tagIds,
    });
  };

  return (
    <ScrollView
      className="flex-1 bg-cream-50"
      contentContainerClassName="p-5 gap-6 pb-16"
      keyboardShouldPersistTaps="handled"
    >
      <Pressable onPress={pickPhoto}>
        <RecipeThumbnail uri={photoUri} className="h-40 w-full rounded-card" />
        <View className="absolute bottom-2 right-2 flex-row items-center gap-1.5 rounded-pill bg-ink-900/70 px-3 py-1.5">
          <SymbolView
            name="camera.fill"
            fallback={null}
            tintColor="#fff"
            size={13}
          />
          <Text className="text-xs font-medium text-white">
            {photoUri ? "Change photo" : "Add photo"}
          </Text>
        </View>
      </Pressable>

      <TextField label="Name" value={name} onChangeText={setName} placeholder="Golden turmeric rice" />

      <MultiSelectPicker
        label="Ingredients"
        items={foods ?? []}
        selectedIds={ingredientIds}
        onChange={setIngredientIds}
        onCreate={(n) => addFood.mutateAsync(n)}
        placeholder="Search or add an ingredient"
      />

      <MultiSelectPicker
        label="Tags"
        items={tags ?? []}
        selectedIds={tagIds}
        onChange={setTagIds}
        onCreate={(n) => addTag.mutateAsync(n)}
        placeholder="Search or add a tag"
      />

      <View>
        <Text className="mb-2 text-sm font-medium text-ink-600">Steps</Text>
        <View className="gap-2.5">
          {steps.map((step, i) => (
            <View key={i} className="flex-row items-center gap-2">
              <Text className="w-5 text-sm font-semibold text-terracotta-400">{i + 1}</Text>
              <TextField
                className="flex-1"
                value={step}
                onChangeText={(v) => updateStep(i, v)}
                placeholder={`Step ${i + 1}`}
              />
              {steps.length > 1 && (
                <Pressable onPress={() => removeStep(i)} hitSlop={8} className="p-1">
                  <SymbolView
                    name="xmark.circle.fill"
                    fallback={null}
                    tintColor="#8A8477"
                    size={18}
                  />
                </Pressable>
              )}
            </View>
          ))}
        </View>
        <Pressable onPress={addStep} className="mt-2.5 self-start">
          <Text className="text-sm font-semibold text-sage-600">+ Add step</Text>
        </Pressable>
      </View>

      <TextField
        label="Notes (optional)"
        value={notes}
        onChangeText={setNotes}
        placeholder="Substitutions, tips, how it usually goes..."
        multiline
        numberOfLines={4}
        className="min-h-24"
        textAlignVertical="top"
      />

      <Button label={submitLabel} onPress={handleSubmit} loading={submitting || uploading} />
    </ScrollView>
  );
}
