import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

// Isolated browser fixtures, never persisted in TripDex or sent to a live API.
const countries = JSON.parse(
  readFileSync(
    new URL("../../api/src/prisma/data/countries.json", import.meta.url),
    "utf8",
  ),
).map((country: { iso2: string }) => ({
  ...country,
  id: `fixture-${country.iso2}`,
}));
const profile = {
  id: "passport-test",
  username: "validation_passport",
  email: "passport@example.test",
};
async function setup(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      "sb-passport-auth-token",
      JSON.stringify({
        access_token: "test-token",
        refresh_token: "test-refresh",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: "bearer",
        user: {
          id: "passport-test",
          aud: "authenticated",
          email: "passport@example.test",
        },
      }),
    );
  });
  await page.route("https://passport.supabase.co/**", (route) =>
    route.fulfill({ json: { id: profile.id, email: profile.email } }),
  );
  await page.route("**/me", (route) => route.fulfill({ json: profile }));
  await page.route("**/countries", (route) =>
    route.fulfill({ json: countries }),
  );
  await page.route("**/me/residence", (route) =>
    route.fulfill({ json: { residenceCountry: null } }),
  );
}
for (const count of [0, 1, 7]) {
  for (const width of [1440, 768, 390]) {
    test(`passport ${count} badges at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await setup(page);
      await page.route("**/me/visited-countries", (route) => {
        expect(route.request().headers().authorization).toBe(
          "Bearer test-token",
        );
        return route.fulfill({ json: countries.slice(0, count) });
      });
      await page.goto("/profile");
      await page.addStyleTag({
        content:
          "nuxt-devtools-frame, #nuxt-devtools-container { display: none !important; }",
      });
      await expect(
        page.getByRole("heading", { name: "Mon passeport" }),
      ).toBeVisible();
      await expect(page.locator(".badge-earned")).toHaveCount(count);
      await expect(page.locator(".empty-stamp")).toHaveCount(4 - (count % 4));
      await expect(
        page.getByText(`@${profile.username}`, { exact: true }),
      ).toBeVisible();
      await expect(page.locator(".stamp-year")).toHaveCount(0);
      if (!count)
        await expect(
          page.getByRole("link", { name: "Ajouter au journal" }),
        ).toHaveAttribute("href", "/");
      for (const flag of await page.locator(".badge-earned img").all()) {
        await expect(flag).toHaveAttribute(
          "src",
          /\/country-flags\/[a-z]{2}\.svg$/,
        );
        expect(
          await flag.evaluate(
            (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
          ),
        ).toBe(true);
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const identity = await page.locator(".identity-leaf").boundingBox();
      const collection = await page.locator(".collection-leaf").boundingBox();
      if (width === 1440)
        expect(collection!.x).toBeGreaterThan(
          identity!.x + identity!.width - 2,
        );
      else expect(collection!.y).toBeGreaterThan(identity!.y);
      const book = await page.locator(".passport-book").boundingBox();
      expect(identity!.x).toBeGreaterThan(book!.x);
      expect(collection!.x + collection!.width).toBeLessThan(
        book!.x + book!.width,
      );
      expect(identity!.y).toBeGreaterThan(book!.y);
      if (count) {
        await expect(page.locator(".country-count strong")).toHaveText(
          String(count),
        );
        await expect(page.locator(".identity-email")).toHaveText(profile.email);
      }
      if (width === 1440) {
        const slots = await page.locator(".badge-slot").all();
        const firstRow = await Promise.all(
          slots.slice(0, 4).map((slot) => slot.boundingBox()),
        );
        expect(
          Math.max(...firstRow.map((box) => box!.y)) -
            Math.min(...firstRow.map((box) => box!.y)),
        ).toBeLessThan(2);
      }
      if (count === 1 && width === 1440) {
        const stamp = page.locator(".badge-earned .travel-stamp");
        await stamp.hover();
        await expect
          .poll(() =>
            stamp.evaluate((element) => getComputedStyle(element).transform),
          )
          .toContain("1.02");
        await page.emulateMedia({ reducedMotion: "reduce" });
        await expect
          .poll(() =>
            stamp.evaluate((element) => getComputedStyle(element).transform),
          )
          .toBe("none");
        expect(
          await stamp
            .locator(".stamp-ring")
            .evaluate(
              (element) => getComputedStyle(element, "::after").display,
            ),
        ).toBe("none");
        await page.mouse.move(0, 0);
        await page.emulateMedia({ reducedMotion: "no-preference" });
      }
      await page.screenshot({
        path: `../../artifacts/passport-${count}-${width}.png`,
        fullPage: true,
      });
    });
  }
}
test("loading and API failure never masquerade as an empty passport; retry recovers", async ({
  page,
}) => {
  await setup(page);
  let release: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let fail = true;
  await page.route("**/me/visited-countries", async (route) => {
    await gate;
    await route.fulfill(
      fail ? { status: 503, json: {} } : { json: countries.slice(0, 1) },
    );
  });
  await page.goto("/profile");
  await expect(page.getByText("Ouverture de ton passeport…")).toBeVisible();
  await expect(page.locator(".empty-stamp")).toHaveCount(0);
  release!();
  const passportError = page.getByRole("alert").filter({
    hasText: "Impossible de charger tes tampons.",
  });
  await expect(passportError).toBeVisible();
  await expect(page.locator(".passport-empty")).toHaveCount(0);
  fail = false;
  await passportError
    .getByRole("button", { name: "Réessayer", exact: true })
    .click();
  await expect(page.locator(".badge-earned")).toHaveCount(1);
});

test("shared stamp remains coherent in journal and trip detail; revisits stay separate", async ({
  page,
}) => {
  await setup(page);
  const trip = {
    id: "passport-trip",
    title: "Souvenir de validation",
    startDate: "2026-04-01",
    endDate: null,
    countries: countries.slice(0, 1),
    cities: [],
    rating: null,
    review: null,
    coverUrl: null,
    isRevisit: false,
  };
  await page.route("**/me/trips", (route) =>
    route.fulfill({
      json: [trip, { ...trip, id: "revisit-trip", isRevisit: true }],
    }),
  );
  await page.route("**/test-api/me/trips/passport-trip", (route) =>
    route.fulfill({ json: trip }),
  );
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/journal");
    await expect(page.locator(".journal-dates").first()).toContainText(
      "1 avril 2026",
    );
    await expect(page.locator(".travel-stamp")).toHaveCount(1);
    await expect(page.locator(".revisit-stamp")).toHaveCount(1);
    await expect(page.locator(".travel-stamp")).toContainText("2026");
    await page.screenshot({
      path: `../../artifacts/passport-journal-${width}.png`,
      fullPage: true,
    });
    await page.goto("/trips/passport-trip");
    await expect(page.locator(".trip-hero")).toContainText("1 avril 2026");
    await expect(page.locator(".trip-hero .travel-stamp")).toBeVisible();
    await expect(page.locator(".trip-hero .travel-stamp")).toContainText(
      "TRIPDEX",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `../../artifacts/passport-detail-${width}.png`,
      fullPage: true,
    });
  }
});
