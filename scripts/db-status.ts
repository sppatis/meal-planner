/**
 * Checks the PostgreSQL connection in DATABASE_URL, applies any pending schema changes and prints row counts.
 *
 * Usage: DATABASE_URL=postgresql://... npm run db:status
 */
async function main() {
  if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL to check a PostgreSQL database.");
  const { getSql } = await import("../src/lib/store/postgres");
  const sql = await getSql();
  const [who] = await sql`select current_user as "user", current_database() as db, version() as version`;
  const [{ v }] = await sql`select coalesce(max(version), 0)::int as v from schema_migrations`;
  console.log(`Connected as ${who.user} to ${who.db}. Schema version ${v}.\n${who.version}\n`);
  const tables = ["plans", "settings", "meal_slots", "ratings", "favourites", "photos", "price_overrides", "custom_recipes", "custom_ingredients"];
  for (const t of tables) {
    const [{ n }] = await sql`select count(*)::int as n from ${sql(t)}`;
    console.log(`${t.padEnd(20)} ${n}`);
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  },
);
