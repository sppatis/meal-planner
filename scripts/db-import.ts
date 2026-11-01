/**
 * Copies a local `.data/db.json` into the PostgreSQL database in DATABASE_URL.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... npm run db:import                  # refuses if the database already has data
 *   DATABASE_URL=postgresql://... npm run db:import -- --replace     # wipes the database first
 *   DATABASE_URL=postgresql://... npm run db:import -- --file other.json
 *   DATABASE_URL=postgresql://... npm run db:import -- --household smith-family
 *       # files from before households existed belong to "home"; this imports them as another household instead
 *
 * Photo files aren't copied: copy `.data/photos/` to the server's photos directory separately.
 */
import { existsSync, readFileSync } from "fs";
import path from "path";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const value = (name: string) => args[args.indexOf(`--${name}`) + 1];

const DATA_TABLES = [
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
  const { LOCAL_PHOTO_DIR } = await import("../src/lib/store/photo-files");
  const { normaliseLocalDb } = await import("../src/lib/store/local");
  const { getSql } = await import("../src/lib/store/postgres");
  const { HOME_HOUSEHOLD } = await import("../src/lib/store/types");

  const file = flag("file") ? value("file") : ".data/db.json";
  const db = normaliseLocalDb(JSON.parse(readFileSync(file, "utf8")));
  if (flag("household")) {
    const target = value("household");
    if (!/^[a-z0-9-]+$/.test(target ?? "")) throw new Error("--household needs an id like smith-family");
    if (db.households.some((h) => h.id === target)) throw new Error(`The file already has a household "${target}".`);
    const rename = (id: string) => (id === HOME_HOUSEHOLD ? target : id);
    db.households = db.households.map((h) => (h.id === HOME_HOUSEHOLD ? { ...h, id: target, name: target } : h));
    db.plans = db.plans.map((p) => ({ ...p, householdId: rename(p.householdId) }));
    db.slots = db.slots.map((s) => ({ ...s, householdId: rename(s.householdId) }));
    for (const key of ["activePlanIds", "ratings", "favourites"] as const) {
      db[key] = Object.fromEntries(Object.entries(db[key]).map(([h, v]) => [rename(h), v])) as never;
    }
  }

  const sql = await getSql();
  const counts = await Promise.all(
    DATA_TABLES.map(async (t) => [t, (await sql`select count(*)::int as n from ${sql(t)}`)[0].n] as const),
  );
  const existing = counts.filter(([, n]) => n > 0);
  if (existing.length && !flag("replace")) {
    throw new Error(
      `The database already has data (${existing.map(([t, n]) => `${n} ${t}`).join(", ")}). ` +
        "Re-run with --replace to overwrite it.",
    );
  }

  await sql.begin(async (tx) => {
    if (flag("replace")) await tx.unsafe(`truncate ${[...DATA_TABLES, "households"].join(", ")}`);
    for (const h of db.households) {
      await tx`insert into households (id, name, passcode_hash, session_version, created_at)
        values (${h.id}, ${h.name}, ${h.passcodeHash}, ${h.sessionVersion}, ${h.createdAt})
        on conflict (id) do update set name = excluded.name, passcode_hash = excluded.passcode_hash,
          session_version = excluded.session_version`;
    }
    for (const { householdId, ...plan } of db.plans) {
      await tx`insert into plans (household_id, id, data) values (${householdId}, ${plan.id}, ${tx.json(plan as never)})`;
    }
    for (const [householdId, planId] of Object.entries(db.activePlanIds)) {
      await tx`insert into settings (household_id, key, value) values (${householdId}, 'active_plan_id', ${tx.json(planId)})`;
    }
    const planKeys = new Set(db.plans.map((p) => `${p.householdId}/${p.id}`));
    const slotRows = db.slots
      .filter((s) => planKeys.has(`${s.householdId}/${s.planId}`))
      .map((s) => ({
        household_id: s.householdId,
        plan_id: s.planId,
        date: s.date,
        role: s.role,
        recipe_slug: s.recipeSlug,
      }));
    if (slotRows.length) {
      await tx`insert into meal_slots ${tx(slotRows, "household_id", "plan_id", "date", "role", "recipe_slug")}`;
    }

    const ratings = Object.entries(db.ratings).flatMap(([household_id, stars]) =>
      Object.entries(stars).map(([recipe_slug, n]) => ({ household_id, recipe_slug, stars: n })),
    );
    if (ratings.length) await tx`insert into ratings ${tx(ratings, "household_id", "recipe_slug", "stars")}`;
    const favourites = Object.entries(db.favourites).flatMap(([household_id, slugs]) =>
      slugs.map((recipe_slug) => ({ household_id, recipe_slug })),
    );
    if (favourites.length) await tx`insert into favourites ${tx(favourites, "household_id", "recipe_slug")}`;

    const photos = db.photos.map((p) => ({
      id: p.id,
      recipe_slug: p.recipeSlug,
      file_name: path.basename(p.url),
      created_at: p.createdAt,
    }));
    if (photos.length) await tx`insert into photos ${tx(photos, "id", "recipe_slug", "file_name", "created_at")}`;
    const prices = Object.entries(db.prices).map(([ingredient_id, price]) => ({ ingredient_id, price }));
    if (prices.length) await tx`insert into price_overrides ${tx(prices, "ingredient_id", "price")}`;
    for (const r of db.customRecipes) {
      await tx`insert into custom_recipes (slug, data) values (${r.slug}, ${tx.json(r as never)})`;
    }
    for (const i of db.customIngredients) {
      await tx`insert into custom_ingredients (id, data) values (${i.id}, ${tx.json(i as never)})`;
    }
  });

  const count = (o: Record<string, object>) => Object.values(o).reduce((n, v) => n + Object.keys(v).length, 0);
  console.log(
    `Imported ${db.households.length} households (${db.households.map((h) => h.id).join(", ")}), ` +
      `${db.plans.length} plans, ${db.slots.length} dinners, ${count(db.ratings)} ratings, ` +
      `${count(db.favourites)} favourites, ${db.photos.length} photos, ${Object.keys(db.prices).length} prices, ` +
      `${db.customRecipes.length} recipes and ${db.customIngredients.length} ingredients of your own.`,
  );
  const missing = db.photos.filter((p) => !existsSync(path.join(LOCAL_PHOTO_DIR, path.basename(p.url))));
  if (db.photos.length) {
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
