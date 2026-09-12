import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { test } from "node:test";
import { computed, ref, toRefs } from "vue";
import ts from "typescript";

function compile(source) {
  return ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText;
}
const read = (path) => readFileSync(new URL(`../../app/${path}`, import.meta.url), "utf8");
const activity = (id) => ({ type: "TRIP_LOGGED", trip: { id } });
const page = (ids, nextCursor = null) => ({ activities: ids.map(activity), nextCursor });
function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}
function harness() {
  const states = new Map();
  const calls = [];
  const tripCalls = [];
  let tripTransport = async () => [{ id: "own-trip" }];
  let transport = async () => page(["own"]);
  const globals = {
    exports: {}, ref, computed, toRefs,
    useRuntimeConfig: () => ({ public: { apiBase: "http://api.test" } }),
    useState: (key, init) => {
      if (!states.has(key)) states.set(key, ref(init()));
      return states.get(key);
    },
    require: () => ({ getCommunityActivity: (...args) => {
      calls.push(args);
      return transport(...args);
    } }),
  };
  vm.runInNewContext(compile(read("composables/useCommunityActivity.ts")), globals);
  const useCache = globals.exports.useCommunityActivity;
  function loadModule(path) {
    const context = { ...globals, exports: {} };
    vm.runInNewContext(compile(read(path)), context);
    return context.exports;
  }
  const tripsState = loadModule("composables/useTripsState.ts");
  globals.useTripsState = tripsState.useTripsState;
  globals.resetTripsCache = tripsState.resetTripsCache;
  globals.clearNuxtData = () => {};
  globals.usePrivateSession = loadModule("composables/usePrivateSession.ts").usePrivateSession;
  const privateSession = globals.usePrivateSession();
  privateSession.changeUser("user-a");
  globals.useTripdexApi = () => ({ get: (path) => {
    tripCalls.push(path);
    return tripTransport();
  } });
  const tripsApi = loadModule("services/api/trips.ts");
  globals.require = () => tripsApi;
  const useTrips = loadModule("composables/useTrips.ts").useTrips;
  return { globals, calls, useCache, cache: useCache(), useTrips, trips: useTrips(),
    tripCalls, privateSession, respondTrips: (fn) => { tripTransport = fn; },
    respond: (fn) => { transport = fn; } };
}

test("first load fills the cache; a new consumer reuses it without HTTP", async () => {
  // Arrange
  const h = harness();
  h.respond(async () => page(["own"], "next"));
  // Act
  await h.cache.load();
  const returned = await h.useCache().load();
  // Assert
  assert.equal(h.calls.length, 1);
  assert.equal(returned.activities[0].trip.id, "own");
  assert.equal(returned.nextCursor, "next");
  assert.equal(h.cache.hasLoaded.value, true);
  assert.equal(h.cache.invalidated.value, false);
});

test("invalidation is lazy and the next load replaces stale pages", async () => {
  // Arrange
  const h = harness();
  await h.cache.load();
  h.respond(async () => page(["new"]));
  // Act
  h.cache.invalidate();
  const callsBeforeLoad = h.calls.length;
  await h.cache.load();
  // Assert
  assert.equal(callsBeforeLoad, 1);
  assert.equal(h.calls.length, 2);
  assert.equal(h.cache.activities.value.length, 1);
  assert.equal(h.cache.activities.value[0].trip.id, "new");
});

test("an initial failure does not validate the cache and can be retried", async () => {
  // Arrange
  const h = harness();
  h.respond(async () => { throw new Error("offline"); });
  // Act
  await h.cache.load();
  // Assert
  assert.ok(h.cache.error.value);
  assert.equal(h.cache.hasLoaded.value, false);
  // Arrange
  h.respond(async () => page(["retry"]));
  // Act
  await h.cache.retry();
  // Assert
  assert.equal(h.calls.length, 2);
  assert.equal(h.cache.hasLoaded.value, true);
  assert.equal(h.cache.error.value, null);
});

test("a failed refresh keeps stale activities and cursor until retry succeeds", async () => {
  // Arrange
  const h = harness();
  h.respond(async () => page(["old"], "old-cursor"));
  await h.cache.load();
  h.cache.invalidate();
  h.respond(async () => { throw new Error("offline"); });
  // Act
  await h.cache.load();
  // Assert
  assert.equal(h.cache.activities.value[0].trip.id, "old");
  assert.equal(h.cache.nextCursor.value, "old-cursor");
  assert.equal(h.cache.invalidated.value, true);
  assert.ok(h.cache.error.value);
  // Arrange
  h.respond(async () => page(["fresh"]));
  // Act
  await h.cache.retry();
  // Assert
  assert.equal(h.cache.invalidated.value, false);
  assert.equal(h.cache.activities.value[0].trip.id, "fresh");
});

test("pagination deduplicates trips and survives remounts", async () => {
  // Arrange
  const h = harness();
  h.respond(async (_base, cursor) => cursor ? page(["a", "b"]) : page(["a"], "next"));
  await h.cache.load();
  // Act
  await h.cache.loadMore();
  await h.useCache().load();
  await h.cache.loadMore();
  // Assert
  assert.equal(h.calls.length, 2);
  assert.equal(h.calls[1][1], "next");
  assert.equal(h.cache.activities.value.map(a => a.trip.id).join(","), "a,b");
  assert.equal(h.cache.nextCursor.value, null);
});

test("pagination errors preserve the page and retry the same cursor", async () => {
  // Arrange
  const h = harness();
  h.respond(async () => page(["a"], "next"));
  await h.cache.load();
  h.respond(async () => { throw new Error("offline"); });
  // Act
  await h.cache.loadMore();
  // Assert
  assert.equal(h.cache.activities.value.length, 1);
  assert.ok(h.cache.error.value);
  // Arrange
  h.respond(async () => page(["b"]));
  // Act
  await h.cache.retry();
  // Assert
  assert.equal(h.calls[2][1], "next");
  assert.equal(h.cache.activities.value.length, 2);
});

test("concurrent consumers share HTTP and discard responses invalidated in flight", async () => {
  // Arrange
  const h = harness();
  const pending = deferred();
  h.respond(() => pending.promise);
  // Act
  const first = h.cache.load();
  const second = h.useCache().load();
  h.cache.invalidate();
  h.respond(async () => page(["fresh"]));
  const third = h.useCache().load();
  pending.resolve(page(["obsolete"]));
  await Promise.all([first, second, third]);
  // Assert
  assert.equal(h.calls.length, 2);
  assert.equal(h.cache.activities.value[0].trip.id, "fresh");
  assert.equal(h.cache.loading.value, false);
});

async function form(h, create, upload = async () => ({})) {
  const source = read("components/TripForm.vue").split('<script setup lang="ts">')[1].split("</script>")[0];
  return vm.runInNewContext(`(async () => { ${compile(source)}; return { submit, visibility, countryIds, cover }; })()`, {
    ...h.globals, exports: {}, FormData,
    useCommunityActivity: h.useCache,
    useTrips: h.useTrips,
    useTripdexApi: () => ({}),
    useFetch: async () => ({ data: ref([]) }),
    defineProps: () => ({ countries: [], loading: false }),
    defineEmits: () => () => {},
    require: (name) => {
      if (name.endsWith("tripMapper")) return { toCreateTripInput: (values) => values };
      if (name.endsWith("api/trips")) return { createTrip: create, updateTripCover: upload };
      if (name.endsWith("errors")) return { statusCodeFrom: () => 500 };
      throw new Error(name);
    },
  });
}

for (const visibility of ["public", "private"]) {
  test(`confirmed ${visibility} creation ${visibility === "public" ? "invalidates" : "preserves"} the cache`, async () => {
    // Arrange
    const h = harness();
    await h.cache.load();
    await h.trips.load();
    const pending = deferred();
    const f = await form(h, () => pending.promise);
    f.countryIds.value = ["jp"];
    f.visibility.value = visibility;
    // Act
    const submission = f.submit();
    // Assert
    assert.equal(h.cache.invalidated.value, false);
    assert.equal(h.trips.invalidated.value, false);
    // Act
    pending.resolve({ id: "created", visibility });
    await submission;
    // Assert
    assert.equal(h.cache.invalidated.value, visibility === "public");
    assert.equal(h.trips.invalidated.value, true);
    assert.equal(h.tripCalls.length, 1);
    assert.equal(h.calls.length, 1);
  });
}

test("rejected creation does not invalidate", async () => {
  // Arrange
  const h = harness();
  await h.cache.load();
  const f = await form(h, async () => { throw new Error("rejected"); });
  f.countryIds.value = ["jp"];
  f.visibility.value = "public";
  // Act
  await f.submit();
  // Assert
  assert.equal(h.cache.invalidated.value, false);
  assert.equal(h.trips.invalidated.value, false);
});

test("confirmed PUBLIC creation invalidates even if the subsequent cover upload fails", async () => {
  // Arrange
  const h = harness();
  await h.cache.load();
  const f = await form(h, async () => ({ id: "created", visibility: "public" }),
    async () => { throw new Error("upload failed"); });
  f.countryIds.value = ["jp"];
  f.cover.value = new Blob(["cover"]);
  // Act
  await f.submit();
  // Assert
  assert.equal(h.cache.invalidated.value, true);
  assert.equal(h.trips.invalidated.value, true);
});

test("Trips first load calls /me/trips and another Journal consumer reuses the cache", async () => {
  // Arrange
  const h = harness();
  // Act
  await h.trips.load();
  const trips = await h.useTrips().load();
  // Assert
  assert.deepEqual(h.tripCalls, ["/me/trips"]);
  assert.equal(trips[0].id, "own-trip");
  assert.equal(h.trips.hasLoaded.value, true);
  assert.equal(h.trips.loading.value, false);
});

test("Trips invalidation is lazy and load replaces the list", async () => {
  // Arrange
  const h = harness();
  await h.trips.load();
  h.respondTrips(async () => [{ id: "new-trip" }]);
  // Act
  h.trips.invalidate();
  const countBeforeLoad = h.tripCalls.length;
  await h.trips.load();
  // Assert
  assert.equal(countBeforeLoad, 1);
  assert.equal(h.tripCalls.length, 2);
  assert.equal(h.trips.trips.value[0].id, "new-trip");
  assert.equal(h.trips.invalidated.value, false);
});

test("Trips initial error permits retry", async () => {
  // Arrange
  const h = harness();
  h.respondTrips(async () => { throw new Error("offline"); });
  // Act
  await h.trips.load();
  // Assert
  assert.ok(h.trips.error.value);
  assert.equal(h.trips.hasLoaded.value, false);
  // Arrange
  h.respondTrips(async () => [{ id: "retried" }]);
  // Act
  await h.trips.load();
  // Assert
  assert.equal(h.tripCalls.length, 2);
  assert.equal(h.trips.error.value, null);
  assert.equal(h.trips.trips.value[0].id, "retried");
});

test("Trips failed refresh preserves stale data and permits retry", async () => {
  // Arrange
  const h = harness();
  await h.trips.load();
  h.trips.invalidate();
  h.respondTrips(async () => { throw new Error("offline"); });
  // Act
  await h.trips.load();
  // Assert
  assert.equal(h.trips.trips.value[0].id, "own-trip");
  assert.equal(h.trips.invalidated.value, true);
  assert.ok(h.trips.error.value);
  // Arrange
  h.respondTrips(async () => []);
  // Act
  await h.trips.load();
  // Assert
  assert.equal(h.trips.trips.value.length, 0);
  assert.equal(h.trips.invalidated.value, false);
  assert.equal(h.trips.hasLoaded.value, true);
});

test("Trips shares concurrent requests and rejects an invalidated response", async () => {
  // Arrange
  const h = harness();
  const pending = deferred();
  h.respondTrips(() => pending.promise);
  // Act
  const first = h.trips.load();
  const second = h.useTrips().load();
  h.trips.invalidate();
  h.respondTrips(async () => [{ id: "fresh" }]);
  pending.resolve([{ id: "obsolete" }]);
  await Promise.all([first, second]);
  // Assert
  assert.equal(h.tripCalls.length, 2);
  assert.equal(h.trips.trips.value[0].id, "fresh");
});

test("logout clears Trips synchronously, preserves Community, and prevents anonymous loading", async () => {
  // Arrange
  const h = harness();
  await h.trips.load();
  await h.cache.load();
  // Act
  h.privateSession.changeUser(null);
  await h.trips.load();
  // Assert
  assert.equal(h.trips.trips.value.length, 0);
  assert.equal(h.trips.hasLoaded.value, false);
  assert.equal(h.tripCalls.length, 1);
  assert.equal(h.cache.activities.value.length, 1);
});

test("account change discards the previous user's in-flight Trips response", async () => {
  // Arrange
  const h = harness();
  const pending = deferred();
  h.respondTrips(() => pending.promise);
  const oldLoad = h.trips.load();
  // Act
  h.privateSession.changeUser("user-b");
  h.respondTrips(async () => [{ id: "user-b-trip" }]);
  await h.useTrips().load();
  pending.resolve([{ id: "user-a-trip" }]);
  await oldLoad;
  // Assert
  assert.equal(h.trips.trips.value[0].id, "user-b-trip");
  assert.equal(h.trips.error.value, null);
  assert.equal(h.tripCalls.length, 2);
});
