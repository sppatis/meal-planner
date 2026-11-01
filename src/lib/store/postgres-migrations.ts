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
  // Households: plans, dinners, ratings, favourites and the active plan belong to one household.
  // Everything saved before this belongs to "home".
  `
  create table households (
    id text primary key,
    name text not null,
    passcode_hash text,
    session_version integer not null default 1,
    created_at timestamptz not null default now()
  );
  insert into households (id, name) values ('home', 'Home');

  alter table meal_slots drop constraint meal_slots_plan_id_fkey;
  alter table meal_slots drop constraint meal_slots_pkey;
  alter table plans drop constraint plans_pkey;
  alter table settings drop constraint settings_pkey;
  alter table ratings drop constraint ratings_pkey;
  alter table favourites drop constraint favourites_pkey;

  alter table plans add column household_id text not null default 'home' references households (id) on delete cascade;
  alter table meal_slots add column household_id text not null default 'home';
  alter table settings add column household_id text not null default 'home' references households (id) on delete cascade;
  alter table ratings add column household_id text not null default 'home' references households (id) on delete cascade;
  alter table favourites add column household_id text not null default 'home' references households (id) on delete cascade;

  alter table plans alter column household_id drop default;
  alter table meal_slots alter column household_id drop default;
  alter table settings alter column household_id drop default;
  alter table ratings alter column household_id drop default;
  alter table favourites alter column household_id drop default;

  alter table plans add primary key (household_id, id);
  alter table meal_slots add primary key (household_id, plan_id, date);
  alter table meal_slots add foreign key (household_id, plan_id) references plans (household_id, id) on delete cascade;
  alter table settings add primary key (household_id, key);
  alter table ratings add primary key (household_id, recipe_slug);
  alter table favourites add primary key (household_id, recipe_slug);
  `,

  // 3: price corrections per supermarket. Corrections saved so far were Tesco prices.
  `
  alter table price_overrides drop constraint price_overrides_pkey;
  alter table price_overrides add column store text not null default 'tesco';
  alter table price_overrides alter column store drop default;
  alter table price_overrides add primary key (store, ingredient_id);
  `,

  // 4: recipes a household has turned off so they aren't planned.
  `
  create table hidden_recipes (
    household_id text not null references households (id) on delete cascade,
    recipe_slug text not null,
    created_at timestamptz not null default now(),
    primary key (household_id, recipe_slug)
  );
  `,
];
