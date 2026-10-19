export const SERVINGS = 3;
export const KCAL_CAP = 1000;
export const WEEKLY_BUDGET = 60;
export const QUICK_MAX_MINS = 25;

export const PLAN_START = "2026-11-02";
export const PLAN_WEEKS = 20;
export const TRIP_DATE = "2027-03-22";

export const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** Day index (0 = Monday) to the evening activity that makes it a quick-dinner night. */
export const ACTIVITIES: Record<number, string> = {
  0: "Swimming Club, poolside 19:00",
  1: "Badminton, on court 19:00",
  2: "Swimming Club, poolside 20:00",
};

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
