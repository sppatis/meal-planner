export const AUTH_COOKIE = "dp_auth";

function secret() {
  return process.env.AUTH_SECRET || process.env.HOUSEHOLD_PASSCODE || "dev-secret";
}

/** HMAC of the passcode, so rotating the passcode signs everyone out. */
export async function expectedToken(): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(`household:${process.env.HOUSEHOLD_PASSCODE ?? ""}`),
  );
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function isValidToken(token: string | undefined): Promise<boolean> {
  if (!process.env.HOUSEHOLD_PASSCODE) return true;
  if (!token) return false;
  const expected = await expectedToken();
  if (token.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
