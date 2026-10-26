import "server-only";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_CLIENT = 5;
/** Past this many failures from everyone, every attempt is slowed rather than refused, so nobody can lock the family out. */
const SLOW_AFTER_TOTAL = 30;
const BASE_DELAY_MS = 500;
const SLOW_DELAY_MS = 3000;

const failures = new Map<string, number[]>();
let total: number[] = [];

const recent = (times: number[], now: number) => times.filter((t) => now - t < WINDOW_MS);

/** Milliseconds until this client may try again, or 0 if it can try now. */
export function lockedFor(client: string, now = Date.now()) {
  const mine = recent(failures.get(client) ?? [], now);
  return mine.length >= MAX_PER_CLIENT ? WINDOW_MS - (now - mine[0]) : 0;
}

/** How long to pause before answering a wrong passcode. */
export function failureDelay(now = Date.now()) {
  total = recent(total, now);
  return total.length >= SLOW_AFTER_TOTAL ? SLOW_DELAY_MS : BASE_DELAY_MS;
}

export function recordFailure(client: string, now = Date.now()) {
  failures.set(client, [...recent(failures.get(client) ?? [], now), now]);
  total = [...recent(total, now), now];
  if (failures.size > 10_000) {
    for (const [key, times] of failures) if (!recent(times, now).length) failures.delete(key);
  }
}

export function recordSuccess(client: string) {
  failures.delete(client);
}
