import assert from "node:assert/strict";
import test from "node:test";
import {
  parseGeoNamesRows,
  prepareCityCandidates,
} from "./prepare-city-candidates.mjs";
import {
  LEGACY_CITY_IDENTITIES,
  validateCityCatalog,
} from "./validate-city-catalog.mjs";

function geoNamesLine({
  id,
  name,
  ascii = name,
  aliases = "",
  latitude = "1",
  longitude = "2",
  featureCode = "PPLC",
  countryIso2 = "AA",
  admin1 = "01",
  population = "1000",
}) {
  return [
    id,
    name,
    ascii,
    aliases,
    latitude,
    longitude,
    "P",
    featureCode,
    countryIso2,
    "",
    admin1,
    "",
    "",
    "",
    population,
    "",
    "",
    "UTC",
    "2026-01-01",
  ].join("\t");
}

const countries = [
  { iso2: "AA", iso3: "AAA", name: "Alpha" },
  { iso2: "BB", iso3: "BBB", name: "Beta" },
  { iso2: "CC", iso3: "CCC", name: "Gamma" },
];

test("prepares deterministic capital candidates and reports ambiguous countries", () => {
  const rows = parseGeoNamesRows(
    [
      geoNamesLine({ id: "1", name: "Alpha City", countryIso2: "AA" }),
      geoNamesLine({ id: "2", name: "Beta One", countryIso2: "BB" }),
      geoNamesLine({ id: "3", name: "Beta Two", countryIso2: "BB", population: "20" }),
      geoNamesLine({ id: "4", name: "Gamma Town", countryIso2: "CC", featureCode: "PPLA", population: "1" }),
    ].join("\n"),
  );
  const input = { dataset: "fixture", filename: "fixture.txt", sha256: "hash", supplemental: null };
  const first = prepareCityCandidates({ countries, legacyCities: [], rows, input });
  const second = prepareCityCandidates({ countries, legacyCities: [], rows, input });

  assert.deepEqual(first, second);
  assert.deepEqual(first.candidates.map((candidate) => candidate.geonamesId), [1, 2, 3]);
  assert.deepEqual(
    first.candidates.map((candidate) => candidate.reviewStatus),
    ["unreviewed", "unreviewed", "unreviewed"],
  );
  assert.deepEqual(first.unresolvedCountries, [
    {
      countryIso2: "BB",
      countryIso3: "BBB",
      countryName: "Beta",
      reason: "multiple-national-capital-candidates",
      candidateGeoNamesIds: [2, 3],
    },
    {
      countryIso2: "CC",
      countryIso3: "CCC",
      countryName: "Gamma",
      reason: "no-national-capital-candidate",
      candidateGeoNamesIds: [],
    },
  ]);
});

test("matches an accented legacy name without changing its TripDex identity", () => {
  const rows = parseGeoNamesRows(
    geoNamesLine({
      id: "5",
      name: "MontrÃ©al",
      ascii: "Montreal",
      aliases: "Montreal",
      countryIso2: "AA",
      featureCode: "PPLA",
    }),
  );
  const result = prepareCityCandidates({
    countries: [countries[0]],
    legacyCities: [{ id: "city-ca-montreal", iso2: "AA", name: "Montreal" }],
    rows,
    input: { dataset: "fixture", filename: "fixture.txt", sha256: "hash", supplemental: null },
  });

  assert.equal(result.legacyMatches[0].cityId, "city-ca-montreal");
  assert.equal(result.legacyMatches[0].matches[0].geonamesId, 5);
});

test("rejects catalog changes to a locked legacy city identity", () => {
  assert.throws(
    () =>
      validateCityCatalog({
        countries: [{ iso2: "JP" }],
        cities: [
          {
            id: "city-jp-tokyo",
            iso2: "JP",
            name: "Tokyo",
            slug: "renamed-tokyo",
            latitude: 35,
            longitude: 139,
            geonamesId: 1,
            catalogReason: "national-capital",
          },
        ],
      }),
    /Legacy city identity changed/,
  );
});

test("requires every reviewed capital to retain a matching candidate", () => {
  const city = {
    id: "capital",
    iso2: "ZZ",
    name: "Test Capital",
    slug: "test-capital",
    latitude: 35,
    longitude: 139,
    geonamesId: 1,
    catalogReason: "national-capital",
  };
  assert.throws(
    () =>
      validateCityCatalog({
        countries: [
          ...new Set(LEGACY_CITY_IDENTITIES.map(([, iso2]) => iso2)),
          "ZZ",
        ].map((iso2) => ({ iso2 })),
        cities: [
          ...LEGACY_CITY_IDENTITIES.map(([id, iso2, slug], index) => ({
            id,
            iso2,
            name: id,
            slug,
            latitude: index,
            longitude: index,
            geonamesId: index + 10,
            catalogReason: "legacy-non-capital",
          })),
          city,
        ],
        candidates: [],
      }),
    /Capital lacks a reviewed candidate/,
  );
});

test("allows reviewed candidates that are not selected for publication", () => {
  const city = {
    id: "capital",
    iso2: "ZZ",
    name: "Test Capital",
    slug: "test-capital",
    latitude: 35,
    longitude: 139,
    geonamesId: 1,
    catalogReason: "national-capital",
  };

  assert.doesNotThrow(() =>
    validateCityCatalog({
      countries: [
          ...new Set(LEGACY_CITY_IDENTITIES.map(([, iso2]) => iso2)),
          "ZZ",
        ].map((iso2) => ({ iso2 })),
      cities: [
        ...LEGACY_CITY_IDENTITIES.map(([id, iso2, slug], index) => ({
          id,
          iso2,
          name: id,
          slug,
          latitude: index,
          longitude: index,
          geonamesId: index + 10,
          catalogReason: "legacy-non-capital",
        })),
        city,
      ],
      candidates: [
        { geonamesId: 1, countryIso2: "ZZ", reviewStatus: "selected" },
        { geonamesId: 2, countryIso2: "ZZ", reviewStatus: "unreviewed" },
      ],
    }),
  );
});
