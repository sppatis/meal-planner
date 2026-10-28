/**
 * Copies a local `.data/db.json` into the PostgreSQL database in DATABASE_URL.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... npm run db:import                  # refuses if the database already has data
 *   DATABASE_URL=postgresql://... npm run db:import -- --replace     # wipes the database first
 *   DATABASE_URL=postgresql://... npm run db:import -- --file other.json
 *
 * Photo files aren't copied: copy `.data/photos/` to the server's photos directory separately.
 */
import { existsSync, readFileSync } from "fs";
import path from "path";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const value = (name: string) => args[args.indexOf(`--${name}`) + 1];

const TABLES = [
  "meal_slots",
  "plans",
  "settings",
  "ratings",
  "favourites",
  "photos",
  "price_overrides",
  "custom_recipes",
  "custom_ingredients",
];

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL to the PostgreSQL database to import into.");
  const { DEFAULT_PLAN } = await import("../src/lib/constants");
  const { LOCAL_PHOTO_DIR } = await import("../src/lib/store/photo-files");
  const { getSql } = await import("../src/lib/store/postgres");
  type LocalDb = import("../src/lib/store/local").LocalDb;

  const file = flag("file") ? value("file") : ".data/db.json";
  const db: LocalDb = JSON.parse(readFileSync(file, "utf8"));
  const slots = (db.slots ?? []).map((s) => ({ ...s, planId: s.planId ?? DEFAULT_PLAN.id }));

  const sql = await getSql();
  const counts = await Promise.all(TABLES.map(async (t) => [t, (await sql`select count(*)::int as n from ${sql(t)}`)[0].n] as const));
  const existing = counts.filter(([, n]) => n > 0);
  if (existing.length && !flag("replace")) {
    throw new Error(
      `The database already has data (${existing.map(([t, n]) => `${n} ${t}`).join(", ")}). ` +
        "Re-run with --replace to overwrite it.",
    );
  }

  await sql.begin(async (tx) => {
    if (existing.length) await tx`truncate ${tx(TABLES)}`;
    for (const plan of db.plans ?? []) {
      await tx`insert into plans (id, data) values (${plan.id}, ${tx.json(plan as never)})`;
    }
    if (db.activePlanId) {
      await tx`insert into settings (key, value) values ('active_plan_id', ${tx.json(db.activePlanId)})`;
    }
    const planIds = new Set((db.plans ?? []).map((p) => p.id));
    const slotRows = slots
      .filter((s) => planIds.has(s.planId))
      .map((s) => ({ plan_id: s.planId, date: s.date, role: s.role, recipe_slug: s.recipeSlug }));
    if (slotRows.length) await tx`insert into meal_slots ${tx(slotRows, "plan_id", "date", "role", "recipe_slug")}`;

    const ratings = Object.entries(db.ratings ?? {}).map(([recipe_slug, stars]) => ({ recipe_slug, stars }));
    if (ratings.length) await tx`insert into ratings ${tx(ratings, "recipe_slug", "stars")}`;
    const favourites = (db.favourites ?? []).map((recipe_slug) => ({ recipe_slug }));
    if (favourites.length) await tx`insert into favourites ${tx(favourites, "recipe_slug")}`;
    const photos = (db.photos ?? []).map((p) => ({
      id: p.id,
      recipe_slug: p.recipeSlug,
      file_name: path.basename(p.url),
      created_at: p.createdAt,
    }));
    if (photos.length) await tx`insert into photos ${tx(photos, "id", "recipe_slug", "file_name", "created_at")}`;
    const prices = Object.entries(db.prices ?? {}).map(([ingredient_id, price]) => ({ ingredient_id, price }));
    if (prices.length) await tx`insert into price_overrides ${tx(prices, "ingredient_id", "price")}`;
    for (const r of db.customRecipes ?? []) {
      await tx`insert into custom_recipes (slug, data) values (${r.slug}, ${tx.json(r as never)})`;
    }
    for (const i of db.customIngredients ?? []) {
      await tx`insert into custom_ingredients (id, data) values (${i.id}, ${tx.json(i as never)})`;
    }
  });

  console.log(
    `Imported ${db.plans?.length ?? 0} plans, ${slots.length} dinners, ${Object.keys(db.ratings ?? {}).length} ratings, ` +
      `${db.favourites?.length ?? 0} favourites, ${db.photos?.length ?? 0} photos, ` +
      `${Object.keys(db.prices ?? {}).length} prices, ${db.customRecipes?.length ?? 0} recipes and ` +
      `${db.customIngredients?.length ?? 0} ingredients of your own.`,
  );
  const missing = (db.photos ?? []).filter((p) => !existsSync(path.join(LOCAL_PHOTO_DIR, path.basename(p.url))));
  if (db.photos?.length) {
    console.log(
      `Copy ${LOCAL_PHOTO_DIR} to the server's photos directory too` +
        (missing.length ? ` (${missing.length} photo files are missing locally).` : "."),
    );
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  },
);
