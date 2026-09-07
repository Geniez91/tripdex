import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const sourcesPath = new URL("data/geography-sources.json", root);

async function download(url, json = true) {
  const response = await fetch(url, {
    headers: { "User-Agent": "TripDex-geography" },
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok)
    throw new Error(`Download failed (${response.status}): ${url}`);
  return json ? response.json() : response.text();
}

async function revision(repository) {
  const info = await download(
    `https://api.github.com/repos/${repository}/commits/master`,
  );
  return info.sha;
}

// Once created, this manifest pins both inputs so regeneration is reproducible.
let sources;
try {
  sources = JSON.parse(await readFile(sourcesPath, "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  sources = {
    countries: {
      repository: "mledoze/countries",
      revision: await revision("mledoze/countries"),
      license: "ODbL-1.0",
    },
    map: {
      repository: "nvkelso/natural-earth-vector",
      revision: await revision("nvkelso/natural-earth-vector"),
      license: "Public domain",
    },
  };
}

const rawUrl = (source, path) =>
  `https://raw.githubusercontent.com/${source.repository}/${source.revision}/${path}`;
const [rawCountries, rawMap, license] = await Promise.all([
  download(rawUrl(sources.countries, "countries.json")),
  download(rawUrl(sources.map, "geojson/ne_50m_admin_0_countries.geojson")),
  download(rawUrl(sources.countries, "LICENSE"), false),
]);

const continentCode = (country) => {
  if (country.region === "Americas")
    return country.subregion === "South America" ? "SA" : "NA";
  return {
    Africa: "AF",
    Antarctica: "AN",
    Antarctic: "AN",
    Asia: "AS",
    Europe: "EU",
    Oceania: "OC",
  }[country.region];
};
const assigned = rawCountries.filter(
  (country) => country.status === "officially-assigned",
);
const countries = assigned
  .map((country) => ({
    iso2: country.cca2,
    iso3: country.cca3,
    name: country.name.common,
    slug: country.name.common
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
    continentCode: continentCode(country),
  }))
  .sort((a, b) => a.iso2.localeCompare(b.iso2, "en"));

if (countries.length !== 249)
  throw new Error(
    `Expected 249 ISO countries; received ${countries.length}. Review the source.`,
  );
for (const key of ["iso2", "iso3", "slug"]) {
  if (
    new Set(countries.map((country) => country[key])).size !== countries.length
  )
    throw new Error(`Duplicate ${key}`);
}
if (countries.some((country) => !country.continentCode))
  throw new Error("Missing continent mapping.");

const byIso3 = new Map(assigned.map((country) => [country.cca3, country]));
const covered = new Set();
// Natural Earth includes non-ISO entities. Keep those neutral; never guess by name.
const features = rawMap.features.map((feature, index) => {
  const p = feature.properties;
  const iso3 =
    [p.ISO_A3_EH, p.ISO_A3, p.ADM0_A3].find((code) => byIso3.has(code)) ?? null;
  const country = byIso3.get(iso3);
  if (iso3) covered.add(iso3);
  return {
    type: "Feature",
    id: `shape-${index}`,
    properties: {
      iso3,
      name: country?.name.common ?? p.NAME_EN ?? p.ADMIN,
      label: country
        ? [country.latlng[1], country.latlng[0]]
        : [p.LABEL_X, p.LABEL_Y],
    },
    geometry: feature.geometry,
  };
});
// Tiny territories absent at 1:50m still have a visible, interactive map marker.
for (const country of assigned) {
  if (covered.has(country.cca3)) continue;
  const coordinates = [country.latlng[1], country.latlng[0]];
  features.push({
    type: "Feature",
    id: `point-${country.cca3}`,
    properties: {
      iso3: country.cca3,
      name: country.name.common,
      label: coordinates,
    },
    geometry: { type: "Point", coordinates },
  });
}

const outputs = [
  [
    "apps/api/src/prisma/data/countries.json",
    JSON.stringify(countries, null, 2) + "\n",
  ],
  [
    "apps/web/public/maps/world.json",
    JSON.stringify({ type: "FeatureCollection", features }) + "\n",
  ],
  ["data/geography-sources.json", JSON.stringify(sources, null, 2) + "\n"],
  ["data/COUNTRIES-LICENSE.txt", license],
];
for (const [path, content] of outputs) {
  const target = new URL(path, root);
  await mkdir(new URL("./", target), { recursive: true });
  await writeFile(target, content);
  console.log(
    `Written ${fileURLToPath(target)} (${Buffer.byteLength(content)} bytes)`,
  );
}
console.log(
  `${countries.length} ISO countries; ${covered.size} covered by polygons; ${countries.length - covered.size} fallback markers.`,
);
