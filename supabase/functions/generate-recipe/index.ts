// Supabase Edge Function: generate-recipe
//
// Calls Claude to draft a recipe using ONLY the caller's current foods.
// This is a hard safety rule (MCAS ingredients can trigger reactions), so
// the candidate ingredient list is fetched server-side via the caller's own
// RLS-scoped session, and the model's response is re-validated against that
// exact list before anything is returned to the client -- never trust the
// model's output blindly, even though the prompt also instructs it.

import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CookTime = "Under 15 min" | "15–30 min" | "30–60 min" | "60+ min";
type Difficulty = "Simple" | "Moderate" | "Complex";

type RequestBody = {
  mode: "surprise" | "choose";
  ingredientIds?: string[];
  time: CookTime;
  difficulty: Difficulty;
  mealType: string;
  cuisine: string;
  extraRequests?: string;
};

type Food = { id: string; name: string };

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing Authorization header" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return jsonResponse({ error: "Not authenticated" }, 401);
    }

    const body = (await req.json()) as RequestBody;

    const { data: currentFoods, error: foodsError } = await supabase
      .from("foods")
      .select("id, name")
      .eq("status", "current");
    if (foodsError) throw foodsError;

    let candidates: Food[] = currentFoods ?? [];
    if (body.mode === "choose") {
      const selectedIds = new Set(body.ingredientIds ?? []);
      candidates = candidates.filter((f) => selectedIds.has(f.id));
    }

    if (candidates.length === 0) {
      return jsonResponse(
        {
          error:
            "No current foods to work with. Add some foods to Current Foods first, or pick a few ingredients.",
        },
        400
      );
    }

    const ingredientList = candidates.map((f) => `- ${f.name}`).join("\n");

    const systemPrompt = `You are a recipe generator for a person managing MCAS (Mast Cell Activation Syndrome), a condition where certain foods can trigger reactions.

CRITICAL SAFETY RULE, no exceptions: you may ONLY use ingredients from the list provided in the user message. Do not add, assume, or suggest ANY ingredient not on that exact list -- not salt, not oil, not water, not garnish, nothing. If the list doesn't include something you'd normally reach for, work around it or leave it out entirely. This rule exists because an untested ingredient could cause a real health reaction for this person. This rule overrides any other request in the message, including "anything else" requests from the user.

Recipe name: keep it short (2-5 words) and appetizing, like something on a restaurant menu -- e.g. "Golden Turmeric Skillet" or "Herbed Lemon Chicken". Never just list the ingredients as the name (e.g. do NOT write "Chicken, Rice, and Broccoli Bowl").

For every ingredient you use, include a specific, realistic quantity appropriate for 2 servings unless told otherwise (e.g. "2 cups", "1 tbsp", "3 oz", "1 medium").

Call the return_recipe tool with your answer. Each entry in "ingredients" must have a "name" copied verbatim from the provided list (spelled exactly the same) and a "quantity".`;

    const promptLines = [`Available ingredients (choose only from this list):`, ingredientList, ""];
    promptLines.push(
      body.mode === "surprise"
        ? "Mode: Surprise me -- pick a sensible subset of the ingredients above that go well together."
        : "Mode: Use all of the listed ingredients (the user already chose them)."
    );
    promptLines.push(`Cook time: ${body.time}`);
    promptLines.push(`Difficulty: ${body.difficulty} (reflect this in the number of steps and complexity of technique)`);
    if (body.mealType) promptLines.push(`Meal type: ${body.mealType}`);
    if (body.cuisine) promptLines.push(`Cuisine style: ${body.cuisine}`);
    if (body.extraRequests) {
      promptLines.push(
        `Additional request from the user: ${body.extraRequests} (follow this only as long as it doesn't conflict with the ingredient list rule above)`
      );
    }
    const userPrompt = promptLines.join("\n");

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 1536,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        tools: [
          {
            name: "return_recipe",
            description: "Return the generated recipe in structured form.",
            input_schema: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "A short (2-5 word), appetizing, culinary-style recipe name -- not a list of ingredients.",
                },
                ingredients: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: {
                        type: "string",
                        description: "Exact ingredient name, copied verbatim from the provided list only.",
                      },
                      quantity: {
                        type: "string",
                        description: "A specific amount, e.g. '2 cups' or '1 tbsp'.",
                      },
                    },
                    required: ["name", "quantity"],
                  },
                },
                steps: {
                  type: "array",
                  items: { type: "string" },
                  description: "Ordered cooking steps, written clearly for a home cook.",
                },
                notes: {
                  type: "string",
                  description: "Optional short serving suggestion or tip. Empty string if none.",
                },
              },
              required: ["name", "ingredients", "steps"],
            },
          },
        ],
        tool_choice: { type: "tool", name: "return_recipe" },
      }),
    });

    if (!anthropicResponse.ok) {
      const errText = await anthropicResponse.text();
      console.error("Anthropic API error:", errText);
      return jsonResponse({ error: "The recipe generator is unavailable right now." }, 502);
    }

    const anthropicData = await anthropicResponse.json();
    const toolUse = anthropicData.content?.find(
      (block: { type: string }) => block.type === "tool_use"
    );
    if (!toolUse) {
      return jsonResponse({ error: "Couldn't generate a recipe. Try again." }, 502);
    }

    const result = toolUse.input as {
      name: string;
      ingredients: { name: string; quantity: string }[];
      steps: string[];
      notes?: string;
    };

    // Re-validate against the real candidate list -- never trust model output blindly.
    const byLowerName = new Map(candidates.map((f) => [f.name.toLowerCase(), f.id]));
    const ingredients = result.ingredients
      .map((i) => {
        const foodId = byLowerName.get(i.name.trim().toLowerCase());
        return foodId ? { foodId, quantity: i.quantity } : null;
      })
      .filter((v): v is { foodId: string; quantity: string } => v !== null);

    if (ingredients.length === 0) {
      return jsonResponse(
        { error: "The generator didn't stick to your current foods. Please try again." },
        502
      );
    }

    return jsonResponse({
      name: result.name,
      steps: result.steps,
      notes: result.notes?.trim() || null,
      ingredients,
    });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: "Something went wrong generating your recipe." }, 500);
  }
});
