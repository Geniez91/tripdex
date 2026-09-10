import assert from "node:assert/strict";
import { test } from "node:test";
import { harness } from "./auth-harness.mjs";

for (const path of ["/journal", "/trips/trip-a", "/profile", "/profile/map"]) {
  test(`global middleware redirects anonymous ${path} to login`, async () => {
    // Arrange
    const h = harness(null);
    const middleware = h.load("../app/middleware/auth.global.ts").default;
    // Act
    const result = await middleware({ path, fullPath: path });
    // Assert
    assert.equal(result.redirect.path, "/login");
    assert.equal(result.redirect.query.redirect, path);
  });
}

test("global middleware leaves Explorer public and restores a private session", async () => {
  // Arrange
  const h = harness();
  const middleware = h.load("../app/middleware/auth.global.ts").default;
  // Act
  const explorer = await middleware({ path: "/", fullPath: "/" });
  const journal = await middleware({ path: "/journal", fullPath: "/journal" });
  // Assert
  assert.equal(explorer, undefined);
  assert.equal(journal, undefined);
  assert.equal(h.auth.status.value, "authenticated");
});

test("SSR defers browser session restoration without redirecting a persisted user", async () => {
  // Arrange
  const h = harness(null, true);
  const middleware = h.load("../app/middleware/auth.global.ts").default;
  // Act
  const result = await middleware({ path: "/journal", fullPath: "/journal" });
  // Assert
  assert.equal(result, undefined);
  assert.equal(h.calls.length, 0);
});

test("an Auth outage does not redirect a private session to login", async () => {
  // Arrange
  const h = harness();
  h.setTransport(async () => {
    throw { statusCode: 503 };
  });
  const middleware = h.load("../app/middleware/auth.global.ts").default;
  // Act
  const result = await middleware({ path: "/journal", fullPath: "/journal" });
  // Assert
  assert.equal(result, undefined);
  assert.equal(h.auth.status.value, "error");
  assert.equal(h.signouts, 0);
});
