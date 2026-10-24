import { DAY_SHORT } from "./constants";

const DAY_MS = 86_400_000;

/** The parts of a plan that decide which dates it covers. */
export interface PlanSpan {
  startDate: string;
  weeks: number;
}

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

/** The Monday on or before `date`. */
export function mondayOf(date: string) {
  return addDays(date, -dayIndex(date));
}

export function weekStart(plan: PlanSpan, week: number) {
  return addDays(plan.startDate, week * 7);
}

export function weekDates(plan: PlanSpan, week: number) {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart(plan, week), i));
}

export function planDates(plan: PlanSpan) {
  return Array.from({ length: plan.weeks }, (_, w) => weekDates(plan, w)).flat();
}

/** The day after the plan's last dinner. */
export function planEnd(plan: PlanSpan) {
  return addDays(plan.startDate, plan.weeks * 7);
}

/** Plan week index for a date, or null if outside the plan. */
export function weekOf(plan: PlanSpan, date: string): number | null {
  const diff = Math.floor((parseISO(date).getTime() - parseISO(plan.startDate).getTime()) / DAY_MS);
  const week = Math.floor(diff / 7);
  return week >= 0 && week < plan.weeks ? week : null;
}

export function todayISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
}

export function daysBetween(from: string, to: string) {
  return Math.round((parseISO(to).getTime() - parseISO(from).getTime()) / DAY_MS);
}

/** Day indexes as "Mon, Tue and Wed". */
export function listDays(days: number[]) {
  const names = [...days].sort((a, b) => a - b).map((d) => DAY_SHORT[d]);
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : (names[0] ?? "");
}

export function formatDate(date: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) {
  return new Intl.DateTimeFormat("en-GB", { ...opts, timeZone: "UTC" }).format(parseISO(date));
}
