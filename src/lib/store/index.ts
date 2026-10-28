import { localStore } from "./local";
import { postgresStore } from "./postgres";
import type { Store } from "./types";

export const usingPostgres = Boolean(process.env.DATABASE_URL);

export const storeName = usingPostgres ? "PostgreSQL" : ".data/db.json";

export const store: Store = usingPostgres ? postgresStore : localStore;
