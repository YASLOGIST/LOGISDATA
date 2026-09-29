import { getDb } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const headers = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
};

async function databaseStatus(): Promise<"ready" | "unavailable" | "not-configured"> {
  if (!process.env.DATABASE_URL) return "not-configured";

  try {
    await Promise.race([
      getDb().execute(sql`select 1`),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Database health check timed out")), 2_000)),
    ]);
    return "ready";
  } catch {
    return "unavailable";
  }
}

/** Liveness stays truthful even when this database-optional presentation has no DB attached. */
export async function GET() {
  const database = await databaseStatus();
  return Response.json(
    {
      ok: database !== "unavailable",
      service: "logisdata-control-room",
      database,
      timestamp: new Date().toISOString(),
    },
    { status: database === "unavailable" ? 503 : 200, headers },
  );
}

export function HEAD() {
  return new Response(null, { status: 204, headers: { "Cache-Control": headers["Cache-Control"] } });
}
