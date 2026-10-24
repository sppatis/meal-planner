-- Run this once in the Supabase SQL editor (Dashboard > SQL Editor > New query).
-- All access goes through the Next.js server using the service role key,
-- so Row Level Security is enabled with no public policies.

create table if not exists plans (
  id text primary key,
  data jsonb not null
);

-- Small key/value settings, e.g. which plan is active.
create table if not exists settings (
  key text primary key,
  value jsonb not null
);

create table if not exists meal_slots (
  plan_id text not null references plans (id) on delete cascade,
  date date not null,
  role text not null check (role in ('rice', 'pasta', 'potato', 'veggie', 'fakeaway', 'extra')),
  recipe_slug text not null,
  primary key (plan_id, date)
);

create table if not exists ratings (
  recipe_slug text primary key,
  stars smallint not null check (stars between 1 and 5),
  updated_at timestamptz not null default now()
);

create table if not exists favourites (
  recipe_slug text primary key,
  created_at timestamptz not null default now()
);

create table if not exists photos (
  id uuid primary key default gen_random_uuid(),
  recipe_slug text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);
create index if not exists photos_recipe_slug_idx on photos (recipe_slug);

create table if not exists price_overrides (
  ingredient_id text primary key,
  price numeric(6, 2) not null check (price >= 0)
);

-- Recipes and ingredients added in the app, stored in the same shape as the built-in ones.
create table if not exists custom_recipes (
  slug text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists custom_ingredients (
  id text primary key,
  data jsonb not null
);

alter table plans enable row level security;
alter table settings enable row level security;
alter table meal_slots enable row level security;
alter table ratings enable row level security;
alter table favourites enable row level security;
alter table photos enable row level security;
alter table price_overrides enable row level security;
alter table custom_recipes enable row level security;
alter table custom_ingredients enable row level security;

-- Public bucket so photo URLs can be shown on the share pages.
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;
