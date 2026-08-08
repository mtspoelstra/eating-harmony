export type Reaction = "great" | "okay" | "rough";

export type Food = {
  id: string;
  user_id: string;
  name: string;
  is_current: boolean;
  is_all_foods: boolean;
  created_at: string;
};

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
  ingredients: Food[];
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
};

export type GeneratedRecipe = {
  name: string;
  steps: string[];
  notes: string | null;
  ingredientIds: string[];
};
