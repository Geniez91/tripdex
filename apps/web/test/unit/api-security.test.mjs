import assert from "node:assert/strict";
import { test } from "node:test";
import { deferred, harness, sessionB } from "./auth-harness.mjs";

for (const path of [
  "https://external.example.invalid/me",
  "//external.example.invalid",
  "/\\external.example.invalid",
  " /me",
  "/\n/me",
  "javascript:alert(1)",
]) {
  test(`rejects unsafe API destination ${JSON.stringify(path)} before dispatch`, async () => {
    // Arrange
    const h = harness();
    // Act
    const result = h.api.get(path);
    // Assert
    await assert.rejects(result, { message: "Invalid API path." });
    assert.equal(h.calls.length, 0);
  });
}

test("only API requests receive the SDK access token and redirects are refused", async () => {
  // Arrange
  const h = harness();
  await h.auth.initialize();
  // Act
  await h.api.get("/me", { headers: { Authorization: "untrusted" } });
  // Assert
  const { url, options } = h.calls.at(-1);
  assert.equal(url, "https://api.example.invalid/me");
  assert.equal(options.headers.get("Authorization"), "Bearer synthetic-a");
  assert.equal(options.redirect, "error");
  assert.equal(options.body, undefined);
});

test("401 has at most one refresh and one replay", async () => {
  // Arrange
  const h = harness();
  await h.auth.initialize();
  const before = h.calls.length;
  h.setTransport(async () => {
    throw { statusCode: 401 };
  });
  // Act
  const result = h.api.get("/me/trips");
  // Assert
  await assert.rejects(result, (error) => error.statusCode === 401);
  assert.equal(h.calls.length - before, 2);
  assert.equal(h.refreshes, 1);
});

for (const error of [{ statusCode: 503 }, new Error("network")]) {
  test(`does not refresh or logout on ${error.statusCode ?? "network failure"}`, async () => {
    // Arrange
    const h = harness();
    await h.auth.initialize();
    h.setTransport(async () => {
      throw error;
    });
    // Act
    const result = h.api.get("/me/trips");
    // Assert
    await assert.rejects(result, (cause) => cause === error);
    assert.equal(h.refreshes, 0);
    assert.equal(h.signouts, 0);
  });
}

test("drops a private response received after logout", async () => {
  // Arrange
  const h = harness();
  await h.auth.initialize();
  const pending = deferred();
  const dispatched = deferred();
  h.setTransport(() => {
    dispatched.resolve();
    return pending.promise;
  });
  const request = h.api.get("/me/trips");
  await dispatched.promise;
  // Act
  h.emit("SIGNED_OUT", null);
  pending.resolve([{ title: "private A" }]);
  // Assert
  await assert.rejects(request, { name: "AbortError" });
});

test("does not replay an A mutation under B after a delayed 401", async () => {
  // Arrange
  const h = harness();
  await h.auth.initialize();
  const pending = deferred();
  const dispatched = deferred();
  h.setTransport(() => {
    dispatched.resolve();
    return pending.promise;
  });
  const before = h.calls.length;
  const request = h.api.post("/trips", { body: { title: "A only" } });
  await dispatched.promise;
  // Act
  h.emit("SIGNED_IN", sessionB);
  pending.reject({ statusCode: 401 });
  // Assert
  await assert.rejects(request, { name: "AbortError" });
  assert.equal(h.calls.length - before, 1);
  assert.equal(h.refreshes, 0);
  h.emit("SIGNED_OUT", null);
});

test("returns a successful replay after token refresh for the same account", async () => {
  // Arrange
  const h = harness();
  await h.auth.initialize();
  let attempts = 0;
  h.setTransport(async () => {
    if (attempts++ === 0) throw { statusCode: 401 };
    return [{ title: "A trip" }];
  });
  // Act
  const trips = await h.api.get("/me/trips");
  // Assert
  assert.equal(trips[0].title, "A trip");
  assert.equal(attempts, 2);
  assert.equal(h.refreshes, 1);
});

test("does not dispatch a replay if the account changes during token refresh", async () => {
  // Arrange
  const h = harness();
  await h.auth.initialize();
  const pending = deferred();
  const refreshing = deferred();
  h.setTransport(async () => {
    throw { statusCode: 401 };
  });
  h.sdk.refreshSession = () => {
    refreshing.resolve();
    return pending.promise;
  };
  const before = h.calls.length;
  const request = h.api.post("/trips", { body: { title: "A only" } });
  await refreshing.promise;
  // Act
  h.emit("SIGNED_IN", sessionB);
  pending.resolve({ data: { session: sessionB } });
  // Assert
  await assert.rejects(request, { name: "AbortError" });
  assert.equal(h.calls.length - before, 1);
  h.emit("SIGNED_OUT", null);
});
