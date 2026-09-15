import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const appRoot = new URL("../../app/", import.meta.url);
const readApp = (path) => readFileSync(new URL(path, appRoot), "utf8");

function loadApiUrl() {
  const module = { exports: {} };
  vm.runInNewContext(
    ts.transpileModule(readApp("services/api/api-url.ts"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    { module, exports: module.exports, URL },
  );
  return module.exports.apiUrl;
}

test("public API endpoints are built as absolute runtime-config URLs", () => {
  const apiUrl = loadApiUrl();
  assert.equal(apiUrl("http://localhost:3001", "/countries"), "http://localhost:3001/countries");
  assert.equal(apiUrl("https://api.tripdex.test/", "/community/activity"), "https://api.tripdex.test/community/activity");
});

test("public endpoint services never pass relative API paths to Nuxt fetch", () => {
  for (const path of [
    "services/api/countries.ts",
    "services/api/cities.ts",
    "services/api/community.ts",
    "services/api/photo-contests.ts",
  ]) {
    const source = readApp(path);
    assert.match(source, /apiUrl\(baseURL,/);
    assert.doesNotMatch(source, /\$fetch[^\n]*\(\s*["']\/(countries|cities|community)/);
  }
  const tripForm = readApp("components/TripForm.vue");
  assert.match(tripForm, /getCities\(config\.public\.apiBase, signal\)/);
  assert.doesNotMatch(tripForm, /useFetch<City\[]>\("\/cities"/);
});
