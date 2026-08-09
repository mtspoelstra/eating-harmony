import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";

import { RecipeThumbnail } from "@/components/ui/RecipeThumbnail";
import { ReactionBadge } from "@/components/ui/ReactionBadge";
import { useDeleteCookLogMutation } from "@/hooks/useCookLogs";
import { useDeleteRecipeMutation, useRecipeQuery } from "@/hooks/useRecipes";
import { formatDate, isCurrentDiet, timesCooked } from "@/lib/recipeStats";

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: recipe, isLoading } = useRecipeQuery(id);
  const deleteRecipe = useDeleteRecipeMutation();
  const deleteCookLog = useDeleteCookLogMutation(id);

  if (isLoading || !recipe) {
    return <View className="flex-1 bg-cream-50" />;
  }

  const inDiet = isCurrentDiet(recipe);
  const pausedIngredients = recipe.ingredients.filter((f) => f.status === "paused");
  const exceptionIngredients = recipe.ingredients.filter((f) => f.status === "exception");

  const onDelete = () => {
    Alert.alert("Delete recipe?", `"${recipe.name}" will be permanently removed.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteRecipe.mutateAsync(recipe.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "",
          headerRight: () => (
            <View className="flex-row gap-4">
              <Pressable onPress={() => router.push(`/recipe/${recipe.id}/edit`)} hitSlop={8}>
                <SymbolView
                  name="pencil"
                  fallback={null}
                  tintColor="#332F28"
                  size={20}
                />
              </Pressable>
              <Pressable onPress={onDelete} hitSlop={8}>
                <SymbolView
                  name="trash"
                  fallback={null}
                  tintColor="#BC5A2C"
                  size={20}
                />
              </Pressable>
            </View>
          ),
        }}
      />
      <ScrollView className="flex-1 bg-cream-50" showsVerticalScrollIndicator={false}>
        <RecipeThumbnail uri={recipe.photo_url} className="h-56 w-full" />

        <View className="px-5 pt-4">
          <Text className="mb-1 text-2xl font-bold text-ink-900">{recipe.name}</Text>

          {recipe.tags.length > 0 && (
            <Text className="mb-2 text-sm text-ink-400">
              {recipe.tags.map((t) => t.name).join(" · ")}
            </Text>
          )}

          <View
            className={`mb-4 self-start rounded-pill px-3 py-1 ${
              inDiet ? "bg-sage-100" : "bg-cream-300"
            }`}
          >
            <Text className={`text-xs font-semibold ${inDiet ? "text-sage-700" : "text-terracotta-600"}`}>
              {inDiet ? "On your current diet" : "Not currently matching your foods"}
            </Text>
          </View>

          {pausedIngredients.length > 0 && (
            <Text className="mb-2 text-xs leading-4 text-ink-400">
              Paused: {pausedIngredients.map((f) => f.name).join(", ")} — move{" "}
              {pausedIngredients.length > 1 ? "these" : "this"} back to Current Foods to unlock it.
            </Text>
          )}

          {exceptionIngredients.length > 0 && (
            <Text className="mb-4 text-xs leading-4 text-terracotta-600">
              Exceptions: {exceptionIngredients.map((f) => f.name).join(", ")} —{" "}
              {exceptionIngredients.length > 1 ? "these aren't" : "this isn't"} on your foods list.
            </Text>
          )}

          <Section title="Ingredients">
            <View className="gap-2">
              {recipe.ingredients.map((food) => (
                <View key={food.id} className="flex-row items-center gap-2.5">
                  <View
                    className={`h-1.5 w-1.5 rounded-full ${
                      food.status === "current"
                        ? "bg-sage-500"
                        : food.status === "paused"
                          ? "bg-ink-100"
                          : "bg-terracotta-500"
                    }`}
                  />
                  <Text className="text-base text-ink-800">
                    {food.quantity ? (
                      <Text className="font-semibold text-ink-600">{food.quantity} </Text>
                    ) : null}
                    {food.name}
                  </Text>
                </View>
              ))}
            </View>
          </Section>

          {recipe.steps.length > 0 && (
            <Section title="Steps">
              <View className="gap-3">
                {recipe.steps.map((step, i) => (
                  <View key={i} className="flex-row gap-3">
                    <Text className="w-6 text-base font-semibold text-terracotta-400">{i + 1}</Text>
                    <Text className="flex-1 text-base leading-5 text-ink-800">{step}</Text>
                  </View>
                ))}
              </View>
            </Section>
          )}

          {recipe.notes && (
            <Section title="Notes">
              <Text className="text-base leading-5 text-ink-600">{recipe.notes}</Text>
            </Section>
          )}

          <Section
            title={`Cook history${timesCooked(recipe) ? ` · ${timesCooked(recipe)}×` : ""}`}
            action={
              <Pressable
                onPress={() => router.push(`/recipe/${recipe.id}/log`)}
                className="flex-row items-center gap-1 rounded-pill bg-sage-100 px-3 py-1.5 active:bg-sage-200"
              >
                <SymbolView
                  name="plus"
                  fallback={null}
                  tintColor="#5A7A4B"
                  size={13}
                />
                <Text className="text-xs font-semibold text-sage-700">Log a cook</Text>
              </Pressable>
            }
          >
            {recipe.cook_logs.length === 0 ? (
              <Text className="text-sm text-ink-400">
                Not cooked yet — log it after your first time making this.
              </Text>
            ) : (
              <View className="gap-2.5">
                {recipe.cook_logs.map((log) => (
                  <View
                    key={log.id}
                    className="flex-row items-center justify-between rounded-2xl bg-white p-3.5"
                  >
                    <View className="flex-1 pr-2">
                      <Text className="mb-1 text-sm font-medium text-ink-800">
                        {formatDate(log.cooked_on)}
                      </Text>
                      <ReactionBadge reaction={log.reaction} />
                      {log.notes && (
                        <Text className="mt-1.5 text-xs leading-4 text-ink-400">{log.notes}</Text>
                      )}
                    </View>
                    <Pressable
                      onPress={() => deleteCookLog.mutate(log.id)}
                      hitSlop={8}
                      className="p-1"
                    >
                      <SymbolView
                        name="xmark"
                        fallback={null}
                        tintColor="#8A8477"
                        size={15}
                      />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </Section>
        </View>
      </ScrollView>
    </>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-6">
      <View className="mb-2.5 flex-row items-center justify-between">
        <Text className="text-sm font-bold uppercase tracking-wide text-ink-400">{title}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}
