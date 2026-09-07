import { expect, test } from "@playwright/test";

test("Japan 2026 is saved through NestJS and stays visited after reloading", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByLabel("Titre du voyage").fill("Japan 2026");
  await page.getByLabel("Début", { exact: true }).fill("2026-04-01");
  await page.getByLabel("Fin facultatif").fill("2026-04-14");
  await page.getByLabel("Rechercher un pays par nom ou code ISO").fill("Japan");
  await page.getByRole("checkbox", { name: "Japan", exact: true }).check();
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/trips") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Enregistrer mon voyage" }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(201);
  const trip = (await response.json()) as {
    id: string;
    title: string;
    countries: { iso3: string }[];
  };
  expect(trip.title).toBe("Japan 2026");
  expect(trip.countries.map((country) => country.iso3)).toEqual(["JPN"]);
  await expect(page.getByText("« Japan 2026 » est enregistré.")).toBeVisible();
  const japan = page.locator('path.map-country[data-iso3="JPN"]');
  await expect(japan).toHaveClass(/visited/);
  const apiBase = process.env.API_TEST_URL ?? "http://localhost:3001";
  const visitedResponse = await request.get(`${apiBase}/me/visited-countries`);
  expect(visitedResponse.ok()).toBeTruthy();
  const visited = (await visitedResponse.json()) as { iso3: string }[];
  expect(visited.filter((country) => country.iso3 === "JPN")).toHaveLength(1);
  await page.reload();
  await expect(japan).toHaveClass(/visited/);
  await japan.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".map-caption")).toContainText("Japan");
  await expect(page.locator(".map-caption")).toContainText("Visité");
  await page.getByRole("heading", { level: 1 }).click();
  await page.screenshot({
    path: "../../artifacts/tripdex-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "../../artifacts/tripdex-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  expect(errors).toEqual([]);
  console.log(
    `Saved demonstration trip ${trip.id}; JPN verified after reload.`,
  );
});

test("API failure offers retry and does not present an empty journal as fact", async ({
  page,
}) => {
  await page.route("**/me/visited-countries", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: '{"message":"Unavailable"}',
    }),
  );
  await page.goto("/");
  await expect(
    page.getByText("Impossible de récupérer vos pays visités."),
  ).toBeVisible();
  await expect(page.getByText("Votre histoire commence ici.")).toHaveCount(0);
  await expect(
    page.locator(".map-panel").getByRole("button", { name: "Réessayer" }),
  ).toBeVisible();
});
