import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const image = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
  "base64",
);
const country = {
  id: "japan",
  iso2: "JP",
  iso3: "JPN",
  name: "Japan",
  slug: "japan",
  continentCode: "AS",
};
const trip = {
  id: "trip",
  title: "Japan cover",
  startDate: "2026-04-01T00:00:00.000Z",
  endDate: null,
  countries: [country],
  cities: [],
  coverStoragePath: null,
  coverUrl: null,
};

async function setup(page: Page) {
  await page.route("**/countries", (route) =>
    route.fulfill({ json: [country] }),
  );
  await page.route("**/cities", (route) => route.fulfill({ json: [] }));
  await page.route("**/me/visited-countries", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/test-cover.png*", (route) =>
    route.fulfill({ contentType: "image/png", body: image }),
  );
}
async function fill(page: Page) {
  await page.goto("/");
  await page.getByLabel("Titre du voyage").fill(trip.title);
  await page.getByLabel("Début", { exact: true }).fill("2026-04-01");
  await page.getByRole("checkbox", { name: "Japan", exact: true }).check();
}

for (const scenario of ["without", "with", "retry", "skip"] as const) {
  test(`creation cover: ${scenario}`, async ({ page }) => {
    await setup(page);
    let posts = 0;
    let uploads = 0;
    await page.route("**/trips", async (route) => {
      posts++;
      expect(route.request().postDataJSON()).not.toHaveProperty(
        "coverStoragePath",
      );
      expect(route.request().postDataJSON()).not.toHaveProperty("userId");
      await route.fulfill({ status: 201, json: trip });
    });
    await page.route("**/me/trips/trip/cover", async (route) => {
      uploads++;
      expect(route.request().method()).toBe("PUT");
      expect(route.request().headers()["content-type"]).toContain(
        "multipart/form-data",
      );
      expect(route.request().postDataBuffer()?.toString()).toContain(
        'name="cover"',
      );
      // Keep upload pending until the test has observed the accessible status.
      await expect(
        page.getByRole("button", { name: "Envoi de la cover…" }),
      ).toBeVisible();
      await route.fulfill(
        (scenario === "retry" || scenario === "skip") && uploads === 1
          ? { status: 503, json: { message: "Unavailable" } }
          : {
              json: {
                coverStoragePath: "users/owner/trips/trip/cover/test.png",
                coverUrl: "/test-cover.png?token=temporary",
              },
            },
      );
    });
    await fill(page);
    if (scenario !== "without") {
      await page
        .getByLabel("Photo de couverture")
        .setInputFiles({
          name: "cover.png",
          mimeType: "image/png",
          buffer: image,
        });
      await expect(
        page.getByAltText("Aperçu de la cover sélectionnée"),
      ).toBeVisible();
    }
    await page.getByRole("button", { name: "Enregistrer mon voyage" }).click();
    if (scenario === "retry" || scenario === "skip") {
      await expect(page.getByRole("alert")).toContainText(
        "Le voyage est enregistré",
      );
      await expect(page.getByLabel("Titre du voyage")).toHaveValue(trip.title);
      await expect(page.getByLabel("Titre du voyage")).toBeDisabled();
      await expect(
        page.getByAltText("Aperçu de la cover sélectionnée"),
      ).toBeVisible();
      if (scenario === "skip")
        await page
          .getByRole("button", { name: "Retirer la sélection" })
          .click();
      await page
        .getByRole("button", { name: "Terminer l’enregistrement" })
        .click();
    }
    await expect(page.locator(".feedback.success")).toBeVisible();
    await expect(page.getByLabel("Titre du voyage")).toHaveValue("");
    expect(posts).toBe(1);
    expect(uploads).toBe(
      scenario === "without" ? 0 : scenario === "retry" ? 2 : 1,
    );
    await expect(
      page.getByAltText("Aperçu de la cover sélectionnée"),
    ).toHaveCount(0);
  });
}

test("local selection rejects unsupported MIME and oversized files", async ({
  page,
}) => {
  await setup(page);
  await fill(page);
  for (const file of [
    {
      name: "cover.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from("<svg/>"),
    },
    {
      name: "cover.png",
      mimeType: "image/png",
      buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
    },
  ]) {
    await page.getByLabel("Photo de couverture").setInputFiles(file);
    await expect(page.getByRole("alert")).toContainText("5 Mio maximum");
    await expect(
      page.getByAltText("Aperçu de la cover sélectionnée"),
    ).toHaveCount(0);
    await expect(page.getByLabel("Titre du voyage")).toHaveValue(trip.title);
  }
});

for (const hasCover of [false, true]) {
  test(`journal and detail display signed covers: ${hasCover}`, async ({
    page,
  }) => {
    await setup(page);
    const response = {
      ...trip,
      coverStoragePath: hasCover
        ? "users/owner/trips/trip/cover/test.png"
        : null,
      coverUrl: hasCover ? "/test-cover.png?token=temporary" : null,
    };
    await page.route("**/me/trips", (route) =>
      route.fulfill({ json: [response] }),
    );
    await page.route("**/me/trips/trip", (route) =>
      route.fulfill({ json: response }),
    );
    await page.goto("/journal");
    await expect(page.getByRole("link", { name: trip.title })).toBeVisible();
    await expect(page.getByAltText(`Cover de ${trip.title}`)).toHaveCount(
      hasCover ? 1 : 0,
    );
    if (hasCover)
      await expect(
        page.getByAltText(`Cover de ${trip.title}`),
      ).toHaveJSProperty("naturalWidth", 1);
    await page.getByRole("link", { name: trip.title }).click();
    await expect(page.getByRole("heading", { name: trip.title })).toBeVisible();
    await expect(page.getByAltText(`Cover de ${trip.title}`)).toHaveCount(
      hasCover ? 1 : 0,
    );
  });
}

test("detail keeps selection after failure, replaces then deletes cover", async ({
  page,
}) => {
  await setup(page);
  await page.route("**/me/trips/trip", (route) =>
    route.fulfill({
      json: {
        ...trip,
        coverStoragePath: "old/path",
        coverUrl: "/test-cover.png?token=old",
      },
    }),
  );
  let attempts = 0;
  await page.route("**/me/trips/trip/cover", (route) => {
    if (route.request().method() === "DELETE")
      return route.fulfill({
        json: { coverStoragePath: null, coverUrl: null, cleanupPending: false },
      });
    attempts++;
    return route.fulfill(
      attempts === 1
        ? { status: 503, json: {} }
        : {
            json: {
              coverStoragePath: "new/path",
              coverUrl: "/test-cover.png?token=new",
              cleanupPending: false,
            },
          },
    );
  });
  await page.goto("/trips/trip");
  await page
    .getByLabel("Photo de couverture")
    .setInputFiles({ name: "cover.png", mimeType: "image/png", buffer: image });
  await page.getByRole("button", { name: "Enregistrer la cover" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Votre sélection est conservée",
  );
  await expect(page.getByAltText(`Cover de ${trip.title}`)).toHaveAttribute(
    "src",
    "/test-cover.png?token=old",
  );
  await expect(
    page.getByAltText("Aperçu de la cover sélectionnée"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Enregistrer la cover" }).click();
  await expect(page.getByAltText(`Cover de ${trip.title}`)).toHaveAttribute(
    "src",
    "/test-cover.png?token=new",
  );
  await page.getByRole("button", { name: "Supprimer la cover" }).click();
  await expect(page.getByText("Cover supprimée.")).toBeVisible();
  await expect(page.getByAltText(`Cover de ${trip.title}`)).toHaveCount(0);
});

test("missing object or unavailable signature leaves detail usable", async ({
  page,
}) => {
  await setup(page);
  await page.route("**/me/trips/trip", (route) =>
    route.fulfill({
      json: { ...trip, coverStoragePath: "stored/path", coverUrl: null },
    }),
  );
  await page.goto("/trips/trip");
  await expect(page.getByRole("heading", { name: trip.title })).toBeVisible();
  await expect(page.getByAltText(`Cover de ${trip.title}`)).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Supprimer la cover" }),
  ).toBeVisible();
});
