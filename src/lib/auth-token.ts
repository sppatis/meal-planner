export const AUTH_COOKIE = "dp_auth";
export const SESSION_DAYS = 90;
const SESSION_SECONDS = SESSION_DAYS * 24 * 60 * 60;
/** Active sessions get a fresh cookie at most this often, so only idle devices expire. */
export const RENEW_AFTER_SECONDS = 24 * 60 * 60;

export const MIN_PASSCODE_LENGTH = 12;
const MIN_SECRET_LENGTH = 32;

const isProduction = () => process.env.NODE_ENV === "production";

/** Without a passcode the login screen is skipped, but only outside production. */
export function authRequired() {
  return isProduction() || !!process.env.HOUSEHOLD_PASSCODE;
}

/** Why sign-in can't work with the current settings, or null if it can. Production refuses to run unprotected. */
export function authConfigProblem(): string | null {
  const passcode = process.env.HOUSEHOLD_PASSCODE ?? "";
  if (!authRequired()) return null;
  if (!passcode) return "HOUSEHOLD_PASSCODE isn't set on the server.";
  if (isProduction() && passcode.length < MIN_PASSCODE_LENGTH) {
    return `HOUSEHOLD_PASSCODE must be at least ${MIN_PASSCODE_LENGTH} characters.`;
  }
  if (isProduction() && (process.env.AUTH_SECRET ?? "").length < MIN_SECRET_LENGTH) {
    return `AUTH_SECRET must be set to a random string of at least ${MIN_SECRET_LENGTH} characters (openssl rand -hex 32).`;
  }
  return null;
}

async function hmac(message: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(process.env.AUTH_SECRET || `dev:${process.env.HOUSEHOLD_PASSCODE ?? ""}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

function equal(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// The passcode is part of the signed message, so changing it (or AUTH_SECRET) signs every device out.
const payload = (issuedAt: number) => `household:v2:${issuedAt}:${process.env.HOUSEHOLD_PASSCODE ?? ""}`;

export async function createToken(now = Date.now()) {
  const issuedAt = Math.floor(now / 1000);
  return `${issuedAt}.${await hmac(payload(issuedAt))}`;
}

/** Seconds since the token was issued, or null if it's missing, forged or expired. */
export async function tokenAge(token: string | undefined, now = Date.now()): Promise<number | null> {
  if (!token || authConfigProblem()) return null;
  const [issued, sig] = token.split(".");
  const issuedAt = Number(issued);
  if (!Number.isInteger(issuedAt) || !sig) return null;
  const age = Math.floor(now / 1000) - issuedAt;
  if (age < -60 || age > SESSION_SECONDS) return null;
  return equal(sig, await hmac(payload(issuedAt))) ? age : null;
}

export async function isValidToken(token: string | undefined) {
  if (!authRequired()) return true;
  return (await tokenAge(token)) !== null;
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: isProduction(),
  path: "/",
  maxAge: SESSION_SECONDS,
} as const;

/** Only same-site paths, so the login page can't be used to bounce people to another site. */
export function safeNext(next: unknown) {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return "/";
  try {
    const url = new URL(next, "http://local.invalid");
    if (url.origin !== "http://local.invalid" || url.pathname.startsWith("/login")) return "/";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/";
  }
}
