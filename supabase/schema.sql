-- Eating Harmony: MCAS recipe app schema
-- Paste this whole file into Supabase Dashboard -> SQL Editor -> New query -> Run.
-- Safe to re-run: uses "if not exists" / "or replace" where possible.

create extension if not exists "pgcrypto";

-- ============================================================
-- FOODS (master ingredient list, per user)
-- "is_current" = whether it's on the user's currently-tolerated list ("My Foods").
-- Recipes reference foods via recipe_ingredients, so removing a food from
-- My Foods (is_current = false) just makes recipes that use it drop out of
-- "Current Diet" -- it does not delete the food or break any recipe.
-- ============================================================
create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  is_current boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists foods_user_name_unique
  on public.foods (user_id, lower(name));

alter table public.foods enable row level security;

drop policy if exists "foods_select_own" on public.foods;
create policy "foods_select_own" on public.foods
  for select using (auth.uid() = user_id);

drop policy if exists "foods_insert_own" on public.foods;
create policy "foods_insert_own" on public.foods
  for insert with check (auth.uid() = user_id);

drop policy if exists "foods_update_own" on public.foods;
create policy "foods_update_own" on public.foods
  for update using (auth.uid() = user_id);

drop policy if exists "foods_delete_own" on public.foods;
create policy "foods_delete_own" on public.foods
  for delete using (auth.uid() = user_id);

-- ============================================================
-- TAGS (per user, e.g. Breakfast, Dinner, Quick, Comfort Food)
-- ============================================================
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists tags_user_name_unique
  on public.tags (user_id, lower(name));

alter table public.tags enable row level security;

drop policy if exists "tags_select_own" on public.tags;
create policy "tags_select_own" on public.tags
  for select using (auth.uid() = user_id);

drop policy if exists "tags_insert_own" on public.tags;
create policy "tags_insert_own" on public.tags
  for insert with check (auth.uid() = user_id);

drop policy if exists "tags_update_own" on public.tags;
create policy "tags_update_own" on public.tags
  for update using (auth.uid() = user_id);

drop policy if exists "tags_delete_own" on public.tags;
create policy "tags_delete_own" on public.tags
  for delete using (auth.uid() = user_id);

-- ============================================================
-- RECIPES
-- ============================================================
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  steps text[] not null default '{}',
  photo_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.recipes enable row level security;

drop policy if exists "recipes_select_own" on public.recipes;
create policy "recipes_select_own" on public.recipes
  for select using (auth.uid() = user_id);

drop policy if exists "recipes_insert_own" on public.recipes;
create policy "recipes_insert_own" on public.recipes
  for insert with check (auth.uid() = user_id);

drop policy if exists "recipes_update_own" on public.recipes;
create policy "recipes_update_own" on public.recipes
  for update using (auth.uid() = user_id);

drop policy if exists "recipes_delete_own" on public.recipes;
create policy "recipes_delete_own" on public.recipes
  for delete using (auth.uid() = user_id);

-- ============================================================
-- RECIPE_INGREDIENTS (join table: recipe <-> foods)
-- ============================================================
create table if not exists public.recipe_ingredients (
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  food_id uuid not null references public.foods (id) on delete cascade,
  primary key (recipe_id, food_id)
);

alter table public.recipe_ingredients enable row level security;

drop policy if exists "recipe_ingredients_select_own" on public.recipe_ingredients;
create policy "recipe_ingredients_select_own" on public.recipe_ingredients
  for select using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and r.user_id = auth.uid()
    )
  );

drop policy if exists "recipe_ingredients_insert_own" on public.recipe_ingredients;
create policy "recipe_ingredients_insert_own" on public.recipe_ingredients
  for insert with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and r.user_id = auth.uid()
    )
  );

drop policy if exists "recipe_ingredients_delete_own" on public.recipe_ingredients;
create policy "recipe_ingredients_delete_own" on public.recipe_ingredients
  for delete using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and r.user_id = auth.uid()
    )
  );

-- ============================================================
-- RECIPE_TAGS (join table: recipe <-> tags)
-- ============================================================
create table if not exists public.recipe_tags (
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (recipe_id, tag_id)
);

alter table public.recipe_tags enable row level security;

drop policy if exists "recipe_tags_select_own" on public.recipe_tags;
create policy "recipe_tags_select_own" on public.recipe_tags
  for select using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and r.user_id = auth.uid()
    )
  );

drop policy if exists "recipe_tags_insert_own" on public.recipe_tags;
create policy "recipe_tags_insert_own" on public.recipe_tags
  for insert with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and r.user_id = auth.uid()
    )
  );

drop policy if exists "recipe_tags_delete_own" on public.recipe_tags;
create policy "recipe_tags_delete_own" on public.recipe_tags
  for delete using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and r.user_id = auth.uid()
    )
  );

-- ============================================================
-- COOK_LOGS (one row per time a recipe was cooked)
-- reaction is a quick-glance signal; notes is freeform detail.
-- "times cooked" / "last cooked" are derived by counting/max(cooked_on).
-- ============================================================
create table if not exists public.cook_logs (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  cooked_on date not null default current_date,
  reaction text not null check (reaction in ('great', 'okay', 'rough')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists cook_logs_recipe_id_idx on public.cook_logs (recipe_id);

alter table public.cook_logs enable row level security;

drop policy if exists "cook_logs_select_own" on public.cook_logs;
create policy "cook_logs_select_own" on public.cook_logs
  for select using (auth.uid() = user_id);

drop policy if exists "cook_logs_insert_own" on public.cook_logs;
create policy "cook_logs_insert_own" on public.cook_logs
  for insert with check (auth.uid() = user_id);

drop policy if exists "cook_logs_update_own" on public.cook_logs;
create policy "cook_logs_update_own" on public.cook_logs
  for update using (auth.uid() = user_id);

drop policy if exists "cook_logs_delete_own" on public.cook_logs;
create policy "cook_logs_delete_own" on public.cook_logs
  for delete using (auth.uid() = user_id);

-- ============================================================
-- STORAGE: recipe photos
-- Public-read bucket (so <Image> can load the URL directly), but only the
-- owning user can upload/replace/delete their own files. Files are stored
-- as "<user_id>/<recipe_id>.jpg" so ownership is enforced by folder name.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('recipe-photos', 'recipe-photos', true)
on conflict (id) do nothing;

drop policy if exists "recipe_photos_public_read" on storage.objects;
create policy "recipe_photos_public_read" on storage.objects
  for select using (bucket_id = 'recipe-photos');

drop policy if exists "recipe_photos_owner_insert" on storage.objects;
create policy "recipe_photos_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'recipe-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "recipe_photos_owner_update" on storage.objects;
create policy "recipe_photos_owner_update" on storage.objects
  for update using (
    bucket_id = 'recipe-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "recipe_photos_owner_delete" on storage.objects;
create policy "recipe_photos_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'recipe-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
