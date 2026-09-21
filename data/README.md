# Geography data

The exact upstream revisions are recorded in `geography-sources.json`.
Run `npm run data:prepare` from the repository root to reproduce the local data.
This command downloads the pinned sources; neither the seed nor the web app
needs an external geography service at runtime.

## Reviewed city catalog

`apps/api/src/prisma/data/cities.json` is a human-reviewed TripDex catalog,
not a provider import. To prepare a review artifact from an explicitly obtained
GeoNames `cities15000.txt` snapshot, run:

```sh
npm run data:prepare:cities -- --input /path/to/cities15000.txt --output data/city-catalog-candidates.json
npm run data:validate:cities
```

The command never downloads input, contacts a database, or updates
`cities.json`. Candidate records are review evidence only; adding a city to
the TripDex catalog is a separate, deliberate edit. The pinned snapshot hash,
retrieval date, selector version, and required attribution are in
`geography-sources.json`. GeoNames data is licensed under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/): derived catalog
metadata must retain the stated GeoNames attribution. Prepared candidates start as
`unreviewed`; reviewers mark an evidence record `selected` only when it supports
a published national-capital city, or `rejected` when it does not. Candidates may
remain unreviewed or rejected and never need to appear in `cities.json`.

When a reviewed exception is absent from `cities15000`, pass a small local
JSON supplemental file with a `records` array. Each record supplies the same
review fields used by the output (`geonamesId`, name/asciiname, country ISO-2,
coordinates, populated-place feature class/code, population, and optional
aliases/admin codes). Its filename and SHA-256 are recorded in the output;
it is candidate evidence, not a second catalog or a runtime integration.

- Country names, ISO codes, regional classification and fallback coordinates:
  [mledoze/countries](https://github.com/mledoze/countries), **ODbL 1.0**.
  See `COUNTRIES-LICENSE.txt`. The derived country database and country metadata
  in the map are available under the same license. Only entries whose status is
  `officially-assigned` are included (249 countries and territories).
- Polygon geometry: [Natural Earth, Admin 0 countries, 1:50m](https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-countries-2/),
  [public domain](https://www.naturalearthdata.com/about/terms-of-use/).

Transformations: keep the common English country name, generate a normalized
slug, map the source region/subregion to AF/AN/AS/EU/NA/OC/SA, and strip unused map
properties. North America includes Central America and the Caribbean.

Map matching checks ISO_A3_EH, ISO_A3 and ADM0_A3 against the seed's ISO3 codes.
Non-ISO map entities remain neutral. Territories missing from the polygon data
are represented by points. Small polygons receive larger interactive markers
in the Vue component. Boundaries follow the upstream dataset; the map is not a
statement about sovereignty. ISO membership and a geographic polygon are
separate concepts, so no country is assigned by approximate name matching.
