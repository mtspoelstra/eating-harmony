import { supabase } from "@/lib/supabase";
import type { CookLog, CookLogWithRecipe, Food, Reaction, RecipeWithDetails, Tag } from "@/lib/types";

// ---------- foods ----------

export async function fetchFoods(): Promise<Food[]> {
  const { data, error } = await supabase
    .from("foods")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return data;
}

export async function addOrRestoreFood(userId: string, name: string): Promise<Food> {
  const trimmed = name.trim();
  const { data: existing, error: findError } = await supabase
    .from("foods")
    .select("*")
    .ilike("name", trimmed)
    .maybeSingle();
  if (findError) throw findError;

  if (existing) {
    if (existing.is_current) return existing;
    const { data, error } = await supabase
      .from("foods")
      .update({ is_current: true, is_all_foods: false })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("foods")
    .insert({ user_id: userId, name: trimmed, is_current: true, is_all_foods: false })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateFoodBucket(
  foodId: string,
  bucket: { is_current: boolean; is_all_foods: boolean }
): Promise<void> {
  const { error } = await supabase.from("foods").update(bucket).eq("id", foodId);
  if (error) throw error;
}

// ---------- tags ----------

export async function fetchTags(): Promise<Tag[]> {
  const { data, error } = await supabase.from("tags").select("*").order("name");
  if (error) throw error;
  return data;
}

export async function findOrCreateTag(userId: string, name: string): Promise<Tag> {
  const trimmed = name.trim();
  const { data: existing, error: findError } = await supabase
    .from("tags")
    .select("*")
    .ilike("name", trimmed)
    .maybeSingle();
  if (findError) throw findError;
  if (existing) return existing;

  const { data, error } = await supabase
    .from("tags")
    .insert({ user_id: userId, name: trimmed })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ---------- recipes ----------

const RECIPE_SELECT = `
  *,
  recipe_ingredients ( food:foods (*) ),
  recipe_tags ( tag:tags (*) ),
  cook_logs ( * )
`;

type RawRecipeRow = {
  id: string;
  user_id: string;
  name: string;
  steps: string[];
  photo_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  recipe_ingredients: { food: Food }[];
  recipe_tags: { tag: Tag }[];
  cook_logs: CookLog[];
};

function mapRecipe(row: RawRecipeRow): RecipeWithDetails {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    steps: row.steps ?? [],
    photo_url: row.photo_url,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    ingredients: row.recipe_ingredients.map((ri) => ri.food),
    tags: row.recipe_tags.map((rt) => rt.tag),
    cook_logs: [...row.cook_logs].sort((a, b) => b.cooked_on.localeCompare(a.cooked_on)),
  };
}

export async function fetchRecipes(): Promise<RecipeWithDetails[]> {
  const { data, error } = await supabase
    .from("recipes")
    .select(RECIPE_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as RawRecipeRow[]).map(mapRecipe);
}

export async function fetchRecipe(id: string): Promise<RecipeWithDetails> {
  const { data, error } = await supabase
    .from("recipes")
    .select(RECIPE_SELECT)
    .eq("id", id)
    .single();
  if (error) throw error;
  return mapRecipe(data as unknown as RawRecipeRow);
}

export type RecipeInput = {
  name: string;
  steps: string[];
  notes: string | null;
  photo_url: string | null;
  ingredientIds: string[];
  tagIds: string[];
};

export async function createRecipe(userId: string, input: RecipeInput): Promise<string> {
  const { data: recipe, error } = await supabase
    .from("recipes")
    .insert({
      user_id: userId,
      name: input.name.trim(),
      steps: input.steps,
      notes: input.notes,
      photo_url: input.photo_url,
    })
    .select()
    .single();
  if (error) throw error;

  await syncRecipeIngredients(recipe.id, input.ingredientIds);
  await syncRecipeTags(recipe.id, input.tagIds);

  return recipe.id;
}

export async function updateRecipe(id: string, input: RecipeInput): Promise<void> {
  const { error } = await supabase
    .from("recipes")
    .update({
      name: input.name.trim(),
      steps: input.steps,
      notes: input.notes,
      photo_url: input.photo_url,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;

  await syncRecipeIngredients(id, input.ingredientIds);
  await syncRecipeTags(id, input.tagIds);
}

async function syncRecipeIngredients(recipeId: string, foodIds: string[]) {
  const { error: deleteError } = await supabase
    .from("recipe_ingredients")
    .delete()
    .eq("recipe_id", recipeId);
  if (deleteError) throw deleteError;

  if (foodIds.length === 0) return;
  const { error: insertError } = await supabase
    .from("recipe_ingredients")
    .insert(foodIds.map((food_id) => ({ recipe_id: recipeId, food_id })));
  if (insertError) throw insertError;
}

async function syncRecipeTags(recipeId: string, tagIds: string[]) {
  const { error: deleteError } = await supabase
    .from("recipe_tags")
    .delete()
    .eq("recipe_id", recipeId);
  if (deleteError) throw deleteError;

  if (tagIds.length === 0) return;
  const { error: insertError } = await supabase
    .from("recipe_tags")
    .insert(tagIds.map((tag_id) => ({ recipe_id: recipeId, tag_id })));
  if (insertError) throw insertError;
}

export async function deleteRecipe(id: string): Promise<void> {
  const { error } = await supabase.from("recipes").delete().eq("id", id);
  if (error) throw error;
}

// ---------- cook logs ----------

export async function addCookLog(
  userId: string,
  recipeId: string,
  entry: { cooked_on: string; reaction: Reaction; notes: string | null }
): Promise<CookLog> {
  const { data, error } = await supabase
    .from("cook_logs")
    .insert({ user_id: userId, recipe_id: recipeId, ...entry })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCookLog(id: string): Promise<void> {
  const { error } = await supabase.from("cook_logs").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchAllCookLogs(): Promise<CookLogWithRecipe[]> {
  const { data, error } = await supabase
    .from("cook_logs")
    .select("*, recipe:recipes ( id, name, photo_url )")
    .order("cooked_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as unknown as CookLogWithRecipe[];
}

// ---------- storage ----------

export async function uploadRecipePhoto(
  userId: string,
  localUri: string
): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.arrayBuffer();
  const path = `${userId}/${Date.now()}.jpg`;

  const { error } = await supabase.storage
    .from("recipe-photos")
    .upload(path, blob, { contentType: "image/jpeg", upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from("recipe-photos").getPublicUrl(path);
  return data.publicUrl;
}
