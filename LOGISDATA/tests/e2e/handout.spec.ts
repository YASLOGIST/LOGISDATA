import { expect, test } from "@playwright/test";

test.describe("text briefing", () => {
  test("is server-rendered, crawlable prose with no WebGL dependency", async ({ page }) => {
    const response = await page.goto("/handout");
    const html = (await response?.text()) ?? "";
    // Content must exist in the HTML payload itself, not only after hydration.
    expect(html).toContain("Every invoice is a claim");
    expect(html).toContain("Make every shelf accountable");
    await expect(page.locator("canvas")).toHaveCount(0);
  });

  test("renders every finding with headings, tables and a table of contents", async ({ page }) => {
    await page.goto("/handout");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 2 })).toHaveCount(5);
    await expect(page.getByRole("table")).toHaveCount(3);
    await expect(page.getByRole("navigation", { name: /Presentation sections/i }).getByRole("link")).toHaveCount(5);
  });

  test("table-of-contents links scroll to their section", async ({ page }) => {
    await page.goto("/handout");
    await page.getByRole("link", { name: "Warehouse control" }).click();
    await expect(page).toHaveURL(/#handout-warehouse$/);
    await expect(page.getByRole("heading", { name: /Make every shelf accountable/i })).toBeInViewport();
  });

  test("exposes a canonical URL and an article OpenGraph type", async ({ page }) => {
    await page.goto("/handout");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/handout$/);
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute("content", "article");
  });

  test("hides interactive chrome when printed", async ({ page }) => {
    await page.goto("/handout");
    await page.emulateMedia({ media: "print" });
    await expect(page.getByRole("button", { name: /Print/i })).toBeHidden();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("CSV export works from the briefing too", async ({ page }) => {
    await page.goto("/handout");
    const downloadPromise = page.waitForEvent("download");
    await page.locator('button[data-dataset="route-intelligence"]').click();
    expect((await downloadPromise).suggestedFilename()).toContain("route-intelligence");
  });
});
