import { supabase } from "@/lib/supabase";
import type {
  CookLog,
  CookLogWithRecipe,
  Food,
  FoodCategory,
  GeneratedRecipe,
  GenerateRecipeParams,
  Reaction,
  RecipeIngredient,
  RecipeWithDetails,
  Tag,
} from "@/lib/types";

// ---------- foods ----------

const FOOD_SELECT = `*, food_category_members ( category:food_categories (*) )`;

type RawFoodRow = Omit<Food, "categories"> & {
  food_category_members: { category: FoodCategory }[];
};

function mapFood(row: RawFoodRow): Food {
  const { food_category_members, ...rest } = row;
  return { ...rest, categories: food_category_members.map((m) => m.category) };
}

export async function fetchFoods(): Promise<Food[]> {
  const { data, error } = await supabase
    .from("foods")
    .select(FOOD_SELECT)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data as unknown as RawFoodRow[]).map(mapFood);
}

export async function addOrRestoreFood(userId: string, name: string): Promise<Food> {
  const trimmed = name.trim();
  const { data: existing, error: findError } = await supabase
    .from("foods")
    .select(FOOD_SELECT)
    .ilike("name", trimmed)
    .maybeSingle();
  if (findError) throw findError;

  if (existing) {
    const existingFood = mapFood(existing as unknown as RawFoodRow);
    if (existingFood.is_current) return existingFood;
    const { data, error } = await supabase
      .from("foods")
      .update({ is_current: true, is_all_foods: false })
      .eq("id", existingFood.id)
      .select(FOOD_SELECT)
      .single();
    if (error) throw error;
    return mapFood(data as unknown as RawFoodRow);
  }

  const { data, error } = await supabase
    .from("foods")
    .insert({ user_id: userId, name: trimmed, is_current: true, is_all_foods: false })
    .select(FOOD_SELECT)
    .single();
  if (error) throw error;
  return mapFood(data as unknown as RawFoodRow);
}

export async function updateFoodBucket(
  foodId: string,
  bucket: { is_current: boolean; is_all_foods: boolean }
): Promise<void> {
  const { error } = await supabase.from("foods").update(bucket).eq("id", foodId);
  if (error) throw error;
}

// ---------- food categories ----------

export async function fetchFoodCategories(): Promise<FoodCategory[]> {
  const { data, error } = await supabase
    .from("food_categories")
    .select("*")
    .order("is_default", { ascending: false })
    .order("name", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createFoodCategory(userId: string, name: string): Promise<FoodCategory> {
  const trimmed = name.trim();
  const { data: existing, error: findError } = await supabase
    .from("food_categories")
    .select("*")
    .ilike("name", trimmed)
    .maybeSingle();
  if (findError) throw findError;
  if (existing) return existing;

  const { data, error } = await supabase
    .from("food_categories")
    .insert({ user_id: userId, name: trimmed, is_default: false })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteFoodCategory(id: string): Promise<void> {
  const { error } = await supabase.from("food_categories").delete().eq("id", id);
  if (error) throw error;
}

export async function setFoodCategory(foodId: string, categoryId: string | null): Promise<void> {
  const { error: deleteError } = await supabase
    .from("food_category_members")
    .delete()
    .eq("food_id", foodId);
  if (deleteError) throw deleteError;

  if (!categoryId) return;
  const { error: insertError } = await supabase
    .from("food_category_members")
    .insert({ food_id: foodId, category_id: categoryId });
  if (insertError) throw insertError;
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
  recipe_ingredients ( quantity, food:foods (*, food_category_members ( category:food_categories (*) )) ),
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
  recipe_ingredients: { quantity: string | null; food: RawFoodRow }[];
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
    ingredients: row.recipe_ingredients.map(
      (ri): RecipeIngredient => ({ ...mapFood(ri.food), quantity: ri.quantity })
    ),
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

export type RecipeIngredientInput = { foodId: string; quantity: string | null };

export type RecipeInput = {
  name: string;
  steps: string[];
  notes: string | null;
  photo_url: string | null;
  ingredients: RecipeIngredientInput[];
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

  await syncRecipeIngredients(recipe.id, input.ingredients);
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

  await syncRecipeIngredients(id, input.ingredients);
  await syncRecipeTags(id, input.tagIds);
}

async function syncRecipeIngredients(recipeId: string, ingredients: RecipeIngredientInput[]) {
  const { error: deleteError } = await supabase
    .from("recipe_ingredients")
    .delete()
    .eq("recipe_id", recipeId);
  if (deleteError) throw deleteError;

  if (ingredients.length === 0) return;
  const { error: insertError } = await supabase.from("recipe_ingredients").insert(
    ingredients.map((i) => ({
      recipe_id: recipeId,
      food_id: i.foodId,
      quantity: i.quantity,
    }))
  );
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

// ---------- AI recipe generation ----------

export async function generateRecipe(params: GenerateRecipeParams): Promise<GeneratedRecipe> {
  const { data, error } = await supabase.functions.invoke("generate-recipe", {
    body: params,
  });
  if (error) throw error;
  return data as GeneratedRecipe;
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
