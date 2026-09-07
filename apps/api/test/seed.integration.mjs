import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { test } from 'node:test';
import { db } from '../dist/prisma/db.js';

async function snapshot() {
  return {
    countries: await db.orm.public.Country.select('id', 'iso2', 'iso3')
      .orderBy((country) => country.iso2.asc())
      .all(),
    users: await db.orm.public.User.select('id')
      .orderBy((user) => user.id.asc())
      .all(),
    trips: await db.orm.public.Trip.select('id', 'userId', 'title')
      .orderBy((trip) => trip.id.asc())
      .all(),
    links: await db.orm.public.TripCountry.select('tripId', 'countryId')
      .orderBy([(link) => link.tripId.asc(), (link) => link.countryId.asc()])
      .all(),
    cities: await db.orm.public.City.select(
      'id',
      'countryId',
      'slug',
      'latitude',
      'longitude',
    )
      .orderBy((city) => city.id.asc())
      .all(),
  };
}

test('running the country seed again preserves country/user IDs, trips and junctions', async () => {
  try {
    const before = await snapshot();
    assert.ok(
      before.countries.some((country) => country.iso3 === 'JPN'),
      'Run the initial seed first',
    );
    await promisify(execFile)(process.execPath, ['dist/prisma/seed.js'], {
      windowsHide: true,
    });
    assert.deepEqual(await snapshot(), before);
  } finally {
    await db.close();
  }
});
