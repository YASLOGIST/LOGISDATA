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
    // fallback instead of a blank canvas. Require one of the two, then assert
    // the full deck only on the branch that actually rendered it.
    const canvas = page.locator("canvas");
    const fallback = page.getByRole("link", { name: /text briefing/i });
    await expect(canvas.or(fallback).first()).toBeVisible({ timeout: 30_000 });

    if ((await canvas.count()) === 0) {
      await expect(fallback.first()).toHaveAttribute("href", "/handout");
      return;
    }

    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Data leakage/i);
    await expect(page.getByRole("navigation", { name: /Presentation sections/i })).toBeVisible();
  });

  test("the deck and the briefing are reachable without application errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => {
      errors.push(`${error.message} | ${(error.stack ?? "").split("\n")[1]?.trim() ?? "no frame"}`);
    });

    await page.goto("/");
    await expect(page.locator("canvas").or(page.getByRole("link", { name: /text briefing/i })).first())
      .toBeVisible({ timeout: 30_000 });
    expect(errors, `errors while mounting the deck: ${errors.join(" ;; ")}`).toEqual([]);

    await page.getByRole("link", { name: /text briefing/i }).first().click();
    await expect(page).toHaveURL(/\/handout$/);
    expect(errors, `errors after leaving the deck: ${errors.join(" ;; ")}`).toEqual([]);
  });

  test("the handout renders with no JavaScript errors at all", async ({ page }) => {
    // No Canvas here, so this route holds the unfiltered line.
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/handout");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(errors).toEqual([]);
  });
});
