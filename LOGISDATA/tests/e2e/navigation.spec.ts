import { expect, test, type Page } from "@playwright/test";

/** The deck opens directly; this just waits for the 3D chunk to mount. */
async function enterControlRoom(page: Page, url = "/") {
  await page.goto(url);
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
    await enterControlRoom(page, "/#warehouse");
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
    // The choice must survive the reload and be applied before paint.
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/تسرب البيانات|البيانات/);
  });

  test("theme toggle switches palette and persists across reloads", async ({ page }) => {
    await enterControlRoom(page);
    const html = page.locator("html");
    // The deck honours prefers-color-scheme on a first visit, so the initial
    // value depends on the runner. Assert the flip, not a fixed colour.
    const before = await html.getAttribute("data-theme");
    const after = before === "dark" ? "light" : "dark";
    await page.getByRole("button", { name: "Theme" }).click();
    await expect(html).toHaveAttribute("data-theme", after);
    await page.reload();
    await expect(html).toHaveAttribute("data-theme", after);
  });

  test("the T and L shortcuts toggle theme and language", async ({ page }) => {
    await enterControlRoom(page);
    const html = page.locator("html");
    const before = await html.getAttribute("data-theme");
    await page.keyboard.press("t");
    await expect(html).toHaveAttribute("data-theme", before === "dark" ? "light" : "dark");
    await page.keyboard.press("l");
    await expect(html).toHaveAttribute("lang", "ar");
  });
});

test.describe("keyboard boundaries", () => {
  test("focused controls and modal dialogs are protected from global navigation shortcuts", async ({ page }) => {
    await enterControlRoom(page);
    const html = page.locator("html");
    const progress = page.getByRole("progressbar");
    const theme = page.getByRole("button", { name: "Theme" });
    const before = await html.getAttribute("data-theme");

    await theme.focus();
    await page.keyboard.press("Space");
    await expect(html).toHaveAttribute("data-theme", before === "dark" ? "light" : "dark");
    await expect(progress).toHaveAttribute("aria-valuenow", "1");

    await page.getByRole("button", { name: "ROI Calculator" }).click();
    const calculator = page.getByRole("dialog", { name: /Executive Margin Recovery Calculator/i });
    await expect(calculator).toBeVisible();
    await page.keyboard.press("End");
    await expect(progress).toHaveAttribute("aria-valuenow", "1");
    await page.keyboard.press("Escape");
    await expect(calculator).toBeHidden();
  });

  test("keyboard help opens with ? and closes with Escape", async ({ page }) => {
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
