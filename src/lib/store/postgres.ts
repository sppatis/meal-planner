import postgres from "postgres";
import type { Ingredient, MealSlot, Photo, Plan, Recipe } from "@/lib/types";
import { photoUrl, removePhotoFile, savePhotoFile } from "./photo-files";
import { MIGRATIONS } from "./postgres-migrations";
import type { Store } from "./types";

/** Arbitrary constant so concurrent app instances don't migrate at the same time. */
const MIGRATION_LOCK = 724_105_331;

let client: postgres.Sql | null = null;
let ready: Promise<void> | null = null;

async function migrate(sql: postgres.Sql) {
  await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(${MIGRATION_LOCK})`;
    await tx`create table if not exists schema_migrations (
      version integer primary key,
      applied_at timestamptz not null default now()
    )`;
    const done = new Set((await tx<{ version: number }[]>`select version from schema_migrations`).map((r) => r.version));
    for (const [i, migration] of MIGRATIONS.entries()) {
      if (done.has(i + 1)) continue;
      await tx.unsafe(migration);
      await tx`insert into schema_migrations (version) values (${i + 1})`;
    }
  });
}

/** The connection, with the schema brought up to date the first time it's used. */
export async function getSql() {
  client ??= postgres(process.env.DATABASE_URL!, { max: 5, idle_timeout: 30, onnotice: () => {} });
  const sql = client;
  ready ??= migrate(sql).catch((err) => {
    ready = null;
    throw err;
  });
  await ready;
  return sql;
}

export async function closeSql() {
  await client?.end();
  client = null;
  ready = null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface PhotoRow {
  id: string;
  recipe_slug: string;
  file_name: string;
  created_at: Date;
}

const toPhoto = (row: PhotoRow): Photo => ({
  id: row.id,
  recipeSlug: row.recipe_slug,
  url: photoUrl(row.file_name),
  createdAt: row.created_at.toISOString(),
});

export const postgresStore: Store = {
  async getPlans() {
    const sql = await getSql();
    const rows = await sql<{ data: Plan }[]>`select data from plans`;
    return rows.map((r) => r.data).sort((a, b) => a.startDate.localeCompare(b.startDate));
  },
  async savePlan(plan) {
    const sql = await getSql();
    await sql`insert into plans (id, data) values (${plan.id}, ${sql.json(plan as never)})
      on conflict (id) do update set data = excluded.data`;
  },
  async deletePlan(id) {
    const sql = await getSql();
    await sql.begin(async (tx) => {
      await tx`delete from plans where id = ${id}`;
      await tx`delete from settings where key = 'active_plan_id' and value = ${tx.json(id)}`;
    });
  },
  async getActivePlanId() {
    const sql = await getSql();
    const [row] = await sql<{ value: string }[]>`select value from settings where key = 'active_plan_id'`;
    return row?.value ?? null;
  },
  async setActivePlanId(id) {
    const sql = await getSql();
    await sql`insert into settings (key, value) values ('active_plan_id', ${sql.json(id)})
      on conflict (key) do update set value = excluded.value`;
  },

  async getSlots(planId) {
    const sql = await getSql();
    const rows = await sql<{ date: string; role: MealSlot["role"]; recipe_slug: string }[]>`
      select date::text as date, role, recipe_slug from meal_slots where plan_id = ${planId} order by date`;
    return rows.map((r) => ({ date: r.date, role: r.role, recipeSlug: r.recipe_slug }));
  },
  async replaceSlots(planId, dates, slots) {
    const sql = await getSql();
    await sql.begin(async (tx) => {
      if (dates.length) await tx`delete from meal_slots where plan_id = ${planId} and date = any(${dates}::date[])`;
      if (slots.length) {
        const rows = slots.map((s) => ({ plan_id: planId, date: s.date, role: s.role, recipe_slug: s.recipeSlug }));
        await tx`insert into meal_slots ${tx(rows, "plan_id", "date", "role", "recipe_slug")}
          on conflict (plan_id, date) do update set role = excluded.role, recipe_slug = excluded.recipe_slug`;
      }
    });
  },
  async setSlotRecipe(planId, date, recipeSlug) {
    const sql = await getSql();
    await sql`update meal_slots set recipe_slug = ${recipeSlug} where plan_id = ${planId} and date = ${date}`;
  },

  async getRatings() {
    const sql = await getSql();
    const rows = await sql<{ recipe_slug: string; stars: number }[]>`select recipe_slug, stars from ratings`;
    return Object.fromEntries(rows.map((r) => [r.recipe_slug, r.stars]));
  },
  async setRating(recipeSlug, stars) {
    const sql = await getSql();
    await sql`insert into ratings (recipe_slug, stars) values (${recipeSlug}, ${stars})
      on conflict (recipe_slug) do update set stars = excluded.stars, updated_at = now()`;
  },

  async getFavourites() {
    const sql = await getSql();
    return (await sql<{ recipe_slug: string }[]>`select recipe_slug from favourites order by created_at`).map(
      (r) => r.recipe_slug,
    );
  },
  async setFavourite(recipeSlug, favourite) {
    const sql = await getSql();
    if (favourite) await sql`insert into favourites (recipe_slug) values (${recipeSlug}) on conflict do nothing`;
    else await sql`delete from favourites where recipe_slug = ${recipeSlug}`;
  },

  async getPhotos(recipeSlug) {
    const sql = await getSql();
    const rows = recipeSlug
      ? await sql<PhotoRow[]>`select * from photos where recipe_slug = ${recipeSlug} order by created_at desc`
      : await sql<PhotoRow[]>`select * from photos order by created_at desc`;
    return rows.map(toPhoto);
  },
  async addPhoto(recipeSlug, file) {
    const sql = await getSql();
    const { id, fileName } = await savePhotoFile(file);
    const [row] = await sql<PhotoRow[]>`
      insert into photos (id, recipe_slug, file_name) values (${id}, ${recipeSlug}, ${fileName}) returning *`;
    return toPhoto(row);
  },
  async deletePhoto(id) {
    if (!UUID.test(id)) return;
    const sql = await getSql();
    const [row] = await sql<PhotoRow[]>`delete from photos where id = ${id} returning *`;
    if (row) await removePhotoFile(row.file_name);
  },

  async getPriceOverrides() {
    const sql = await getSql();
    const rows = await sql<{ ingredient_id: string; price: string }[]>`select ingredient_id, price from price_overrides`;
    return Object.fromEntries(rows.map((r) => [r.ingredient_id, Number(r.price)]));
  },
  async setPriceOverride(ingredientId, price) {
    const sql = await getSql();
    if (price === null) await sql`delete from price_overrides where ingredient_id = ${ingredientId}`;
    else {
      await sql`insert into price_overrides (ingredient_id, price) values (${ingredientId}, ${price})
        on conflict (ingredient_id) do update set price = excluded.price`;
    }
  },

  async getCustomRecipes() {
    const sql = await getSql();
    return (await sql<{ data: Recipe }[]>`select data from custom_recipes order by updated_at`).map((r) => r.data);
  },
  async saveCustomRecipe(recipe) {
    const sql = await getSql();
    await sql`insert into custom_recipes (slug, data) values (${recipe.slug}, ${sql.json(recipe as never)})
      on conflict (slug) do update set data = excluded.data, updated_at = now()`;
  },
  async deleteCustomRecipe(slug) {
    const sql = await getSql();
    await sql`delete from custom_recipes where slug = ${slug}`;
  },

  async getCustomIngredients() {
    const sql = await getSql();
    return (await sql<{ data: Ingredient }[]>`select data from custom_ingredients`).map((r) => r.data);
  },
  async saveCustomIngredient(ingredient) {
    const sql = await getSql();
    await sql`insert into custom_ingredients (id, data) values (${ingredient.id}, ${sql.json(ingredient as never)})
      on conflict (id) do update set data = excluded.data`;
  },
};
