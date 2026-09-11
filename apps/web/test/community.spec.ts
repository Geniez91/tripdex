import { expect, test, type Page } from "@playwright/test";
import { communityCountries, communityFixture } from "./community-fixtures";

async function setup(page: Page): Promise<string[]> {
  const calls: string[] = [];
  await page.route("**/test-api/**", async (route) => {
    const url = new URL(route.request().url());
    if (
      url.pathname.endsWith("/countries") &&
      !url.pathname.includes("/community/")
    )
      return route.fulfill({ json: communityCountries });
    if (url.pathname.endsWith("/community/countries")) {
      calls.push(url.href);
      return route.fulfill({
        json: communityFixture(Number(url.searchParams.get("year"))),
      });
    }
    return route.fulfill({ json: [] });
  });
  await page.goto("/");
  await expect(page.locator(".map-svg")).toBeVisible();
  await expect(page.locator(".community-country-panel")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  return calls;
}

for (const width of [1440, 768, 390]) {
  test(`Community map modes, keyboard selection and real aggregates at ${width}px`, async ({
    page,
  }) => {
    // Arrange
    await page.setViewportSize({ width, height: 1000 });
    const calls = await setup(page);
    const japan = page.locator('path.map-country[data-iso3="JPN"]');
    const france = page.locator('path.map-country[data-iso3="FRA"]');
    const panel = page.getByRole("region", {
      name: "Détails du pays sélectionné",
    });
    // Act
    await japan.focus();
    // Assert
    await expect(
      page.getByRole("button", { name: "Voyageurs", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".map-caption")).toContainText("14 voyageurs");
    await expect(japan).toHaveAttribute("aria-pressed", "false");
    // Act
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: "Tendances", exact: true }).click();
    // Assert
    await expect(japan).toHaveAttribute("aria-pressed", "true");
    await expect(panel).toContainText("14 voyageurs");
    await expect(panel).toContainText("2 en voyage actuellement");
    await expect(japan).toHaveAttribute("style", /sun/);
    await expect(france).toHaveAttribute("style", /map-land/);
    // Act
    await page.getByRole("button", { name: "Flux", exact: true }).click();
    // Assert
    await expect(
      page.locator('.community-flow[data-destination="JPN"]'),
    ).toHaveCount(4);
    await expect(
      page.locator('.community-flow[data-origin="FRA"] path'),
    ).toHaveAttribute("d", /M/);
    await expect(panel.locator("li").first()).toContainText("France");
    await expect(panel.locator("li").first()).toContainText("6");
    expect(calls).toHaveLength(1);
    // Act
    await france.focus();
    await page.keyboard.press("Space");
    // Assert
    await expect(france).toHaveAttribute("aria-pressed", "true");
    await expect(japan).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator(".community-flow")).toHaveCount(0);
    await expect(
      page.getByText(
        "Aucune origine disponible pour cette destination. Aucun flux à tracer.",
      ),
    ).toBeVisible();
    await expect(panel.locator(".travelers-now")).toHaveCount(0);
    expect(calls).toHaveLength(1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.locator('.community-explorer img:not([src*="country-flags"])'),
    ).toHaveCount(0);
    if (width === 390)
      expect(
        (await page.locator(".map-svg").boundingBox())?.height,
      ).toBeGreaterThan(300);
    // Act
    await japan.focus();
    await page.keyboard.press("Space");
    await page.addStyleTag({
      content:
        "nuxt-devtools-frame, #nuxt-devtools-container { display:none!important }",
    });
    // Assert
    await page.screenshot({
      path: `../../artifacts/m4-increment2/community-flows-${width}.png`,
      fullPage: true,
    });
  });
}

test("year updates all modes and preserves current presence semantics; no trending is a clean state", async ({
  page,
}) => {
  // Arrange
  const calls = await setup(page);
  await page.locator('path.map-country[data-iso3="JPN"]').focus();
  await page.keyboard.press("Enter");
  // Act
  await page.getByLabel("Année", { exact: true }).fill("2025");
  await page.getByRole("button", { name: "Afficher", exact: true }).click();
  // Assert
  await expect(page.locator(".annual-travelers")).toContainText(
    "7 voyageurs en 2025",
  );
  await expect(page.locator(".travelers-now")).toContainText(
    "2 en voyage actuellement",
  );
  await expect(page.locator(".current-date")).toContainText("11/09/2026");
  expect(new URL(calls[calls.length - 1] ?? "").searchParams.get("year")).toBe(
    "2025",
  );
  // Act
  await page.getByRole("button", { name: "Tendances", exact: true }).click();
  // Assert
  await expect(
    page.getByText("Aucun pays tendance pour 2025.", { exact: false }),
  ).toBeVisible();
  // Act
  await page.getByRole("button", { name: "Flux", exact: true }).click();
  // Assert
  await expect(page.locator(".community-flow")).toHaveCount(0);
  expect(calls).toHaveLength(2);
});

test("year bounds and country search remain keyboard accessible", async ({
  page,
}) => {
  // Arrange
  await setup(page);
  // Act
  const countrySearch = page.getByRole("textbox", {
    name: /Rechercher un pays/,
  });
  await countrySearch.fill("Japan");
  await expect(
    page.getByRole("option", { name: "Japan", exact: true }),
  ).toBeVisible();
  await countrySearch.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.locator(".country-heading h3")).toHaveText("Japan");
  await page.getByLabel("Année", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Afficher", exact: true }).click();
  // Assert
  await expect(page.locator(".country-heading h3")).toHaveText("Japan");
  await expect(
    page.getByRole("button", { name: "Année précédente" }),
  ).toBeDisabled();
  // Act
  await page.getByLabel("Année", { exact: true }).fill("9998");
  await page.getByRole("button", { name: "Afficher", exact: true }).click();
  // Assert
  await expect(
    page.getByRole("button", { name: "Année suivante" }),
  ).toBeDisabled();
});

test("community API error offers recovery without showing stale counts", async ({
  page,
}) => {
  // Arrange
  await setup(page);
  await page.route("**/test-api/community/countries?**", (route) =>
    route.fulfill({ status: 503, json: {} }),
  );
  // Act
  await page.getByRole("button", { name: "Année précédente" }).click();
  // Assert
  await expect(
    page.getByRole("alert").filter({ hasText: "statistiques" }),
  ).toBeVisible();
  await expect(page.locator(".annual-travelers")).toHaveCount(0);
  // Act
  await page.unroute("**/test-api/community/countries?**");
  await page.getByRole("button", { name: "Réessayer", exact: true }).click();
  // Assert
  await expect(
    page.getByRole("alert").filter({ hasText: "statistiques" }),
  ).toHaveCount(0);
});
