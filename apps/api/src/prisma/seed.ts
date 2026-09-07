import { db } from './db.js';
import countries from './data/countries.json' with { type: 'json' };
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

async function seed() {
  validateCountries();
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
    if (developmentAuthEnabled()) {
      await tx.orm.public.User.upsert({ create: DEVELOPMENT_USER, update: {} });
    }
  });
  console.log(
    `Seed complete: ${countries.length} ISO countries. Existing IDs and trips preserved.`,
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
