import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function enterControlRoom(page: Page) {
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".presentation-root")).toHaveAttribute("data-interactive", "true");
}

test.describe("accessibility", () => {
  test("the control room entry has no WCAG 2.1 AA violations", async ({ page }) => {
    await enterControlRoom(page);
    const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
    expect(results.violations).toEqual([]);
  });

  test("the text briefing has no WCAG 2.1 AA violations in English or Arabic", async ({ page }) => {
    await page.goto("/handout");
    let results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
    expect(results.violations).toEqual([]);

    await page.getByRole("button", { name: "Language" }).click();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
    expect(results.violations).toEqual([]);
  });

  test("the control room has no WCAG 2.1 AA violations outside the canvas", async ({ page }) => {
    await enterControlRoom(page);
    const results = await new AxeBuilder({ page })
      .withTags(WCAG)
      // The WebGL canvas itself cannot be audited; its content is mirrored
      // in the accessible /handout route, which is audited above.
      .exclude("canvas")
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("a skip link is the first focusable element and reaches the content", async ({ page }) => {
    await page.goto("/handout");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: /skip to presentation content/i });
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#handout-main")).toBeFocused();
  });

  test("every interactive control is reachable and labelled", async ({ page }) => {
    await page.goto("/handout");
    const controls = page.locator("button, a[href]");
    const count = await controls.count();
    expect(count).toBeGreaterThan(5);
    for (let index = 0; index < count; index += 1) {
      const control = controls.nth(index);
      const name = (await control.getAttribute("aria-label")) ?? (await control.innerText());
      expect(name.trim().length, `control ${index} has no accessible name`).toBeGreaterThan(0);
    }
  });

  test("reduced-motion visitors still get a complete, static deck", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await enterControlRoom(page);
    // Metric counters must be at their final value immediately, not at 0.
    await expect(page.locator(".metric-counter-value").first()).not.toHaveText(/^\$?0(\.0)?/);
  });

  test("the active section is announced to assistive technology", async ({ page }) => {
    await enterControlRoom(page);
    const status = page.locator("[role='status'][aria-live='polite']").first();
    await expect(status).toContainText("Hidden cost");
    await page.keyboard.press("End");
    await expect(status).toContainText("Warehouse control", { timeout: 15_000 });
  });
});
