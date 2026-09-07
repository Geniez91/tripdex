# Geography data

The exact upstream revisions are recorded in `geography-sources.json`.
Run `npm run data:prepare` from the repository root to reproduce the local data.
This command downloads the pinned sources; neither the seed nor the web app
needs an external geography service at runtime.

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
