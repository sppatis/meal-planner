import { PLAN_START, PLAN_WEEKS } from "./constants";

const DAY_MS = 86_400_000;

export function parseISO(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toISO(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number) {
  return toISO(new Date(parseISO(date).getTime() + days * DAY_MS));
}

/** 0 = Monday ... 6 = Sunday */
export function dayIndex(date: string) {
  return (parseISO(date).getUTCDay() + 6) % 7;
}

export function weekStart(week: number) {
  return addDays(PLAN_START, week * 7);
}

export function weekDates(week: number) {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart(week), i));
}

/** Plan week index for a date, or null if outside the plan. */
export function weekOf(date: string): number | null {
  const diff = Math.floor((parseISO(date).getTime() - parseISO(PLAN_START).getTime()) / DAY_MS);
  const week = Math.floor(diff / 7);
  return week >= 0 && week < PLAN_WEEKS ? week : null;
}

export function todayISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
}

export function daysBetween(from: string, to: string) {
  return Math.round((parseISO(to).getTime() - parseISO(from).getTime()) / DAY_MS);
}

export function formatDate(date: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) {
  return new Intl.DateTimeFormat("en-GB", { ...opts, timeZone: "UTC" }).format(parseISO(date));
}
