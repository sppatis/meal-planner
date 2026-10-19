import { RECIPES } from "../src/data/recipes";
import { recipeCost } from "../src/lib/cost";
import { isQuick, nutritionPerServing, totalMins } from "../src/lib/nutrition";
import { validateLibrary } from "../src/lib/validate";

const verbose = process.argv.includes("--verbose");

if (verbose) {
  for (const r of RECIPES) {
    const n = nutritionPerServing(r);
    console.log(
      [
        r.category.padEnd(8),
        (isQuick(r) ? "quick" : "").padEnd(5),
        `${totalMins(r)}m`.padStart(4),
        `${n.kcal}kcal`.padStart(8),
        `${n.protein}g P`.padStart(6),
        `£${recipeCost(r).toFixed(2)}`.padStart(7),
        r.name,
      ].join("  "),
    );
  }
}

const counts = RECIPES.reduce<Record<string, { all: number; quick: number }>>((acc, r) => {
  acc[r.category] ??= { all: 0, quick: 0 };
  acc[r.category].all++;
  if (isQuick(r)) acc[r.category].quick++;
  return acc;
}, {});
console.log(`${RECIPES.length} recipes`, counts);

const problems = validateLibrary();
if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log("Library OK: no fish, shellfish or nuts; every dinner is within the calorie cap.");
