export const SERVINGS = 3;
export const KCAL_CAP = 1000;
export const QUICK_MAX_MINS = 25;
export const DEFAULT_WEEKLY_BUDGET = 60;
export const MAX_PLAN_WEEKS = 52;
/** Monday to Wednesday, the household's busy evenings. */
export const DEFAULT_QUICK_DAYS = [0, 1, 2];

/** The household's first plan, created automatically if there are no plans yet. */
export const DEFAULT_PLAN = {
  id: "road-to-australia",
  title: "Road to Australia",
  startDate: "2026-11-02",
  weeks: 20,
  weeklyBudget: DEFAULT_WEEKLY_BUDGET,
  excluded: [] as string[],
  quickDays: DEFAULT_QUICK_DAYS,
};

export const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const CATEGORY_LABELS = {
  rice: "Rice",
  pasta: "Pasta",
  potato: "Potato",
  veggie: "Veggie",
  fakeaway: "Fake-away",
  other: "Mix it up",
} as const;

export const ROLE_LABELS = {
  rice: "Rice dish",
  pasta: "Pasta dish",
  potato: "Potato dish",
  veggie: "Veggie option",
  fakeaway: "Fake-away",
  extra: "Extra",
} as const;
