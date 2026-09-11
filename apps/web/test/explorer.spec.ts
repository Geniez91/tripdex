import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { communityFixture } from "./community-fixtures";

const countries = JSON.parse(
  readFileSync(
    new URL("../../api/src/prisma/data/countries.json", import.meta.url),
    "utf8",
  ),
).map((country: { iso2: string }) => ({
  ...country,
  id: `fixture-${country.iso2}`,
}));
async function publicReference(page: Page) {
  await page.route("**/test-api/community/countries?**", (route) =>
    route.fulfill({
      json: communityFixture(
        Number(new URL(route.request().url()).searchParams.get("year")),
      ),
    }),
  );
  await page.route("**/test-api/countries", (route) =>
    route.fulfill({ json: countries }),
  );
  await page.route("**/test-api/cities", (route) =>
    route.fulfill({ json: [] }),
  );
}

for (const width of [1440, 1024, 390]) {
  test(`anonymous Explorer stays public and supports keyboard selection at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await publicReference(page);
    const privateRequests: string[] = [];
    await page.route("**/test-api/me**", (route) => {
      privateRequests.push(route.request().url());
      return route.fulfill({ status: 401, json: {} });
    });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Chaque pays cache une histoire." }),
    ).toBeVisible();
    await expect(page.locator(".map-svg")).toBeVisible();
    expect(
      await page
        .locator(".tripdex-app")
        .evaluate((element) => getComputedStyle(element).backgroundImage),
    ).not.toBe("none");
    await expect(page.locator(".visited-count")).toHaveCount(0);
    await expect(page.locator(".navigation-link.is-active")).toHaveText(
      "Explorer",
    );
    const japan = page.locator('path.map-country[data-iso3="JPN"]');
    await japan.focus();
    await page.keyboard.press("Enter");
    await expect(japan).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".map-caption strong")).toHaveText("Japan");
    await expect(page.locator(".map-caption img")).toHaveAttribute(
      "src",
      /country-flags\/jp.svg$/,
    );
    await expect(japan).toHaveAttribute("aria-label", /14 voyageurs/);
    await page.keyboard.press("Space");
    await expect(japan).toHaveAttribute("aria-pressed", "true");
    expect(privateRequests).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const map = await page.locator(".map-panel").boundingBox();
    expect(map!.width).toBeGreaterThan(width * 0.85);
    const navigation = await page.locator(".app-navigation").boundingBox();
    if (width === 390)
      expect(navigation!.y + navigation!.height).toBeCloseTo(1000, 0);
    await page.addStyleTag({
      content:
        "nuxt-devtools-frame, #nuxt-devtools-container { display: none !important; }",
    });
    await page.screenshot({ path: `../../artifacts/explorer-${width}.png` });
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(
      await japan.evaluate(
        (element) => getComputedStyle(element).transitionDuration,
      ),
    ).toBe("0s");
    await page.getByRole("link", { name: "Journal", exact: true }).click();
    await expect(page).toHaveURL(/\/login\?redirect=/);
  });
}

test("signed-in Explorer preserves visited data while Ma carte owns the personal counter", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 1000 });
  await publicReference(page);
  await page.addInitScript(() =>
    localStorage.setItem(
      "sb-passport-auth-token",
      JSON.stringify({
        access_token: "test-token",
        refresh_token: "test-refresh",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: "bearer",
        user: {
          id: "explorer-test",
          aud: "authenticated",
          email: "explorer@example.test",
        },
      }),
    ),
  );
  await page.route("https://passport.supabase.co/**", (route) =>
    route.fulfill({
      json: { id: "explorer-test", email: "explorer@example.test" },
    }),
  );
  await page.route("**/test-api/me", (route) =>
    route.fulfill({
      json: {
        id: "explorer-test",
        username: "explorer_test",
        email: "explorer@example.test",
      },
    }),
  );
  await page.route("**/me/visited-countries", (route) =>
    route.fulfill({
      json: countries.filter(
        (country: { iso3: string }) => country.iso3 === "JPN",
      ),
    }),
  );
  await page.goto("/");
  const japan = page.locator('path.map-country[data-iso3="JPN"]');
  await expect(japan).toHaveAttribute("aria-label", /14 voyageurs/);
  await expect(page.locator(".visited-count")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Ma carte", exact: true }),
  ).toHaveAttribute("href", "/profile/map");
  await page.getByRole("link", { name: "Ma carte", exact: true }).click();
  await expect(page).toHaveURL(/\/profile\/map$/);
  await expect(page.locator(".visited-count strong")).toHaveText("1");
  await expect(japan).toHaveClass(/visited/);
  await expect(page.locator(".navigation-link.is-active")).toHaveText(
    "Ma carte",
  );
});
