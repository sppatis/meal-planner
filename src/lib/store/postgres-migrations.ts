/**
 * Schema changes for the PostgreSQL store, applied in order on first connection and recorded in
 * `schema_migrations`. Never edit a migration that has shipped; add a new one instead.
 */
export const MIGRATIONS: string[] = [
  `
  create table plans (
    id text primary key,
    data jsonb not null
  );

  create table settings (
    key text primary key,
    value jsonb not null
  );

  create table meal_slots (
    plan_id text not null references plans (id) on delete cascade,
    date date not null,
    role text not null check (role in ('rice', 'pasta', 'potato', 'veggie', 'fakeaway', 'extra')),
    recipe_slug text not null,
    primary key (plan_id, date)
  );

  create table ratings (
    recipe_slug text primary key,
    stars smallint not null check (stars between 1 and 5),
    updated_at timestamptz not null default now()
  );

  create table favourites (
    recipe_slug text primary key,
    created_at timestamptz not null default now()
  );

  create table photos (
    id uuid primary key,
    recipe_slug text not null,
    file_name text not null,
    created_at timestamptz not null default now()
  );
  create index photos_recipe_slug_idx on photos (recipe_slug);

  create table price_overrides (
    ingredient_id text primary key,
    price numeric(6, 2) not null check (price >= 0)
  );

  create table custom_recipes (
    slug text primary key,
    data jsonb not null,
    updated_at timestamptz not null default now()
  );

  create table custom_ingredients (
    id text primary key,
    data jsonb not null
  );
  `,
];
