@AGENTS.md

# Eating Harmony

A personal recipe app for managing MCAS (Mast Cell Activation Syndrome). The
core idea: the owner tracks which foods they currently tolerate, and the app
surfaces only the recipes they can safely eat right now.

**Tone matters.** MCAS is naturally restrictive and can feel sad and limiting.
This app is deliberately the opposite: warm, positive, about *nourishing* the
body with food that feels good and tastes good. Keep copy encouraging, never
clinical. The palette (cream / sage / terracotta, soft rounded cards, generous
whitespace) exists to support that feeling — it should read like a nice modern
recipe app crossed with a wellness app, never like a hospital form.

## The central mechanic

- **My Foods** — the foods the user currently tolerates (`is_current`).
- A recipe qualifies for **Current Diet** only if *every* one of its
  ingredients is currently tolerated. See `isCurrentDiet()` in
  `lib/recipeStats.ts` — that one function is the heart of the app.
- Recipes pick ingredients from the user's own foods list (never free text),
  so the "every ingredient is tolerated" check is an exact ID match rather
  than fuzzy name matching. This was a deliberate early decision: free-typed
  ingredients would mean "egg" vs "eggs" silently breaks the safety filter.

## Stack

- **Expo SDK 54** + TypeScript + Expo Router (file-based routing, bottom tabs)
- **NativeWind v4** (Tailwind for React Native) + Tailwind v3
- **Supabase** — Postgres + Auth (email/password) + Storage + Edge Functions
- **TanStack Query** for server state
- Tested via **Expo Go** (no native build yet)

## Non-obvious things that will bite you

These are all real bugs we hit and fixed. Please don't undo them.

### SDK 54 is pinned on purpose
The published Expo Go app supported SDK 54 while the project was scaffolded
against 57, so Expo Go refused to open it. Do NOT upgrade the SDK without
first confirming the user's installed Expo Go supports the new version
(Expo Go → Settings → "Supported SDK"). See commit 1b7b6b0.

### `babel-preset-expo` must stay a direct devDependency
Under SDK 54's dependency tree npm nests it under `expo/node_modules` instead
of hoisting it, and `babel.config.js` then can't resolve it ("Cannot find
module 'babel-preset-expo'"). It's listed explicitly in package.json to force
hoisting. Don't "clean up" that seemingly-redundant dependency.

### Never use `<Link asChild>` — use `router.push()`
`Link asChild` clones its child to inject press handling. Combined with
NativeWind's component wrapping (react-native-css-interop), this threw
"Couldn't find a navigation context" crashes. Every navigation in this app
goes through `useRouter().push()` on a plain `Pressable`. See ad2726d, 8b7683b.

### Avoid dynamic conditional classNames on interactive components
`className={active ? "bg-white ..." : ""}` on a Pressable was implicated in
the same crash class. `components/ui/SegmentControl.tsx` deliberately uses
static `StyleSheet` objects for its active/inactive states instead. Prefer
that pattern for toggles.

### Tailwind variants like `first:` don't work reliably
Use index-based conditionals in `renderItem` instead (see the date headers in
`app/(tabs)/log.tsx` and category headers in `app/(tabs)/foods.tsx`).

### `expo-symbols` SDK 54 API
`SymbolView` takes `name` as a plain SF Symbol string plus an optional
`fallback` element — NOT the `{ios, android, web}` object from newer versions.

## Data model

All tables are per-user with RLS scoped to `auth.uid()`. Full schema (safe to
re-run) lives in `supabase/schema.sql`.

- `foods` — the user's ingredients. Three states via two booleans:
  - `is_current` → shows under **Current Foods**
  - `is_all_foods` → shows under **All Foods** (moved out of current, kept for
    quick re-adding)
  - both false → archived, hidden from both, but the row survives so recipes
    referencing it don't break
- `food_categories` — Protein / Veggie / Fruit / Carb / Herbs and Spices are
  seeded per-user by an `auth.users` insert trigger (plus a backfill for
  existing users). Users can add and delete their own.
- `food_category_members` — join table. Deleting a category never deletes a
  food and vice versa; only the link goes away.
- `recipes`, `recipe_ingredients` (carries a free-text `quantity` like
  "2 cups"), `tags`, `recipe_tags`
- `cook_logs` — one row per time a recipe was cooked (date + reaction of
  great/okay/rough + notes). "Times cooked" and "last cooked" are *derived*
  from these rows, never stored. This was chosen over single fields on the
  recipe so the user can see reaction history over time — important for MCAS,
  where the same recipe may go fine once and badly another time.
- Storage bucket `recipe-photos`, public-read, write-scoped to
  `<user_id>/` folder prefix.

## The AI recipe generator

`supabase/functions/generate-recipe/index.ts` (Deno Edge Function) calls Claude
with forced tool-use for structured output. The app never holds the API key.

**HARD SAFETY RULE — do not weaken this.** The model may ONLY use ingredients
from the user's Current Foods. This is not a preference; suggesting an
untested ingredient could cause a real physical reaction. It's enforced in
three layers, and all three should stay:
1. The candidate list is fetched **server-side** under the caller's own
   RLS-scoped session (the client never supplies the ingredient names).
2. The system prompt states the rule explicitly and says it overrides any
   other user request, including free-text "anything else" input.
3. The response is **re-validated** against the exact candidate list before
   anything is returned. Model output is never trusted blindly.

Setup required outside the repo: `ANTHROPIC_API_KEY` as a Supabase Edge
Function secret. `SUPABASE_URL` / `SUPABASE_ANON_KEY` are injected automatically.

## Project layout

```
app/
  (tabs)/           index=Recipes, foods=My Foods, log=Cook Log
  recipe/new/       index=choose manual vs AI, manual, generate (wizard)
  recipe/[id]/      index=detail, edit, log=add cook log entry
  login.tsx         email/password auth
components/ui/      Button, Card, Chip, TextField, SegmentControl, etc.
hooks/              one file per entity, TanStack Query wrappers
lib/
  api.ts            all Supabase calls
  types.ts          shared types
  recipeStats.ts    isCurrentDiet / timesCooked / lastCookedOn
  AuthProvider.tsx  session context
supabase/
  schema.sql        full schema, safe to re-run
  functions/        Edge Functions
```

## Working on this project

- `.env` is gitignored. It needs `EXPO_PUBLIC_SUPABASE_URL` and
  `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Note the project uses Supabase's newer
  `sb_publishable_...` key format, not the legacy JWT-style anon key.
- Before declaring anything done, run **both**:
  - `npx tsc --noEmit`
  - `npx expo export --platform ios` (catches runtime/bundling issues that
    typechecking misses)
- Schema changes: the user runs `supabase/schema.sql` themselves in the
  Supabase dashboard SQL Editor. Keep it idempotent (`if not exists`,
  `create or replace`, backfill migrations for added columns).
- Edge Function changes require a redeploy — remind the user, it's easy to
  forget and produces confusing stale behavior.
- The user is not a developer. Give exact, copy-pasteable steps, one at a
  time, and note they're on **Windows/PowerShell** (bash heredocs, `cat >`,
  and `&&` chaining don't work there).

## Roadmap — agreed but not built

Deliberately deferred, in rough priority order:

1. **Starter recipes** — a curated bank the owner authors, visible to all
   users, addable to their own recipes.
2. **Community recipes** — users publish recipes publicly; others browse and
   add. Filterable by "matches my current foods" vs "matches all my foods".
3. **Food bank** — a hardcoded list of commonly MCAS-safe foods, with
   one-tap add to Current Foods or All Foods.

**Architectural note for all three:** they need a shared/global food catalog.
Today each user owns private food rows, so "my chicken" and "your chicken" are
different rows — which means a shared recipe's ingredients can't be matched
against another user's tolerated list. The agreed fix is to make the food
catalog shared and have "My Foods" become a per-user tagging of which shared
foods are tolerated. Two decisions were open when this was shelved: (a)
copy-on-add vs live-link for shared recipes (leaning copy, so each user gets
their own cook log), and (b) whether community recipes need moderation.

4. **AI-generated recipe images** — considered and deliberately skipped for
   now; cost/complexity not worth it. Recipes use a sage-leaf placeholder and
   invite the user to add their own photo.
