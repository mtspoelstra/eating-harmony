-- Eating Harmony: MCAS recipe app schema
-- Paste this whole file into Supabase Dashboard -> SQL Editor -> New query -> Run.
-- Safe to re-run: uses "if not exists" / "or replace" where possible.

create extension if not exists "pgcrypto";

-- ============================================================
-- FOODS (master ingredient list, per user)
-- A food lives in exactly one bucket at a time:
--   is_current = true   -> shows under "Current Foods"
--   is_all_foods = true -> shows under "All Foods" (moved out of current,
--                          kept around for quick re-adding)
--   both false           -> archived/hidden from both lists
-- Recipes reference foods via recipe_ingredients, so moving a food out of
-- Current Foods just makes recipes that use it drop out of "Current Diet"
-- -- it does not delete the food or break any recipe.
-- ============================================================
create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  is_current boolean not null default true,
  is_all_foods boolean not null default false,
  created_at timestamptz not null default now()
);

-- If this table already existed before is_all_foods was added, this backfills
-- existing rows so nothing that was visible before silently disappears:
alter table public.foods add column if not exists is_all_foods boolean;
update public.foods set is_all_foods = true where is_current = false and is_all_foods is null;
update public.foods set is_all_foods = false where is_all_foods is null;
alter table public.foods alter column is_all_foods set default false;
alter table public.foods alter column is_all_foods set not null;

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
-- FOOD_CATEGORIES (per user, e.g. Protein, Veggie, Fruit, Carb...)
-- Every user gets the 5 defaults seeded automatically (new users via the
-- trigger below; existing users via the one-time backfill further down).
-- Deleting a category never deletes any food, and deleting a food never
-- deletes any category -- only the link between them (food_category_members)
-- goes away, via that join table's own delete cascades.
-- ============================================================
create table if not exists public.food_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists food_categories_user_name_unique
  on public.food_categories (user_id, lower(name));

alter table public.food_categories enable row level security;

drop policy if exists "food_categories_select_own" on public.food_categories;
create policy "food_categories_select_own" on public.food_categories
  for select using (auth.uid() = user_id);

drop policy if exists "food_categories_insert_own" on public.food_categories;
create policy "food_categories_insert_own" on public.food_categories
  for insert with check (auth.uid() = user_id);

drop policy if exists "food_categories_update_own" on public.food_categories;
create policy "food_categories_update_own" on public.food_categories
  for update using (auth.uid() = user_id);

drop policy if exists "food_categories_delete_own" on public.food_categories;
create policy "food_categories_delete_own" on public.food_categories
  for delete using (auth.uid() = user_id);

-- ============================================================
-- FOOD_CATEGORY_MEMBERS (join table: foods <-> food_categories)
-- ============================================================
create table if not exists public.food_category_members (
  food_id uuid not null references public.foods (id) on delete cascade,
  category_id uuid not null references public.food_categories (id) on delete cascade,
  primary key (food_id, category_id)
);

alter table public.food_category_members enable row level security;

drop policy if exists "food_category_members_select_own" on public.food_category_members;
create policy "food_category_members_select_own" on public.food_category_members
  for select using (
    exists (select 1 from public.foods f where f.id = food_id and f.user_id = auth.uid())
  );

drop policy if exists "food_category_members_insert_own" on public.food_category_members;
create policy "food_category_members_insert_own" on public.food_category_members
  for insert with check (
    exists (select 1 from public.foods f where f.id = food_id and f.user_id = auth.uid())
  );

drop policy if exists "food_category_members_delete_own" on public.food_category_members;
create policy "food_category_members_delete_own" on public.food_category_members
  for delete using (
    exists (select 1 from public.foods f where f.id = food_id and f.user_id = auth.uid())
  );

-- Seed the 5 default categories for every NEW user automatically.
create or replace function public.seed_default_food_categories()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.food_categories (user_id, name, is_default)
  values
    (new.id, 'Protein', true),
    (new.id, 'Veggie', true),
    (new.id, 'Fruit', true),
    (new.id, 'Carb', true),
    (new.id, 'Herbs and Spices', true)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_seed_categories on auth.users;
create trigger on_auth_user_created_seed_categories
  after insert on auth.users
  for each row execute function public.seed_default_food_categories();

-- Backfill: seed the defaults for any user who already existed before this
-- ran (the trigger above only fires for brand-new signups).
insert into public.food_categories (user_id, name, is_default)
select u.id, cat.name, true
from auth.users u
cross join (values ('Protein'), ('Veggie'), ('Fruit'), ('Carb'), ('Herbs and Spices')) as cat(name)
on conflict do nothing;

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
-- "quantity" is free text ("2 cups", "1 tbsp") so it stays flexible.
-- ============================================================
create table if not exists public.recipe_ingredients (
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  food_id uuid not null references public.foods (id) on delete cascade,
  quantity text,
  primary key (recipe_id, food_id)
);

alter table public.recipe_ingredients add column if not exists quantity text;

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
