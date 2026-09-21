import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const LEGACY_CITY_IDENTITIES = [
  ["city-jp-tokyo", "JP", "tokyo"],
  ["city-jp-kyoto", "JP", "kyoto"],
  ["city-fr-paris", "FR", "paris"],
  ["city-fr-lyon", "FR", "lyon"],
  ["city-gb-london", "GB", "london"],
  ["city-it-rome", "IT", "rome"],
  ["city-es-barcelona", "ES", "barcelona"],
  ["city-us-new-york", "US", "new-york"],
  ["city-us-san-francisco", "US", "san-francisco"],
  ["city-ca-montreal", "CA", "montreal"],
  ["city-au-sydney", "AU", "sydney"],
  ["city-th-bangkok", "TH", "bangkok"],
  ["city-pt-lisbon", "PT", "lisbon"],
  ["city-mx-mexico-city", "MX", "mexico-city"],
  ["city-ma-marrakesh", "MA", "marrakesh"],
];

function ensure(condition, message) {
  if (!condition) throw new Error(message);
}

export function validateCityCatalog({ countries, cities, candidates = null }) {
  const countryCodes = new Set(countries.map((country) => country.iso2));
  const ids = new Set();
  const countrySlugs = new Set();
  const geonamesIds = new Set();
  for (const city of cities) {
    ensure(typeof city.id === "string" && city.id.length > 0, "Invalid city id.");
    ensure(!ids.has(city.id), `Duplicate city id: ${city.id}.`);
    ids.add(city.id);
    ensure(countryCodes.has(city.iso2), `Unknown city country: ${city.iso2}.`);
    const countrySlug = `${city.iso2}:${city.slug}`;
    ensure(!countrySlugs.has(countrySlug), `Duplicate city country/slug: ${countrySlug}.`);
    countrySlugs.add(countrySlug);
    ensure(typeof city.name === "string" && city.name.trim().length > 0, `Invalid city name: ${city.id}.`);
    ensure(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(city.slug), `Invalid city slug: ${city.id}.`);
    ensure(Number.isFinite(city.latitude) && city.latitude >= -90 && city.latitude <= 90, `Invalid city latitude: ${city.id}.`);
    ensure(Number.isFinite(city.longitude) && city.longitude >= -180 && city.longitude <= 180, `Invalid city longitude: ${city.id}.`);
    ensure(Number.isInteger(city.geonamesId) && city.geonamesId > 0, `Invalid GeoNames id: ${city.id}.`);
    ensure(!geonamesIds.has(city.geonamesId), `Duplicate GeoNames id: ${city.geonamesId}.`);
    geonamesIds.add(city.geonamesId);
    ensure(["national-capital", "legacy-non-capital"].includes(city.catalogReason), `Invalid catalog reason: ${city.id}.`);
  }
  for (const [id, iso2, slug] of LEGACY_CITY_IDENTITIES) {
    ensure(
      cities.some(
        (city) => city.id === id && city.iso2 === iso2 && city.slug === slug,
      ),
      `Legacy city identity changed: ${id}.`,
    );
  }
  if (!candidates) return;
  for (const candidate of candidates) {
    ensure(
      Number.isInteger(candidate.geonamesId) && candidate.geonamesId > 0,
      "Invalid candidate GeoNames id.",
    );
    ensure(
      countryCodes.has(candidate.countryIso2),
      `Unknown candidate country: ${candidate.geonamesId}.`,
    );
    ensure(
      ["selected", "rejected", "unreviewed"].includes(candidate.reviewStatus),
      `Invalid candidate review status: ${candidate.geonamesId}.`,
    );
  }
  const candidatesByGeoNamesId = new Map(
    candidates.map((candidate) => [candidate.geonamesId, candidate]),
  );
  for (const city of cities.filter(
    (city) => city.catalogReason === "national-capital",
  )) {
    const candidate = candidatesByGeoNamesId.get(city.geonamesId);
    ensure(candidate, `Capital lacks a reviewed candidate: ${city.id}.`);
    ensure(
      candidate.reviewStatus === "selected",
      `Capital candidate is not selected: ${city.id}.`,
    );
    ensure(
      candidate.countryIso2 === city.iso2,
      `Capital country differs from candidate: ${city.id}.`,
    );
  }
}

export async function run(argumentsList) {
  const [
    citiesPath = "apps/api/src/prisma/data/cities.json",
    countriesPath = "apps/api/src/prisma/data/countries.json",
    candidatesPath = "data/city-catalog-candidates.json",
  ] = argumentsList;
  const [cities, countries, candidateArtifact] = await Promise.all(
    [citiesPath, countriesPath, candidatesPath].map((path) =>
      readFile(resolve(path), "utf8").then(JSON.parse),
    ),
  );
  validateCityCatalog({
    countries,
    cities,
    candidates: candidateArtifact.candidates,
  });
  console.log(`Validated ${cities.length} reviewed cities.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
