import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as Vue from "vue";

const appRoot = new URL("../../app/", import.meta.url);
const readApp = path => readFileSync(new URL(path, appRoot), "utf8");

function loadModule(path, dependencies) {
  const module = { exports: {} };
  vm.runInNewContext(
    ts.transpileModule(readApp(path), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    { module, exports: module.exports, require: name => dependencies[name] ?? {}, URL, ...dependencies },
  );
  return module.exports;
}

test("city API service sends the scoped countryId and optional text query", async () => {
  let request;
  const apiUrl = loadModule("services/api/api-url.ts", {}).apiUrl;
  const service = loadModule("services/api/cities.ts", { "./api-url": { apiUrl }, $fetch: async (...args) => { request = args; return []; } });
  const controller = new AbortController();
  await service.getCities("https://api.tripdex.test", "country/id", controller.signal, " Tokyo ");
  const url = new URL(request[0]);
  assert.equal(url.pathname, "/cities");
  assert.equal(url.searchParams.get("countryId"), "country/id");
  assert.equal(url.searchParams.get("q"), "Tokyo");
  assert.equal(request[1].signal, controller.signal);
});

test("country city state keeps the latest country when an earlier request resolves late", async () => {
  const requests = [];
  const service = {
    getCities: (_baseURL, countryId, signal) => new Promise((resolve, reject) => {
      requests.push({ countryId, signal, resolve, reject });
    }),
  };
  const module = { exports: {} };
  vm.runInNewContext(
    ts.transpileModule(readApp("composables/useCountryCities.ts"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    {
      module, exports: module.exports,
      require: name => name === "~/services/api/cities" ? service : {},
      ref: Vue.ref, watch: Vue.watch, onBeforeUnmount: () => {},
      AbortController,
    },
  );
  const countryId = Vue.ref("country-a");
  const scope = Vue.effectScope();
  const state = scope.run(() => module.exports.useCountryCities(countryId, "https://api.tripdex.test"));
  try {
    assert.equal(requests[0].countryId, "country-a");
    countryId.value = "country-b";
    await Vue.nextTick();
    assert.equal(requests[0].signal.aborted, true);
    assert.equal(requests[1].countryId, "country-b");
    requests[1].resolve([{ id: "city-b", countryId: "country-b", name: "B", slug: "b" }]);
    await Promise.resolve();
    await Vue.nextTick();
    requests[0].resolve([{ id: "city-a", countryId: "country-a", name: "A", slug: "a" }]);
    await Promise.resolve();
    await Vue.nextTick();
    assert.deepEqual(state.cities.value.map(city => city.id), ["city-b"]);
    assert.equal(state.loading.value, false);
  } finally {
    scope.stop();
  }
});

test("country city state exposes neutral empty data and an API failure", async () => {
  let rejectRequest;
  const module = { exports: {} };
  vm.runInNewContext(
    ts.transpileModule(readApp("composables/useCountryCities.ts"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    {
      module, exports: module.exports,
      require: name => name === "~/services/api/cities" ? { getCities: () => new Promise((_resolve, reject) => { rejectRequest = reject; }) } : {},
      ref: Vue.ref, watch: Vue.watch, onBeforeUnmount: () => {}, AbortController,
    },
  );
  const scope = Vue.effectScope();
  const state = scope.run(() => module.exports.useCountryCities(Vue.ref("empty-country"), "https://api.tripdex.test"));
  try {
    rejectRequest(new Error("offline"));
    await new Promise(resolve => setTimeout(resolve, 0));
    await Vue.nextTick();
    assert.equal(state.failed.value, true);
    assert.deepEqual(JSON.parse(JSON.stringify(state.cities.value)), []);
  } finally {
    scope.stop();
  }
});

test("trip city selections retain each selected country and remove only deselected countries", () => {
  const selection = loadModule("services/tripCitySelection.ts", {});
  const reconciled = selection.reconcileTripCitySelections(
    ["country-b", "country-a"],
    { "country-a": ["city-a"], "country-b": ["city-b"], "country-c": ["city-c"] },
  );
  assert.deepEqual(JSON.parse(JSON.stringify(reconciled)), { "country-a": ["city-a"], "country-b": ["city-b"] });
  assert.equal(JSON.stringify(selection.flattenTripCitySelections(reconciled).sort()), JSON.stringify(["city-a", "city-b"]));
});
