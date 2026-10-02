import { afterEach, describe, expect, it, vi } from "vitest";
import packageMetadata from "../../package.json";
import { GET, HEAD } from "@/app/api/health/route";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("health route", () => {
  it("reports package metadata when no deployment version is configured", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_APP_VERSION", "");

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
    expect(body).toMatchObject({
      ok: true,
      service: "logisdata-control-room",
      version: packageMetadata.version,
      database: "not-configured",
    });
    expect(Number.isFinite(body.uptimeSeconds)).toBe(true);
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);
  });

  it("allows an immutable deployment version override", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_APP_VERSION", "3.1.0+build.42");

    const response = await GET();
    expect((await response.json()).version).toBe("3.1.0+build.42");
  });

  it("provides a body-free liveness probe without touching the database", async () => {
    const response = HEAD();
    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
  });
});
