import { expect, test } from "@playwright/test";

test.describe("control room entry", () => {
  test("the deck opens directly, with no cover screen to click through", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /Enter Control Room/i })).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 30_000 });
  });

  test("the 3D runtime stays a deferred chunk, not part of the initial document", async ({ request }) => {
    const html = await (await request.get("/")).text();
    // The document is the static shell. If Three.js ever gets pulled into the
    // server-rendered payload this grows by an order of magnitude.
    expect(html).not.toContain("WebGLRenderer");
    expect(html.length, `initial document ${html.length} bytes`).toBeLessThan(40_000);
  });

  test("the control room renders the canvas and the first section", async ({ page }) => {
    await page.goto("/");

    // The product contract is "every device gets the content", not "every
    // device gets WebGL". Emulated mobile on a GPU-less runner can legitimately
    // fail the capability probe, and the deck must then show the documented
    // fallback instead of a blank canvas. Assert whichever branch applies --
    // but assert that one of them is always reachable.
    const webglAvailable = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
    });

    if (!webglAvailable) {
      await expect(page.getByRole("link", { name: /text briefing/i })).toBeVisible();
      return;
    }

    await expect(page.locator("canvas")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Data leakage/i);
    await expect(page.getByRole("navigation", { name: /Presentation sections/i })).toBeVisible();
  });

  test("the deck and the briefing are reachable without JavaScript errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await page.getByRole("link", { name: /text briefing/i }).first().click();
    await expect(page).toHaveURL(/\/handout$/);
    expect(errors).toEqual([]);
  });
});

test.describe("health endpoint", () => {
  test("GET reports liveness with an honest database status", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ ok: true, service: "logisdata-control-room", database: "not-configured" });
    expect(typeof body.uptimeSeconds).toBe("number");
    expect(response.headers()["cache-control"]).toContain("no-store");
  });

  test("HEAD is a body-less liveness probe", async ({ request }) => {
    const response = await request.head("/api/health");
    expect(response.status()).toBe(204);
  });
});

test.describe("delivery hardening", () => {
  test("serves the expected security headers", async ({ request }) => {
    const response = await request.get("/");
    const headers = response.headers();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["content-security-policy"]).toContain("object-src 'none'");
    expect(headers["content-security-policy"]).toContain("base-uri 'none'");
    expect(headers["x-powered-by"]).toBeUndefined();
  });

  test("publishes robots.txt, a sitemap and a web manifest", async ({ request }) => {
    const robots = await request.get("/robots.txt");
    expect(robots.status()).toBe(200);
    expect(await robots.text()).toContain("Sitemap:");

    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    expect(await sitemap.text()).toContain("/handout");

    const manifest = await request.get("/manifest.webmanifest");
    expect(manifest.status()).toBe(200);
    expect((await manifest.json()).name).toBe("LOGISDATA Control Room");
  });
});
