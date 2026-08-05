import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// Lazily initialized so importing this module (e.g. during `next build`'s
// static page-data collection for /api/health) never throws just because
// DATABASE_URL isn't configured. This presentation ships with no database
// tables of its own — the pool is only ever created if something actually
// calls getDb() at request time.
const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

function createPool(): Pool {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }
  const pool = globalForDb.__arenaNextJsPostgresqlPool ?? new Pool({ connectionString: databaseUrl });
  if (process.env.NODE_ENV !== "production") {
    globalForDb.__arenaNextJsPostgresqlPool = pool;
  }
  return pool;
}

export function getDb() {
  return drizzle(createPool());
}
