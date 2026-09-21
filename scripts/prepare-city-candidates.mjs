import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const CITY_CANDIDATE_SELECTOR_VERSION = "1";

const GEO_NAMES_COLUMNS = [
  "geonamesId",
  "name",
  "asciiname",
  "alternateNames",
  "latitude",
  "longitude",
  "featureClass",
  "featureCode",
  "countryIso2",
  "cc2",
  "admin1Code",
  "admin2Code",
  "admin3Code",
  "admin4Code",
  "population",
  "elevation",
  "dem",
  "timezone",
  "modifiedAt",
];

function normalizeName(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function toNumber(value, field, lineNumber) {
  const number = Number(value);
  if (!Number.isFinite(number))
    throw new Error(`Invalid ${field} at GeoNames line ${lineNumber}.`);
  return number;
}

export function parseGeoNamesRows(sourceText, source = "GeoNames") {
  return sourceText
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line, index) => {
      const values = line.split("\t");
      const lineNumber = index + 1;
      if (values.length !== GEO_NAMES_COLUMNS.length)
        throw new Error(`Invalid ${source} row at line ${lineNumber}.`);
      const row = Object.fromEntries(
        GEO_NAMES_COLUMNS.map((column, columnIndex) => [
          column,
          values[columnIndex],
        ]),
      );
      if (!/^\d+$/.test(row.geonamesId) || !/^[A-Z]{2}$/.test(row.countryIso2))
        throw new Error(`Invalid ${source} identity at line ${lineNumber}.`);
      return {
        geonamesId: Number(row.geonamesId),
        name: row.name,
        asciiname: row.asciiname,
        alternateNames: row.alternateNames
          ? row.alternateNames.split(",").filter(Boolean)
          : [],
        latitude: toNumber(row.latitude, "latitude", lineNumber),
        longitude: toNumber(row.longitude, "longitude", lineNumber),
        featureClass: row.featureClass,
        featureCode: row.featureCode,
        countryIso2: row.countryIso2,
        admin1Code: row.admin1Code || null,
        admin2Code: row.admin2Code || null,
        population: toNumber(row.population, "population", lineNumber),
        source,
      };
    });
}

function candidateFromRow(row) {
  return {
    geonamesId: row.geonamesId,
    name: row.name,
    asciiname: row.asciiname,
    alternateNames: row.alternateNames
      .filter((name) => /^[\x20-\x7E]+$/.test(name))
      .filter(
        (name) =>
          normalizeName(name) !== normalizeName(row.name) &&
          normalizeName(name) !== normalizeName(row.asciiname),
      )
      .slice(0, 12),
    countryIso2: row.countryIso2,
    featureCode: row.featureCode,
    admin1Code: row.admin1Code,
    admin2Code: row.admin2Code,
    latitude: row.latitude,
    longitude: row.longitude,
    population: row.population,
    source: row.source,
    candidateReason: "national-capital",
    reviewStatus: "unreviewed",
  };
}

function matchLegacyCity(city, rows) {
  const target = normalizeName(city.name);
  const matches = rows.filter(
    (row) =>
      row.countryIso2 === city.iso2 &&
      [row.name, row.asciiname, ...row.alternateNames].some(
        (name) => normalizeName(name) === target,
      ),
  );
  return {
    cityId: city.id,
    cityName: city.name,
    countryIso2: city.iso2,
    matches: matches.map((row) => ({
      geonamesId: row.geonamesId,
      name: row.name,
      asciiname: row.asciiname,
      featureCode: row.featureCode,
      latitude: row.latitude,
      longitude: row.longitude,
      population: row.population,
      source: row.source,
    })),
  };
}

export function prepareCityCandidates({ countries, legacyCities, rows, input }) {
  const countryCodes = new Set(countries.map((country) => country.iso2));
  const populatedPlaces = rows.filter(
    (row) => row.featureClass === "P" && countryCodes.has(row.countryIso2),
  );
  const capitalRows = populatedPlaces.filter(
    (row) => row.featureCode === "PPLC",
  );
  const capitalsByCountry = Map.groupBy(capitalRows, (row) => row.countryIso2);
  const candidates = capitalRows
    .map(candidateFromRow)
    .sort(
      (left, right) =>
        left.countryIso2.localeCompare(right.countryIso2, "en") ||
        left.name.localeCompare(right.name, "en"),
    );
  const unresolvedCountries = countries
    .map((country) => {
      const matches = capitalsByCountry.get(country.iso2) ?? [];
      if (matches.length === 1) return null;
      return {
        countryIso2: country.iso2,
        countryIso3: country.iso3,
        countryName: country.name,
        reason:
          matches.length === 0
            ? "no-national-capital-candidate"
            : "multiple-national-capital-candidates",
        candidateGeoNamesIds: matches.map((row) => row.geonamesId).sort(),
      };
    })
    .filter(Boolean);

  return {
    selectorVersion: CITY_CANDIDATE_SELECTOR_VERSION,
    input,
    candidates,
    unresolvedCountries,
    legacyMatches: legacyCities
      .map((city) => matchLegacyCity(city, populatedPlaces))
      .sort((left, right) => left.cityId.localeCompare(right.cityId, "en")),
  };
}

async function readSupplementalRows(path) {
  if (!path) return { rows: [], input: null };
  const bytes = await readFile(path);
  const supplemental = JSON.parse(bytes.toString("utf8"));
  if (!Array.isArray(supplemental.records))
    throw new Error("Supplemental input must contain a records array.");
  return {
    input: {
      filename: basename(path),
      sha256: createHash("sha256").update(bytes).digest("hex"),
    },
    rows: supplemental.records.map((record, index) => {
      const required = [
        "geonamesId",
        "name",
        "asciiname",
        "countryIso2",
        "latitude",
        "longitude",
        "featureClass",
        "featureCode",
        "population",
      ];
      if (required.some((field) => record[field] == null))
        throw new Error(`Invalid supplemental record ${index + 1}.`);
      return {
        ...record,
        alternateNames: record.alternateNames ?? [],
        admin1Code: record.admin1Code ?? null,
        admin2Code: record.admin2Code ?? null,
        source: "supplemental",
      };
    }),
  };
}

function argumentValue(argumentsByName, name) {
  const value = argumentsByName.get(name);
  if (!value) throw new Error(`Missing ${name}.`);
  return resolve(value);
}

export async function run(argumentsList) {
  const argumentsByName = new Map();
  for (let index = 0; index < argumentsList.length; index += 2) {
    argumentsByName.set(argumentsList[index], argumentsList[index + 1]);
  }
  const inputPath = argumentValue(argumentsByName, "--input");
  const outputPath = argumentValue(argumentsByName, "--output");
  const countriesPath = resolve(
    argumentsByName.get("--countries") ??
      "apps/api/src/prisma/data/countries.json",
  );
  const citiesPath = resolve(
    argumentsByName.get("--cities") ?? "apps/api/src/prisma/data/cities.json",
  );
  const supplementalPath = argumentsByName.get("--supplemental");
  const inputBytes = await readFile(inputPath);
  const [countries, legacyCities, supplemental] = await Promise.all([
    readFile(countriesPath, "utf8").then(JSON.parse),
    readFile(citiesPath, "utf8").then(JSON.parse),
    readSupplementalRows(supplementalPath && resolve(supplementalPath)),
  ]);
  const rows = [
    ...parseGeoNamesRows(inputBytes.toString("utf8")),
    ...supplemental.rows,
  ];
  const output = prepareCityCandidates({
    countries,
    legacyCities,
    rows,
    input: {
      dataset: "GeoNames cities15000",
      filename: basename(inputPath),
      sha256: createHash("sha256").update(inputBytes).digest("hex"),
      supplemental: supplemental.input,
    },
  });
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(
    `Wrote ${output.candidates.length} capital candidates and ${output.unresolvedCountries.length} unresolved countries.`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
