export type Reaction = "great" | "okay" | "rough";

export type FoodCategory = {
  id: string;
  user_id: string;
  name: string;
  is_default: boolean;
  created_at: string;
};

export type FoodStatus = "current" | "paused" | "exception";

export type Food = {
  id: string;
  user_id: string;
  name: string;
  status: FoodStatus;
  created_at: string;
  categories: FoodCategory[];
};

export type RecipeIngredient = Food & { quantity: string | null };

export type Tag = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
};

export type CookLog = {
  id: string;
  recipe_id: string;
  user_id: string;
  cooked_on: string;
  reaction: Reaction;
  notes: string | null;
  created_at: string;
};

export type Recipe = {
  id: string;
  user_id: string;
  name: string;
  steps: string[];
  photo_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type RecipeWithDetails = Recipe & {
  ingredients: RecipeIngredient[];
  tags: Tag[];
  cook_logs: CookLog[];
};

export type CookLogWithRecipe = CookLog & {
  recipe: Pick<Recipe, "id" | "name" | "photo_url">;
};

export type CookTime = "Under 15 min" | "15–30 min" | "30–60 min" | "60+ min";
export type Difficulty = "Simple" | "Moderate" | "Complex";

export type GenerateRecipeParams = {
  mode: "surprise" | "choose";
  ingredientIds?: string[];
  time: CookTime;
  difficulty: Difficulty;
  mealType: string;
  cuisine: string;
  extraRequests?: string;
};

export type GeneratedIngredient = { foodId: string; quantity: string };

export type GeneratedRecipe = {
  name: string;
  steps: string[];
  notes: string | null;
  ingredients: GeneratedIngredient[];
};
