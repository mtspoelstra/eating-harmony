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
      .eq("is_current", true);
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

CRITICAL SAFETY RULE, no exceptions: you may ONLY use ingredients from the list provided in the user message. Do not add, assume, or suggest ANY ingredient not on that exact list -- not salt, not oil, not water, not garnish, nothing. If the list doesn't include something you'd normally reach for, work around it or leave it out entirely. This rule exists because an untested ingredient could cause a real health reaction for this person.

Call the return_recipe tool with your answer. ingredient_names must be copied verbatim from the provided list (a subset of it, spelled exactly the same).`;

    const userPrompt = `Available ingredients (choose only from this list):
${ingredientList}

Mode: ${body.mode === "surprise" ? "Surprise me -- pick a sensible subset of the ingredients above that go well together." : "Use all of the listed ingredients (the user already chose them)."}
Cook time: ${body.time}
Difficulty: ${body.difficulty} (reflect this in the number of steps and complexity of technique)
Meal type: ${body.mealType}
Cuisine style: ${body.cuisine}`;

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
                name: { type: "string", description: "A short, appealing recipe name." },
                ingredient_names: {
                  type: "array",
                  items: { type: "string" },
                  description:
                    "Exact ingredient names used, copied verbatim from the provided list only.",
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
              required: ["name", "ingredient_names", "steps"],
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
      ingredient_names: string[];
      steps: string[];
      notes?: string;
    };

    // Re-validate against the real candidate list -- never trust model output blindly.
    const byLowerName = new Map(candidates.map((f) => [f.name.toLowerCase(), f.id]));
    const ingredientIds = result.ingredient_names
      .map((n) => byLowerName.get(n.trim().toLowerCase()))
      .filter((id): id is string => Boolean(id));

    if (ingredientIds.length === 0) {
      return jsonResponse(
        { error: "The generator didn't stick to your current foods. Please try again." },
        502
      );
    }

    return jsonResponse({
      name: result.name,
      steps: result.steps,
      notes: result.notes?.trim() || null,
      ingredientIds,
    });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: "Something went wrong generating your recipe." }, 500);
  }
});
