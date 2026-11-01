/**
 * Manage the households that can sign in. Uses DATABASE_URL (or .data/db.json without it).
 *
 * Usage:
 *   npm run household -- list
 *   npm run household -- add "Smith family" [--id smith-family] [--passcode "..."]
 *   npm run household -- passcode <id> [--passcode "..."]   # set or reset; signs that household's devices out
 *   npm run household -- rename <id> "New name"
 *   npm run household -- remove <id> --yes                   # deletes its plans, dinners, ratings and favourites
 *
 * Without --passcode a random four-word passcode is chosen. It's printed once: pass it on to the household.
 */
import { existsSync } from "fs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const args = process.argv.slice(2);
const option = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const positional = args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));

async function main() {
  const { MIN_PASSCODE_LENGTH } = await import("../src/lib/auth-token");
  const { slugify, CUSTOM_PREFIX } = await import("../src/lib/library");
  const { hashPasscode, matchHousehold, suggestPasscode } = await import("../src/lib/passcode");
  const { store, storeName } = await import("../src/lib/store");
  type Household = import("../src/lib/store").Household;

  const [command, ...rest] = positional;
  const households = await store.listHouseholds();
  const find = (id: string | undefined) => {
    const h = households.find((x) => x.id === id);
    if (!h) throw new Error(`No household "${id}". Households: ${households.map((x) => x.id).join(", ") || "none"}`);
    return h;
  };

  /** A passcode for `target` that's long enough and doesn't sign into any other household. */
  async function choosePasscode(target: string) {
    const passcode = (option("passcode") ?? suggestPasscode()).trim();
    if (passcode.length < MIN_PASSCODE_LENGTH) {
      throw new Error(`The passcode must be at least ${MIN_PASSCODE_LENGTH} characters.`);
    }
    const clash = await matchHousehold(passcode, households.filter((h) => h.id !== target));
    if (clash) throw new Error(`That passcode already signs into ${clash.name}. Choose another.`);
    return passcode;
  }

  const announce = (h: Household, passcode: string) =>
    console.log(`\n  Household: ${h.name} (${h.id})\n  Passcode:  ${passcode}\n\nPass the passcode on now: it isn't shown again.`);

  switch (command) {
    case "list": {
      console.log(`Households in ${storeName}:\n`);
      for (const h of households) {
        const plans = await store.forHousehold(h.id).getPlans();
        console.log(
          `  ${h.id.padEnd(24)} ${h.name.padEnd(28)} ${String(plans.length).padStart(2)} plans   ` +
            (h.passcodeHash ? "passcode set" : h.id === "home" ? "uses HOUSEHOLD_PASSCODE" : "no passcode"),
        );
      }
      return;
    }
    case "add": {
      const name = rest.join(" ").trim().replace(/\s+/g, " ").slice(0, 40);
      if (name.length < 2) throw new Error('Give the household a name: npm run household -- add "Smith family"');
      const id = option("id") ?? (slugify(name).slice(CUSTOM_PREFIX.length) || "household");
      if (!/^[a-z0-9-]+$/.test(id)) throw new Error("The id can only use lowercase letters, numbers and dashes.");
      if (households.some((h) => h.id === id)) throw new Error(`There's already a household "${id}". Use --id to pick another.`);
      const passcode = await choosePasscode(id);
      const household: Household = {
        id,
        name,
        passcodeHash: await hashPasscode(passcode),
        sessionVersion: 1,
        createdAt: new Date().toISOString(),
      };
      await store.saveHousehold(household);
      return announce(household, passcode);
    }
    case "passcode": {
      const household = find(rest[0]);
      const passcode = await choosePasscode(household.id);
      const updated = { ...household, passcodeHash: await hashPasscode(passcode), sessionVersion: household.sessionVersion + 1 };
      await store.saveHousehold(updated);
      announce(updated, passcode);
      return console.log(`Devices signed in to ${household.name} have been signed out.`);
    }
    case "rename": {
      const household = find(rest[0]);
      const name = rest.slice(1).join(" ").trim().replace(/\s+/g, " ").slice(0, 40);
      if (name.length < 2) throw new Error('Give the new name: npm run household -- rename <id> "New name"');
      await store.saveHousehold({ ...household, name });
      return console.log(`Renamed ${household.id} to ${name}.`);
    }
    case "remove": {
      const household = find(rest[0]);
      const plans = await store.forHousehold(household.id).getPlans();
      if (!args.includes("--yes")) {
        throw new Error(
          `This deletes ${household.name} with its ${plans.length} plans, dinners, ratings and favourites. ` +
            "Shared recipes and photos stay. Re-run with --yes to confirm.",
        );
      }
      await store.deleteHousehold(household.id);
      return console.log(`Removed ${household.name}. Its devices are signed out.`);
    }
    default:
      throw new Error("Commands: list, add, passcode, rename, remove. See the top of scripts/household.ts.");
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  },
);
