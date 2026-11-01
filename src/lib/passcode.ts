import { createHash, randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "crypto";
import { HOME_HOUSEHOLD, type Household } from "./store/types";

const KEY_LENGTH = 32;
const COST = { N: 16384, r: 8, p: 1 };

const derive = (passcode: string, salt: Buffer, options: ScryptOptions) =>
  new Promise<Buffer>((resolve, reject) =>
    scrypt(passcode.normalize("NFKC"), salt, KEY_LENGTH, options, (err, key) => (err ? reject(err) : resolve(key))),
  );

/** `scrypt$N$r$p$salt$hash`, with base64 salt and hash. */
export async function hashPasscode(passcode: string) {
  const salt = randomBytes(16);
  const key = await derive(passcode, salt, COST);
  return ["scrypt", COST.N, COST.r, COST.p, salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verifyPasscode(passcode: string, stored: string) {
  const [scheme, N, r, p, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const key = await derive(passcode, Buffer.from(salt, "base64"), { N: Number(N), r: Number(r), p: Number(p) });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

const digest = (s: string) => createHash("sha256").update(s).digest();

/**
 * The household whose passcode this is, or null. Every hash is checked so the time taken doesn't reveal
 * which household matched. Until the home household has a passcode of its own, HOUSEHOLD_PASSCODE signs into it.
 */
export async function matchHousehold(passcode: string, households: Household[]): Promise<Household | null> {
  if (!passcode) return null;
  const results = await Promise.all(
    households.map(async (h) => (h.passcodeHash && (await verifyPasscode(passcode, h.passcodeHash)) ? h : null)),
  );
  const match = results.find(Boolean);
  if (match) return match;

  const fallback = process.env.HOUSEHOLD_PASSCODE ?? "";
  const home = households.find((h) => h.id === HOME_HOUSEHOLD && !h.passcodeHash);
  if (home && fallback && timingSafeEqual(digest(passcode), digest(fallback))) return home;
  return null;
}

const WORDS = `apple bagel basil bean berry biscuit bread brie broth bun butter cake carrot celery cheddar cherry chive
chutney cider cinnamon clove cocoa cookie corn cream crumble crumpet curry custard date dough dumpling fennel
fig flapjack flour fudge garlic ginger grape gravy herb honey jam jelly kale kettle kiwi ladle lemon lentil lime
mango maple marrow melon mint muffin mustard noodle oat olive onion orange paprika parsley parsnip pasta peach
pear pepper pickle pie plum porridge potato pudding pumpkin radish raisin rhubarb rice risotto roast saffron sage salad
salsa scone sesame shallot sorbet soup spinach sprout stew sugar sultana syrup tart thyme toast toffee tomato trifle
turnip vanilla waffle wasabi yoghurt apron basket bowl colander cupboard dinner fork griddle grill jug kitchen
larder lunch mixer oven pantry pan picnic plate platter pot saucer skillet spoon steamer supper table teapot tin tray
whisk wok`
  .split(/\s+/)
  .filter(Boolean);

/** Four random food and kitchen words, easy to type on a phone. */
export function suggestPasscode() {
  return Array.from({ length: 4 }, () => WORDS[randomBytes(2).readUInt16BE() % WORDS.length]).join(" ");
}
