import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

/**
 * Lazily initialised PostgreSQL access.
 *
 * Importing this module must never throw (Next.js collects page data for
 * `/api/health` at build time, where DATABASE_URL is usually absent), so
 * the pool is only created when `getDb()` is actually called at request
 * time.
 *
 * FIXED (v3): the previous implementation only cached the pool when
 * `NODE_ENV !== "production"`. In production every `getDb()` call built a
 * brand-new `pg.Pool` *and* a brand-new Drizzle instance, so each request
 * to `/api/health` opened fresh TCP connections that were never reused and
 * only closed by `allowExitOnIdle` + the 30s idle timeout. Under a normal
 * uptime probe interval that exhausts `max_connections` on the server.
 * The pool is now a true process-wide singleton in every environment, with
 * an `error` listener so a backend-initiated disconnect cannot crash the
 * Node process with an unhandled `'error'` event.
 */

/** Minimal, test-friendly view of the environment this module reads. */
export type DatabaseEnv = Readonly<Record<string, string | undefined>>;

interface PoolSettings {
  connectionString: string;
  max: number;
  ssl: { rejectUnauthorized: boolean } | undefined;
}

const DEFAULT_POOL_MAX = 10;
const MIN_POOL_MAX = 1;
const MAX_POOL_MAX = 50;

/** Pure, testable translation of environment variables into pool settings. */
export function resolvePoolSettings(env: DatabaseEnv = process.env): PoolSettings {
  const connectionString = env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is required for database access. The presentation runs without it; see .env.example.",
    );
  }
  const parsed = Number.parseInt(env.DATABASE_POOL_MAX ?? "", 10);
  const max = Number.isFinite(parsed) ? Math.min(MAX_POOL_MAX, Math.max(MIN_POOL_MAX, parsed)) : DEFAULT_POOL_MAX;
  return {
    connectionString,
    max,
    // Opt-in TLS, and never with certificate verification disabled.
    ssl: env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : undefined,
  };
}

const globalForDb = globalThis as typeof globalThis & {
  __logisdataPool?: Pool;
  __logisdataDb?: NodePgDatabase<Record<string, never>>;
};

export function getPool(): Pool {
  if (globalForDb.__logisdataPool) return globalForDb.__logisdataPool;

  const settings = resolvePoolSettings();
  const pool = new Pool({
    connectionString: settings.connectionString,
    max: settings.max,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
    allowExitOnIdle: true,
    ssl: settings.ssl,
  });

  // An idle client dropped by the server emits 'error' on the pool; without
  // a listener Node treats it as an unhandled error event and exits.
  pool.on("error", (error) => {
    console.error("[db] idle client error", error instanceof Error ? error.message : error);
  });

  globalForDb.__logisdataPool = pool;
  return pool;
}

export function getDb(): NodePgDatabase<Record<string, never>> {
  if (!globalForDb.__logisdataDb) {
    globalForDb.__logisdataDb = drizzle(getPool());
  }
  return globalForDb.__logisdataDb;
}

/** True when a database is configured at all. Cheap, never connects. */
export function isDatabaseConfigured(env: DatabaseEnv = process.env): boolean {
  return Boolean(env.DATABASE_URL);
}

/** Releases pooled connections. Used by graceful-shutdown hooks and tests. */
export async function closeDb(): Promise<void> {
  const pool = globalForDb.__logisdataPool;
  globalForDb.__logisdataPool = undefined;
  globalForDb.__logisdataDb = undefined;
  if (pool) await pool.end();
}
