import { localStore } from "./local";
import { supabaseStore } from "./supabase";
import type { Store } from "./types";

export const usingSupabase = Boolean(
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);

/** The local JSON store can't persist on Vercel's read-only filesystem. */
export const storageMisconfigured = !usingSupabase && Boolean(process.env.VERCEL);

export const store: Store = usingSupabase ? supabaseStore : localStore;
