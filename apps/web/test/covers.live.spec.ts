import { expect, test } from "@playwright/test";

test("real cover creation, journal, detail, replacement and deletion", async ({
  page,
  request,
}) => {
  test.skip(
    process.env.RUN_STORAGE_INTEGRATION !== "true",
    "Requires a configured private Supabase bucket and live NestJS.",
  );
  test.setTimeout(120_000);
  const apiBase = process.env.API_TEST_URL ?? "http://localhost:3001";
  const title = `Cover validation ${Date.now()}`;
  const buffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
    "base64",
  );
  let tripId: string | undefined;
  try {
    await page.goto("/");
    await page.getByLabel("Titre du voyage").fill(title);
    await page.getByLabel("Début", { exact: true }).fill("2026-09-08");
    await page.getByRole("checkbox", { name: "Japan", exact: true }).check();
    await page
      .getByLabel("Photo de couverture")
      .setInputFiles({ name: "cover.png", mimeType: "image/png", buffer });
    await expect(
      page.getByAltText("Aperçu de la cover sélectionnée"),
    ).toBeVisible();
    const createdResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith("/trips") &&
        response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Enregistrer mon voyage" }).click();
    const created = await createdResponse;
    expect(created.status()).toBe(201);
    tripId = ((await created.json()) as { id: string }).id;
    await expect(page.locator(".feedback.success")).toBeVisible({
      timeout: 60_000,
    });
    await page.goto("/journal");
    const cover = page.getByAltText(`Cover de ${title}`);
    await expect(cover).toBeVisible();
    await expect(cover).toHaveJSProperty("naturalWidth", 1);
    await page.getByRole("link", { name: title, exact: true }).click();
    await expect(cover).toBeVisible();
    await expect(cover).toHaveJSProperty("naturalWidth", 1);
    await page.getByLabel("Photo de couverture").setInputFiles({
      name: "replacement.png",
      mimeType: "image/png",
      buffer,
    });
    await page.getByRole("button", { name: "Enregistrer la cover" }).click();
    await expect(
      page.getByText("Cover enregistrée.", { exact: true }),
    ).toBeVisible({ timeout: 60_000 });
    await expect(cover).toHaveJSProperty("naturalWidth", 1);
    await page.reload();
    await expect(cover).toHaveJSProperty("naturalWidth", 1);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Supprimer la cover" }).click();
    await expect(
      page.getByText("Cover supprimée.", { exact: true }),
    ).toBeVisible({ timeout: 60_000 });
    await expect(cover).toHaveCount(0);
    const response = await request.get(`${apiBase}/me/trips/${tripId}`);
    expect(response.status()).toBe(200);
    const detail = (await response.json()) as {
      coverStoragePath: string | null;
      coverUrl: string | null;
    };
    expect(detail.coverStoragePath === null && detail.coverUrl === null).toBe(
      true,
    );
  } finally {
    if (tripId) {
      // Preserve the demonstration trip; remove only the cover created by this test.
      const cleanup = await request.delete(
        `${apiBase}/me/trips/${tripId}/cover`,
      );
      expect(cleanup.status(), "Cleanup of the test cover").toBe(200);
      console.log(
        `Saved cover demonstration trip ${tripId}; cover cleanup requested.`,
      );
    }
  }
});
