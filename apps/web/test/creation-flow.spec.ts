import { expect, test } from "@playwright/test";

const japan = {
  id: "japan",
  iso2: "JP",
  iso3: "JPN",
  name: "Japan",
  slug: "japan",
  continentCode: "AS",
};

for (const failsRefresh of [false, true]) {
  test(`creation refreshes the map${failsRefresh ? " after a refresh failure and retry" : ""}`, async ({
    page,
  }) => {
    let created = false;
    let fail = failsRefresh;
    let posts = 0;
    let refreshes = 0;
    // Intercept every API endpoint used by this page; no live API is needed.
    await page.route("**/countries", (route) =>
      route.fulfill({ json: [japan] }),
    );
    await page.route("**/me/visited-countries", (route) => {
      if (created) refreshes++;
      return route.fulfill(
        created && fail
          ? { status: 503, json: { message: "Unavailable" } }
          : { json: created ? [japan] : [] },
      );
    });
    await page.route("**/trips", async (route) => {
      expect(route.request().method()).toBe("POST");
      expect(route.request().postDataJSON()).toEqual({
        title: "Japan 2026",
        startDate: "2026-04-01",
        endDate: null,
        countryIds: [japan.id],
        cityIds: [],
        rating: null,
        review: null,
      });
      posts++;
      created = true;
      await route.fulfill({
        status: 201,
        json: {
          id: "trip-japan",
          title: "Japan 2026",
          startDate: "2026-04-01T00:00:00.000Z",
          endDate: null,
          countries: [japan],
        },
      });
    });
    await page.goto("/");
    const shape = page.locator('path.map-country[data-iso3="JPN"]');
    await expect(shape).toBeVisible();
    await expect(shape).not.toHaveClass(/visited/);
    await page.getByLabel("Titre du voyage").fill("Japan 2026");
    await page.getByLabel("Début", { exact: true }).fill("2026-04-01");
    await page.getByRole("checkbox", { name: "Japan", exact: true }).check();
    await page.getByRole("button", { name: "Enregistrer mon voyage" }).click();
    const confirmation = page.locator(".feedback.success");
    await expect(confirmation).toBeVisible();
    if (failsRefresh) {
      await expect(
        page.getByText("Impossible de récupérer vos pays visités."),
      ).toBeVisible();
      await expect(
        page.getByText("La carte n’a pas encore pu être actualisée.", {
          exact: false,
        }),
      ).toBeVisible();
      await expect(shape).not.toHaveClass(/visited/);
      await expect(
        page.getByText("Votre carte est à jour.", { exact: false }),
      ).toHaveCount(0);
      fail = false;
      await page
        .locator(".map-panel")
        .getByRole("button", { name: "Réessayer" })
        .click();
    }
    await expect(shape).toHaveClass(/visited/);
    await expect(confirmation).toBeVisible();
    await expect(
      page.getByText("Votre carte est à jour.", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByText("Impossible de récupérer vos pays visités."),
    ).toHaveCount(0);
    expect(refreshes).toBeGreaterThan(0);
    expect(posts).toBe(1);
  });
}
