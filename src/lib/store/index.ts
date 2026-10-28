import { localStore } from "./local";
import { postgresStore } from "./postgres";
import { supabaseStore } from "./supabase";
import type { Store } from "./types";

export const usingPostgres = Boolean(process.env.DATABASE_URL);
export const usingSupabase =
  !usingPostgres && Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

/** Where data is kept, for scripts to report. */
export const storeName = usingPostgres ? "PostgreSQL" : usingSupabase ? "Supabase" : ".data/db.json";

/** The local JSON store can't persist on Vercel's read-only filesystem. */
export const storageMisconfigured = !usingPostgres && !usingSupabase && Boolean(process.env.VERCEL);

export const store: Store = usingPostgres ? postgresStore : usingSupabase ? supabaseStore : localStore;
