import assert from "node:assert/strict";
import { test } from "node:test";
import {
  deferred,
  harness,
  profileA,
  profileB,
  sessionA,
  sessionB,
} from "./auth-harness.mjs";

test("restores a persisted session and resolves its TripDex profile", async () => {
  // Arrange
  const h = harness();
  // Act
  await h.auth.initialize();
  // Assert
  assert.equal(h.auth.status.value, "authenticated");
  assert.equal(h.auth.profile.value.id, profileA.id);
});

test("A to B clears private data synchronously, preserves public data and resolves B", async () => {
  // Arrange
  const h = harness();
  await h.auth.initialize();
  h.caches.set("private-journal", [profileA]);
  const version = h.auth.sessionVersion.value;
  // Act
  h.emit("SIGNED_IN", sessionB);
  // Assert
  assert.equal(h.caches.has("private-journal"), false);
  assert.equal(h.caches.has("countries"), true);
  assert.equal(h.auth.profile.value, null);
  assert.ok(h.auth.sessionVersion.value > version);
  await h.auth.initialize();
  assert.equal(h.auth.profile.value.id, profileB.id);
});

test("cross-tab SIGNED_OUT purges private data and invalidates a delayed me response", async () => {
  // Arrange
  const h = harness();
  await h.auth.initialize();
  h.caches.set("private-trip-1", profileA);
  const pending = deferred();
  const dispatched = deferred();
  h.setTransport(() => {
    dispatched.resolve();
    return pending.promise;
  });
  h.emit("SIGNED_IN", sessionB);
  const resolving = h.auth.initialize();
  await dispatched.promise;
  // Act
  h.emit("SIGNED_OUT", null);
  pending.resolve(profileB);
  await resolving;
  // Assert
  assert.equal(h.auth.status.value, "anonymous");
  assert.equal(h.auth.profile.value, null);
  assert.equal(h.caches.has("private-trip-1"), false);
});

test("explicit logout invalidates private state before signOut finishes", async () => {
  // Arrange
  const h = harness();
  await h.auth.initialize();
  h.caches.set("private-journal", [profileA]);
  const pending = deferred();
  h.sdk.signOut = () => pending.promise;
  // Act
  const logout = h.auth.logout();
  // Assert
  assert.equal(h.auth.profile.value, null);
  assert.equal(h.caches.has("private-journal"), false);
  pending.resolve({ error: { message: "provider unavailable" } });
  await assert.rejects(logout, { message: "AUTH_UNAVAILABLE" });
});

test("a same-user token refresh keeps private page state", async () => {
  // Arrange
  const h = harness();
  await h.auth.initialize();
  h.caches.set("private-journal", [profileA]);
  const version = h.auth.sessionVersion.value;
  // Act
  h.emit("TOKEN_REFRESHED", { ...sessionA, access_token: "synthetic-renewed" });
  // Assert
  assert.equal(h.auth.sessionVersion.value, version);
  assert.equal(h.caches.has("private-journal"), true);
  assert.equal(h.auth.status.value, "authenticated");
});

test("a logout during initial session restoration wins over a stale getSession", async () => {
  // Arrange
  const h = harness();
  const pending = deferred();
  h.sdk.getSession = () => pending.promise;
  // Act
  const initialization = h.auth.initialize();
  h.emit("SIGNED_OUT", null);
  pending.resolve({ data: { session: sessionA } });
  await initialization;
  // Assert
  assert.equal(h.auth.status.value, "anonymous");
  assert.equal(h.auth.profile.value, null);
  assert.equal(h.calls.length, 0);
});

test("provisioning 503 preserves the Auth session without signing out", async () => {
  // Arrange
  const h = harness();
  h.setTransport(async () => {
    throw { statusCode: 503 };
  });
  // Act
  await h.auth.initialize();
  // Assert
  assert.equal(h.auth.status.value, "error");
  assert.notEqual(h.auth.session.value, null);
  assert.equal(h.signouts, 0);
});

test("TOKEN_REFRESHED during me does not start an unbounded profile retry loop", async () => {
  // Arrange
  const h = harness();
  let requests = 0;
  h.setTransport(async () => {
    requests++;
    throw { statusCode: requests > 4 ? 503 : 401 };
  });
  const refresh = h.sdk.refreshSession;
  h.sdk.refreshSession = async () => {
    h.emit("TOKEN_REFRESHED", sessionA);
    return refresh();
  };
  // Act
  await h.auth.initialize();
  // Assert
  assert.equal(requests, 2);
  assert.equal(h.refreshes, 1);
  assert.equal(h.auth.status.value, "error");
});

test("a refresh event cannot restore private state while logout is in flight", async () => {
  // Arrange
  const h = harness();
  await h.auth.initialize();
  const pending = deferred();
  h.sdk.signOut = () => pending.promise;
  // Act
  const logout = h.auth.logout();
  h.emit("TOKEN_REFRESHED", sessionA);
  pending.resolve({ error: null });
  await logout;
  // Assert
  assert.equal(h.auth.status.value, "anonymous");
  assert.equal(h.auth.profile.value, null);
  assert.equal(h.privateSession.scope.value.userId, null);
});
