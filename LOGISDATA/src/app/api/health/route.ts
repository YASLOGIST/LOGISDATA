import { sql } from "drizzle-orm";
import packageMetadata from "../../../../package.json";
import { getDb, isDatabaseConfigured } from "@/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const JSON_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
} as const;

const DB_PROBE_TIMEOUT_MS = 2_000;

export type DatabaseStatus = "ready" | "unavailable" | "not-configured";

export interface HealthPayload {
  ok: boolean;
  service: "logisdata-control-room";
  version: string;
  database: DatabaseStatus;
  uptimeSeconds: number;
  timestamp: string;
}

async function databaseStatus(): Promise<DatabaseStatus> {
  if (!isDatabaseConfigured()) return "not-configured";

  // `setTimeout` must be cleared: an un-cleared 2s timer keeps the Node
  // event loop (and serverless invocation) alive after a fast success.
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      getDb().execute(sql`select 1`),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Database health check timed out")), DB_PROBE_TIMEOUT_MS);
      }),
    ]);
    return "ready";
  } catch (error) {
    console.error("[health] database probe failed", error instanceof Error ? error.message : error);
    return "unavailable";
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Liveness stays truthful even when this database-optional presentation has no DB attached. */
export async function GET(): Promise<Response> {
  const database = await databaseStatus();
  const payload: HealthPayload = {
    ok: database !== "unavailable",
    service: "logisdata-control-room",
    // Package metadata is the release source of truth. Deployments may
    // override it with an immutable build identifier when required.
    version: process.env.NEXT_PUBLIC_APP_VERSION?.trim() || packageMetadata.version,
    database,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  };
  return Response.json(payload, { status: payload.ok ? 200 : 503, headers: JSON_HEADERS });
}

/** Low-cost liveness probe: no database round-trip, no body. */
export function HEAD(): Response {
  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": JSON_HEADERS["Cache-Control"] },
  });
}
