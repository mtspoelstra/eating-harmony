import { RecipeWithDetails } from "@/lib/types";

export function isCurrentDiet(recipe: Pick<RecipeWithDetails, "ingredients">): boolean {
  return (
    recipe.ingredients.length > 0 &&
    recipe.ingredients.every((food) => food.status === "current")
  );
}

export function pausedCount(recipe: Pick<RecipeWithDetails, "ingredients">): number {
  return recipe.ingredients.filter((food) => food.status === "paused").length;
}

export function exceptionCount(recipe: Pick<RecipeWithDetails, "ingredients">): number {
  return recipe.ingredients.filter((food) => food.status === "exception").length;
}

export function timesCooked(recipe: Pick<RecipeWithDetails, "cook_logs">): number {
  return recipe.cook_logs.length;
}

export function lastCookedOn(recipe: Pick<RecipeWithDetails, "cook_logs">): string | null {
  return recipe.cook_logs[0]?.cooked_on ?? null;
}

export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
