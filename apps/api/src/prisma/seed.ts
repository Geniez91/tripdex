import { db } from './db.js';
import countries from './data/countries.json' with { type: 'json' };
import cities from './data/cities.json' with { type: 'json' };
import {
  DEVELOPMENT_USER,
  developmentAuthEnabled,
} from '../current-user/development-user.js';

function validateCountries() {
  if (countries.length !== 249)
    throw new Error('Expected 249 ISO country records.');
  for (const key of ['iso2', 'iso3', 'slug'] as const) {
    if (
      new Set(countries.map((country) => country[key])).size !==
      countries.length
    ) {
      throw new Error(`Duplicate country ${key}.`);
    }
  }
  for (const country of countries) {
    if (
      !/^[A-Z]{2}$/.test(country.iso2) ||
      !/^[A-Z]{3}$/.test(country.iso3) ||
      !country.name ||
      !country.slug ||
      !['AF', 'AN', 'AS', 'EU', 'NA', 'OC', 'SA'].includes(
        country.continentCode,
      )
    ) {
      throw new Error('Invalid country record.');
    }
  }
}

function validateCities() {
  const keys = cities.map((city) => `${city.iso2}:${city.slug}`);
  if (new Set(cities.map((city) => city.id)).size !== cities.length)
    throw new Error('Duplicate city id.');
  if (new Set(keys).size !== cities.length)
    throw new Error('Duplicate city country/slug.');
  for (const city of cities) {
    if (
      !city.id ||
      !/^[A-Z]{2}$/.test(city.iso2) ||
      !city.name ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(city.slug) ||
      !Number.isFinite(city.latitude) ||
      !Number.isFinite(city.longitude) ||
      city.latitude < -90 ||
      city.latitude > 90 ||
      city.longitude < -180 ||
      city.longitude > 180
    ) {
      throw new Error(`Invalid city record: ${city.id}`);
    }
  }
}

async function seed() {
  validateCountries();
  validateCities();
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  await db.transaction(async (tx) => {
    for (const country of countries) {
      await tx.orm.public.Country.upsert({
        create: country,
        update: {
          name: country.name,
          iso3: country.iso3,
          slug: country.slug,
          continentCode: country.continentCode,
        },
        conflictOn: { iso2: country.iso2 },
      });
    }
    const countryRows = await tx.orm.public.Country.select('id', 'iso2').all();
    const countryIds = new Map(
      countryRows.map((country) => [country.iso2, country.id]),
    );
    for (const city of cities) {
      const countryId = countryIds.get(city.iso2);
      if (!countryId) throw new Error(`Unknown city country: ${city.iso2}`);
      const existing = await tx.orm.public.City.where({
        countryId,
        slug: city.slug,
      }).first();
      if (existing) {
        await tx.orm.public.City.where({ id: existing.id }).update({
          name: city.name,
          latitude: city.latitude,
          longitude: city.longitude,
        });
      } else {
        await tx.orm.public.City.create({
          id: city.id,
          countryId,
          name: city.name,
          slug: city.slug,
          latitude: city.latitude,
          longitude: city.longitude,
        });
      }
    }
    if (developmentAuthEnabled()) {
      await tx.orm.public.User.upsert({ create: DEVELOPMENT_USER, update: {} });
    }
  });
  console.log(
    `Seed complete: ${countries.length} ISO countries and ${cities.length} MVP cities. Existing IDs and trips preserved.`,
  );
  console.log(
    `Development user: ${developmentAuthEnabled() ? 'ready' : 'disabled'}.`,
  );
}

try {
  await seed();
} catch {
  // Do not print driver errors: connection details can contain credentials.
  console.error(
    'Seed failed. Transaction rolled back. Check database connectivity, contract compatibility and unique country/user fields.',
  );
  process.exitCode = 1;
} finally {
  await db.close();
}
