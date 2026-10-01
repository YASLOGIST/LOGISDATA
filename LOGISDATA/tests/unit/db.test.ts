import { afterEach, describe, expect, it } from "vitest";
import { isDatabaseConfigured, resolvePoolSettings } from "@/db";

const ORIGINAL = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe("resolvePoolSettings", () => {
  it("requires a connection string and says so clearly", () => {
    expect(() => resolvePoolSettings({})).toThrow(/DATABASE_URL is required/);
  });

  it("defaults the pool size to 10", () => {
    expect(resolvePoolSettings({ DATABASE_URL: "postgres://x" }).max).toBe(10);
  });

  it.each([
    ["0", 1],
    ["-5", 1],
    ["7", 7],
    ["500", 50],
    ["not-a-number", 10],
  ])("clamps DATABASE_POOL_MAX=%s to %s", (input, expected) => {
    expect(resolvePoolSettings({ DATABASE_URL: "postgres://x", DATABASE_POOL_MAX: input }).max).toBe(expected);
  });

  it("only enables TLS when explicitly asked, and never without verification", () => {
    expect(resolvePoolSettings({ DATABASE_URL: "postgres://x" }).ssl).toBeUndefined();
    expect(resolvePoolSettings({ DATABASE_URL: "postgres://x", DATABASE_SSL: "false" }).ssl).toBeUndefined();
    expect(resolvePoolSettings({ DATABASE_URL: "postgres://x", DATABASE_SSL: "true" }).ssl)
      .toEqual({ rejectUnauthorized: true });
  });
});

describe("isDatabaseConfigured", () => {
  it("is a cheap, non-connecting check", () => {
    expect(isDatabaseConfigured({})).toBe(false);
    expect(isDatabaseConfigured({ DATABASE_URL: "" })).toBe(false);
    expect(isDatabaseConfigured({ DATABASE_URL: "postgres://x" })).toBe(true);
  });
});
