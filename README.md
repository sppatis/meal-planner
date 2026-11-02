# Dinner Planner

Dinner plans for any household size. The original plan, **Road to Australia**, feeds three for 20 weeks (Mon 2 Nov
2026 to Sun 21 Mar 2027) at Tesco; you can add more plans with their own number of people and supermarket.

- Every dinner is free of fish, shellfish and nuts, and under 1,000 kcal per person.
- Each week has a rice dish, pasta dish, potato dish, veggie option, a Friday or Saturday fake-away, a Sunday dinner
  from the **Hearty Meals** group (roasts, toad in the hole, braised beef and so on) and an extra. If Sunday is a quick
  night, or the plan leaves Hearty Meals out, Sunday gets a second extra instead.
- Each plan has its own quick nights (Monday to Wednesday by default), which get dinners ready in 25 minutes or less.
- Each plan chooses how many people it feeds (1–10) and where they shop. Recipe amounts, shopping lists and costs
  scale to that headcount. Pack prices are estimated from the Tesco catalogue with a rough price level per
  supermarket (Aldi cheaper, Waitrose dearer, and so on); you can correct any price per store.
- Recipes give gas mark temperatures, and many have a Ninja Dual Zone air fryer method.

## Using the app

- **Plan** (homepage): the active plan's weeks as cards. Tap a card for the recipe, or **Replace** to swap in a
  favourite. The dialog shows the new weekly cost. **Shuffle week** regenerates a whole week. A household with no
  plan yet sees a **Start a new plan** button instead.
- **Plans**: every plan with its dates, people, supermarket, budget, recipe groups and left-out ingredients. Use the
  active switch to put a plan on the homepage or turn it off. Inactive plans can be deleted one by one or with **Delete
  inactive plans**. **New plan** asks for a title, number of people, supermarket, start date (weeks run Monday to
  Sunday), number of weeks, weekly budget (about £20 a head until you type your own), which recipe groups to include
  (remove a lozenge to leave a whole group out), quick nights and any ingredients to leave out. Tap the days that need a
  quick dinner. Type an ingredient and press Enter to add it; tap the × on its tag to remove it. The form shows which
  dinners will be left out before you save, and every dinner is planned automatically. The first plan becomes active.
  Changing a plan's dates re-plans it; changing the budget, people, supermarket, recipe groups, quick nights or
  ingredients only replaces the dinners that no longer fit, unless you tick **Re-plan every dinner**.
- **Recipes**: each card has an eye icon for your household — open means the recipe can be planned, closed hides it
  from your plans (and swaps it out of dinners that already use it). Hidden recipes stay on the list, faded, so you
  can turn them back on.
- **Recipe page**: shopping list with links for the plan's supermarket, method, Ninja method, photo upload, 5-star
  rating, favourite toggle and the same eye control. Recipes rated 4 stars or more automatically become favourites.
  Amounts and costs follow the plan's number of people.
- **Our recipes**: on Recipes, tap **Add a recipe** to add your own. Write ingredients for 3 people (plans scale them)
  from the Tesco-priced catalogue (or add a new one with its pack price and label nutrition) and the calories, cost,
  shopping list and MyFitnessPal page are worked out the same way as the built-in recipes. Saving is blocked if it
  mentions fish or nuts or goes over 1,000 kcal. Your recipes always appear as favourites in **Replace**, and can be
  edited or deleted from their page.
- **Shopping list** (per week): combined list grouped by aisle, with a separate cupboard check for staples, scaled to
  the plan's people and linked to its supermarket. Ticks are remembered on each phone.
- **Prices**: pick a supermarket at the top (defaults to the active plan's). Pack prices are estimates; corrections are
  saved per store and shared by every household. Edit any price and budgets at that store recalculate.
- **MyFitnessPal**: on a recipe, tap **Copy link**. In MyFitnessPal go to Recipes, then Create a Recipe, then Add from
  web, paste the link, set servings to 3 and save. Each person logs 1 serving. **Copy nutrition** is there for Quick Add.
  The `/share/recipe/...` pages are public (no passcode) so MyFitnessPal can read them.

## Local development

```bash
npm install
npm run dev            # http://localhost:3000
```

Without `DATABASE_URL`, data is stored in `.data/db.json` and photos in `.data/photos/`. Without
`HOUSEHOLD_PASSCODE`, the login screen is skipped in development (never in production).

## Signing in

Each household has its own passcode and there are no accounts. Everyone types their passcode into the same box,
and the passcode decides which household they're signed into.

- **Private to each household:** plans, dinners, ratings, favourites, which recipes are hidden from plans, and which
  plan is active. Another household's plan addresses just show "not found".
- **Shared by everyone:** your own recipes and ingredients, photos and price corrections (per supermarket). Any
  household can edit or delete them; plans using a deleted recipe get a substitute the next time they're opened.
- The household's name is shown next to **Sign out** in the top bar.

Manage households from any machine that can reach the database (add `DATABASE_URL=...` in front, as with
`db:status`):

```bash
npm run household -- list
npm run household -- add "24 Smith family"                 # suggests a four-word passcode, shown once
npm run household -- add "Jones family" --passcode "..."   # or choose one (at least 12 characters)
npm run household -- passcode <id>                         # reset; signs only that household's devices out
npm run household -- rename <id> "New name"
npm run household -- remove <id> --yes                     # deletes its plans, dinners, ratings and favourites
```

Passcodes are stored only as scrypt hashes, and two households can't share one. A passcode can include the house
number to make it memorable, but the app doesn't read anything from it.

The original household is `home` and owns everything saved before households existed. Until it has a passcode of
its own, `HOUSEHOLD_PASSCODE` signs into it. Set one with `npm run household -- passcode home`, after which
`HOUSEHOLD_PASSCODE` does nothing and can be removed. New households start with no plan and see **Start a new plan**
on the homepage.

- In production the site won't open until `AUTH_SECRET` (at least 32 random characters) is set and at least one
  household can sign in. The login page says what's missing.
- After 5 wrong passcodes a device is locked out for 15 minutes, and every wrong guess is slowed down.
- Signing in lasts 90 days and renews while the device keeps using the site.
- To sign one household's devices out (for example after a lost phone), reset its passcode. Removing a household
  signs its devices out too. Changing `AUTH_SECRET` signs everyone out.
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
npm run generate-plan -- --household smith # another household's active plan (default: home)
```

## Going live on your own server (PostgreSQL)

Set `DATABASE_URL` and the app stores everything in PostgreSQL instead of `.data/db.json`. Photos are still
files, saved in `.data/photos/` under the app folder, so that folder must be on a persistent volume.

1. Create an empty database and a role that owns it. The app creates and upgrades its own tables on first use.
2. Give the app `AUTH_SECRET`, `SITE_URL` and `DATABASE_URL=postgresql://user:password@host:5432/dbname`, plus
   `HOUSEHOLD_PASSCODE` until households have their own passcodes (see [Signing in](#signing-in)).
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

   Or skip the import and create plans in the app after signing in.

5. Add the other households with `npm run household -- add "Name"` (same `DATABASE_URL=...` prefix).
6. Open the site on each phone, enter the household's passcode and use "Add to Home Screen".

The other scripts work against the live database the same way, e.g.
`DATABASE_URL=... npm run generate-plan -- --week 5`.

## Where things live

- `src/data/ingredients.ts`: Tesco packs, estimated prices and nutrition per ingredient
- `src/data/recipes/*.ts`: recipes by category; `air-fryer.ts` has the Ninja Dual Zone methods; `index.ts` maps
  removed recipes to their replacements so saved plans update themselves
- `src/lib/library.ts`: combines the built-in recipes with your own
- `src/lib/stores.ts`: UK supermarket list, price levels and product search links
- `src/lib/scale.ts`: scaling recipe quantities to a plan's number of people
- `src/lib/plan.ts`: creating, repairing and regenerating plans
- `src/lib/exclusions.ts`: matching left-out ingredients against recipes, and scaling the plan's recipe library
- `src/lib/generator.ts`: the weekly planning rules
- `src/lib/cost.ts`: budget maths (fresh items in whole packs, staples pro rata)
- `src/lib/store/`: PostgreSQL and local JSON storage; `postgres-migrations.ts` holds the database schema
- `src/proxy.ts`: passcode check on every page (Next.js 16's replacement for middleware)
- `src/lib/auth-token.ts`: signed, expiring login cookie naming the household; `src/lib/login-limiter.ts`:
  wrong-passcode lockout
- `src/lib/household.ts`: the signed-in household and its scoped store; `src/lib/passcode.ts`: passcode hashing
  and matching; `scripts/household.ts`: adding and managing households
