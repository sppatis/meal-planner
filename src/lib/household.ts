import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { AUTH_COOKIE, authConfigProblem, authRequired, readToken } from "./auth-token";
import { HOME_HOUSEHOLD, store, type Household } from "./store";

async function homeHousehold(): Promise<Household> {
  const home = await store.getHousehold(HOME_HOUSEHOLD);
  if (home) return home;
  const created: Household = {
    id: HOME_HOUSEHOLD,
    name: "Home",
    passcodeHash: null,
    sessionVersion: 1,
    createdAt: new Date().toISOString(),
  };
  await store.saveHousehold(created);
  return created;
}

/**
 * The signed-in household, or null. A validly signed cookie still counts as signed out once its household
 * is removed or its passcode is reset. Without sign-in (development only) everyone is the home household.
 */
export const currentHousehold = cache(async (): Promise<Household | null> => {
  if (!authRequired()) return homeHousehold();
  const session = await readToken((await cookies()).get(AUTH_COOKIE)?.value);
  if (!session) return null;
  const household = await store.getHousehold(session.householdId);
  return household && household.sessionVersion === session.version ? household : null;
});

/** The signed-in household; anyone else is sent to the login page. */
export async function requireHousehold(): Promise<Household> {
  const household = await currentHousehold();
  if (!household) redirect("/login");
  return household;
}

/** Plans, dinners, ratings and favourites for the signed-in household only. */
export async function householdStore() {
  return store.forHousehold((await requireHousehold()).id);
}

/** Why nobody can sign in, or null if someone can. */
export async function signInProblem(): Promise<string | null> {
  const problem = authConfigProblem();
  if (problem || !authRequired() || process.env.HOUSEHOLD_PASSCODE) return problem;
  if ((await store.listHouseholds()).some((h) => h.passcodeHash)) return null;
  return "No household has a passcode yet. Add one with npm run household -- add \"Name\".";
}
