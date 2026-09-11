import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(
  new URL("../../app/services/communityMap.ts", import.meta.url),
  "utf8",
);
const module = { exports: {} };
vm.runInNewContext(
  ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
  { module, exports: module.exports },
);
const {
  communityAppearances,
  communityDescription,
  selectedFlows,
  isCommunityYear,
} = module.exports;
function statistics(iso3, travelers, trending = false, travelersNow = 0) {
  return {
    country: { id: iso3, iso3, iso2: iso3.slice(0, 2), name: iso3 },
    travelers,
    trending,
    travelersNow,
    topOrigins: [],
  };
}

test("travelers use progressive intensity, with zero at the neutral end", () => {
  // Arrange
  const countries = [
    statistics("AAA", 0),
    statistics("BBB", 1),
    statistics("CCC", 14),
  ];
  // Act
  const result = communityAppearances(countries, "travelers", 2026);
  // Assert
  assert.match(result.AAA.fill, / 0%/);
  const intensities = Object.values(result).map((value) =>
    Number(value.fill.match(/ (\d+(?:\.\d+)?)%/)[1]),
  );
  assert.ok(intensities[0] < intensities[1] && intensities[1] < intensities[2]);
  assert.equal(result.CCC.description, "14 voyageurs en 2026");
});

test("trending trusts only the backend boolean even when counts contradict a threshold", () => {
  // Arrange
  const countries = [statistics("AAA", 999, false), statistics("BBB", 1, true)];
  // Act
  const result = communityAppearances(countries, "trending", 2025);
  // Assert
  assert.match(result.AAA.fill, /map-land/);
  assert.match(result.BBB.fill, /sun/);
  assert.doesNotMatch(result.AAA.description, /Tendance/);
  assert.match(result.BBB.description, /Tendance/);
});

test("current travelers remain current even when displaying a previous year", () => {
  // Arrange
  const country = statistics("JPN", 14, true, 2);
  // Act
  const description = communityDescription(country, 2025);
  // Assert
  assert.equal(
    description,
    "14 voyageurs en 2025 · Tendance · 2 en voyage actuellement",
  );
});

test("zero current travelers is not displayed as an active presence", () => {
  // Arrange
  const country = statistics("JPN", 1);
  // Act
  const description = communityDescription(country, 2026);
  // Assert
  assert.equal(description, "1 voyageur en 2026");
  assert.doesNotMatch(description, /actuellement/);
});

test("flows use only the selected destination and preserve aggregated counts", () => {
  // Arrange
  const japan = statistics("JPN", 14);
  japan.topOrigins = [
    { country: statistics("FRA", 0).country, travelers: 6 },
    { country: statistics("CAN", 0).country, travelers: 3 },
  ];
  const france = statistics("FRA", 6);
  france.topOrigins = [{ country: statistics("BEL", 0).country, travelers: 2 }];
  // Act
  const japanFlows = selectedFlows(japan);
  const franceFlows = selectedFlows(france);
  // Assert
  assert.equal(
    JSON.stringify(japanFlows),
    JSON.stringify([
      { originIso3: "FRA", destinationIso3: "JPN", travelers: 6 },
      { originIso3: "CAN", destinationIso3: "JPN", travelers: 3 },
    ]),
  );
  assert.equal(
    JSON.stringify(franceFlows),
    JSON.stringify([
      { originIso3: "BEL", destinationIso3: "FRA", travelers: 2 },
    ]),
  );
});

test("no selected country or origins produces no invented flows", () => {
  // Arrange
  const empty = statistics("JPN", 0);
  // Act
  const unselectedFlows = selectedFlows(null);
  const emptyFlows = selectedFlows(empty);
  // Assert
  assert.equal(unselectedFlows.length, 0);
  assert.equal(emptyFlows.length, 0);
});

test("year bounds match the existing calendar-year API contract", () => {
  // Arrange
  const valid = [1, 2026, 9998];
  const invalid = [0, 9999, 2026.5, NaN, Infinity];
  // Act
  const accepted = valid.map(isCommunityYear);
  const rejected = invalid.map(isCommunityYear);
  // Assert
  assert.ok(accepted.every(Boolean));
  assert.ok(rejected.every((value) => !value));
});
