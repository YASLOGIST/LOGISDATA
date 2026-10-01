import { expect, test, type Page } from "@playwright/test";

async function enterControlRoom(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /Enter Control Room/i }).click();
  await expect(page.locator("canvas")).toBeVisible({ timeout: 30_000 });
}

test.describe("section navigation", () => {
  test("clicking a nav item moves the deck and updates the URL hash", async ({ page }) => {
    await enterControlRoom(page);
    await page.getByRole("button", { name: "Route intelligence" }).first().click();
    await expect(page).toHaveURL(/#routes$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /Turn every detour into a decision/i })).toBeInViewport();
  });

  test("keyboard arrows walk forward and backward through the deck", async ({ page }) => {
    await enterControlRoom(page);
    await page.keyboard.press("ArrowDown");
    await expect(page).toHaveURL(/#audit$/, { timeout: 15_000 });
    await page.keyboard.press("ArrowDown");
    await expect(page).toHaveURL(/#demand$/, { timeout: 15_000 });
    await page.keyboard.press("ArrowUp");
    await expect(page).toHaveURL(/#audit$/, { timeout: 15_000 });
  });

  test("End and Home jump to the last and first sections", async ({ page }) => {
    await enterControlRoom(page);
    await page.keyboard.press("End");
    await expect(page).toHaveURL(/#warehouse$/, { timeout: 15_000 });
    await page.keyboard.press("Home");
    await expect(page).toHaveURL(/#overview$/, { timeout: 15_000 });
  });

  test("number keys jump straight to a section", async ({ page }) => {
    await enterControlRoom(page);
    await page.keyboard.press("4");
    await expect(page).toHaveURL(/#routes$/, { timeout: 15_000 });
  });

  test("a deep link opens directly on the requested section", async ({ page }) => {
    await page.goto("/#warehouse");
    await page.getByRole("button", { name: /Enter Control Room/i }).click();
    await expect(page.locator("canvas")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("heading", { name: /Make every shelf accountable/i })).toBeInViewport({
      timeout: 15_000,
    });
  });

  test("the progress indicator tracks the active section", async ({ page }) => {
    await enterControlRoom(page);
    const progressbar = page.getByRole("progressbar");
    await expect(progressbar).toHaveAttribute("aria-valuenow", "1");
    await page.keyboard.press("End");
    await expect(progressbar).toHaveAttribute("aria-valuenow", "5", { timeout: 15_000 });
  });
});

test.describe("preferences", () => {
  test("language toggle switches to Arabic, flips direction and persists", async ({ page }) => {
    await enterControlRoom(page);
    await page.getByRole("button", { name: "Language" }).click();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");

    await page.reload();
    // The cover itself must come back in Arabic.
    await expect(page.getByRole("button", { name: /ادخل غرفة التحكم/ })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  });

  test("theme toggle switches palette and persists across reloads", async ({ page }) => {
    await enterControlRoom(page);
    await page.getByRole("button", { name: "Theme" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("the T and L shortcuts toggle theme and language", async ({ page }) => {
    await enterControlRoom(page);
    await page.keyboard.press("t");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.keyboard.press("l");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  });
});

test.describe("keyboard help", () => {
  test("opens with ? and closes with Escape", async ({ page }) => {
    await enterControlRoom(page);
    await page.keyboard.press("?");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("listitem")).toHaveCount(8);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });
});

test.describe("dataset export", () => {
  test("downloads a valid CSV for the freight audit", async ({ page }) => {
    await enterControlRoom(page);
    await page.keyboard.press("2");
    const downloadPromise = page.waitForEvent("download");
    await page.locator('button[data-dataset="freight-audit"]').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^logisdata-freight-audit-en-\d{4}-\d{2}-\d{2}\.csv$/);

    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    const csv = Buffer.concat(chunks).toString("utf8");
    expect(csv).toContain("freight_type");
    expect(csv.split("\r\n")).toHaveLength(6);
  });
});
