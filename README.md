# Dinner Planner

Dinner plans for three adults. The first plan, **Road to Australia**, runs for 20 weeks (Mon 2 Nov 2026 to Sun 21 Mar
2027), and you can add more.

- Every dinner is free of fish, shellfish and nuts, and under 1,000 kcal per person.
- Each week has a rice dish, pasta dish, potato dish, veggie option, a Friday or Saturday fake-away, and 2 extras.
- Each plan has its own quick nights (Monday to Wednesday by default), which get dinners ready in 25 minutes or less.
- Each week stays within the plan's budget (£60 by default) at estimated Tesco prices.
- Recipes give gas mark temperatures, and many have a Ninja Dual Zone air fryer method.

## Using the app

- **Plan** (homepage): the active plan's weeks as cards. Tap a card for the recipe, or **Replace** to swap in a
  favourite. The dialog shows the new weekly cost. **Shuffle week** regenerates a whole week.
- **Plans**: every plan with its dates, budget and left-out ingredients. **New plan** asks for a title, start date
  (weeks run Monday to Sunday), number of weeks, weekly budget, quick nights and any ingredients to leave out. Tap the
  days that need a quick dinner. Type an ingredient and press Enter to add it; tap the × on its tag to remove it. The form shows which dinners will be left out before you
  save, and every dinner is planned automatically. **Make active** puts a plan on the homepage. Other plans can be
  viewed, edited or deleted. Changing a plan's dates re-plans it; changing the budget, quick nights or ingredients only
  replaces the dinners that no longer fit, unless you tick **Re-plan every dinner**.
- **Recipe page**: shopping list with Tesco links, method, Ninja method, photo upload, 5-star rating and favourite toggle.
  Recipes rated 4 stars or more automatically become favourites.
- **Our recipes**: on Recipes, tap **Add a recipe** to add your own. Pick ingredients from the Tesco catalogue (or add
  a new one with its pack price and label nutrition) and the calories, cost, shopping list and MyFitnessPal page are
  worked out the same way as the built-in recipes. Saving is blocked if it mentions fish or nuts or goes over 1,000 kcal.
  Your recipes always appear as favourites in **Replace**, and can be edited or deleted from their page.
- **Shopping list** (per week): combined list grouped by aisle, with a separate cupboard check for staples. Ticks are
  remembered on each phone.
- **Prices**: Tesco has no public price feed, so prices are estimates. Edit any price and every budget recalculates.
- **MyFitnessPal**: on a recipe, tap **Copy link**. In MyFitnessPal go to Recipes, then Create a Recipe, then Add from
  web, paste the link, set servings to 3 and save. Each person logs 1 serving. **Copy nutrition** is there for Quick Add.
  The `/share/recipe/...` pages are public (no passcode) so MyFitnessPal can read them.

## Local development

```bash
npm install
npm run dev            # http://localhost:3000
```

Without `DATABASE_URL` or Supabase settings, data is stored in `.data/db.json` and photos in `.data/photos/`. Without
`HOUSEHOLD_PASSCODE`, the login screen is skipped in development (never in production).

## Signing in

There's one shared household passcode and no accounts.

- In production the site won't open at all until `HOUSEHOLD_PASSCODE` (at least 12 characters; a few random words
  is easiest to type on a phone) and `AUTH_SECRET` (at least 32 random characters) are set. The login page says
  which one is missing.
- After 5 wrong passcodes a device is locked out for 15 minutes, and every wrong guess is slowed down.
- Signing in lasts 90 days and renews while the device keeps using the site. **Sign out** is in the top bar.
- To sign every device out (for example after a lost phone), change `HOUSEHOLD_PASSCODE` or `AUTH_SECRET` and restart.
- Serve the site over HTTPS: the login cookie is only sent over secure connections in production.
- The `/share/recipe/...` pages and recipe photos stay public so MyFitnessPal can read them. Photo addresses are
  random and can't be guessed.
- Behind nginx, pass the visitor's address with `proxy_set_header X-Real-IP $remote_addr;` so lockouts apply per
  device rather than to everyone.

Other scripts:

```bash
npm run validate                           # allergen, calorie and gas-oven checks on the recipe library
npm run generate-plan -- --dry-run         # preview a fresh plan for the active plan
npm run generate-plan                      # rebuild every week of the active plan (replaces swaps)
npm run generate-plan -- --week 5          # rebuild just week 5
npm run generate-plan -- --plan my-plan-id # work on another plan
```

Road to Australia is created and planned automatically the first time the app loads.

## Going live on your own server (PostgreSQL)

Set `DATABASE_URL` and the app stores everything in PostgreSQL (it takes priority over Supabase). Photos are still
files, saved in `.data/photos/` under the app folder, so that folder must be on a persistent volume.

1. Create an empty database and a role that owns it. The app creates and upgrades its own tables on first use.
2. Give the app `HOUSEHOLD_PASSCODE`, `AUTH_SECRET`, `SITE_URL` and
   `DATABASE_URL=postgresql://user:password@host:5432/dbname`.
3. Check the connection from any machine that can reach the database (for example through an SSH tunnel):

   ```bash
   DATABASE_URL=postgresql://user:password@127.0.0.1:5432/dbname npm run db:status
   ```

4. To bring over what's in your local `.data/db.json` (plans, swaps, ratings, favourites, prices and your own
   recipes), run the import the same way. It refuses to touch a database that already has data unless you add
   `-- --replace`. Then copy `.data/photos/` into the server's photos folder.

   ```bash
   DATABASE_URL=postgresql://user:password@127.0.0.1:5432/dbname npm run db:import
   ```

   Or skip the import: Road to Australia is planned automatically the first time the site loads.

## Going live (Supabase + Vercel, both free tiers)

1. **Supabase**: create a project at [supabase.com](https://supabase.com). Open SQL Editor, paste in
   `supabase/schema.sql` and run it. This creates the tables (including `plans`, `settings` for the active plan, and
   `meal_slots` keyed by plan and date) and a public `photos` storage bucket.
2. From Project Settings, then API, copy the **Project URL** and the **service_role** key.
3. **Git remote**: push this repo to GitHub (or another git host).
4. **Vercel**: import the repo at [vercel.com/new](https://vercel.com/new) and add these environment variables:
   - `HOUSEHOLD_PASSCODE`: the passcode you'll all use (at least 12 characters)
   - `AUTH_SECRET`: a random string of at least 32 characters (`openssl rand -hex 32`)
   - `SUPABASE_URL`: the Project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: the service_role key (it stays on the server)
5. Deploy, open the site on each phone, enter the passcode and use "Add to Home Screen".

To copy local ratings or swaps to the live site, run `npm run generate-plan` with the Supabase variables in
`.env.local`. Or just start fresh online, since the plan is generated on first load.

## Where things live

- `src/data/ingredients.ts`: Tesco packs, estimated prices and nutrition per ingredient
- `src/data/recipes/*.ts`: recipes by category; `air-fryer.ts` has the Ninja Dual Zone methods; `index.ts` maps
  removed recipes to their replacements so saved plans update themselves
- `src/lib/library.ts`: combines the built-in recipes with your own
- `src/lib/plan.ts`: creating, repairing and regenerating plans
- `src/lib/exclusions.ts`: matching left-out ingredients against recipes
- `src/lib/generator.ts`: the weekly planning rules
- `src/lib/cost.ts`: budget maths (fresh items in whole packs, staples pro rata)
- `src/lib/store/`: PostgreSQL, Supabase and local JSON storage; `postgres-migrations.ts` holds the database schema
- `src/proxy.ts`: passcode check on every page (Next.js 16's replacement for middleware)
- `src/lib/auth-token.ts`: signed, expiring login cookie; `src/lib/login-limiter.ts`: wrong-passcode lockout
