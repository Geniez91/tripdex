import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { db } from '../dist/prisma/db.js';
import { TripsService } from '../dist/trips/trips.service.js';
import { DEVELOPMENT_USER } from '../dist/current-user/development-user.js';

test('Prisma 8: multi-country trips, unique visits, user isolation and rollback', async () => {
  const rollback = new Error('Rollback integration fixtures');
  let temporaryUserId;
  try {
    await assert.rejects(
      db.transaction(async (tx) => {
        const japan = await tx.orm.public.Country.where({
          iso3: 'JPN',
        }).first();
        const france = await tx.orm.public.Country.where({
          iso3: 'FRA',
        }).first();
        const spain = await tx.orm.public.Country.where({
          iso3: 'ESP',
        }).first();
        assert.ok(japan && france && spain, 'Run npm run db:seed first');
        temporaryUserId = randomUUID();
        const otherId = randomUUID();
        await tx.orm.public.User.create({
          id: temporaryUserId,
          email: `${temporaryUserId}@tripdex.invalid`,
          username: temporaryUserId,
        });
        await tx.orm.public.User.create({
          id: otherId,
          email: `${otherId}@tripdex.invalid`,
          username: otherId,
        });
        // All fixtures and real service queries share one outer rollback-only transaction.
        const service = new TripsService({
          client: { orm: tx.orm, transaction: (fn) => fn(tx) },
        });
        const trip = await service.create(temporaryUserId, {
          title: 'Japan integration',
          startDate: '2026-04-01T00:00:00.000Z',
          endDate: null,
          countryIds: [japan.id],
        });
        assert.equal(trip.isRevisit, false);
        assert.deepEqual(trip.revisitedCountryIds, []);
        assert.equal(
          (await tx.orm.public.TripCountry.where({ tripId: trip.id }).all())
            .length,
          1,
        );
        const revisit = await service.create(temporaryUserId, {
          title: 'Japan and Spain again',
          startDate: '2026-05-01T00:00:00.000Z',
          endDate: null,
          countryIds: [japan.id, spain.id],
        });
        assert.equal(revisit.isRevisit, true);
        assert.deepEqual(revisit.revisitedCountryIds, [japan.id]);
        assert.deepEqual(
          (await service.visitedCountries(temporaryUserId))
            .map((country) => country.iso3)
            .sort(),
          ['ESP', 'JPN'],
        );
        assert.deepEqual(await service.visitedCountries(otherId), []);
        const sameDateUserId = randomUUID();
        await tx.orm.public.User.create({
          id: sameDateUserId,
          email: `${sameDateUserId}@tripdex.invalid`,
          username: sameDateUserId,
        });
        const sameDateFirst = await service.create(sameDateUserId, {
          title: 'Same date first',
          startDate: '2027-01-01T00:00:00.000Z',
          endDate: null,
          countryIds: [france.id],
        });
        const sameDateSecond = await service.create(sameDateUserId, {
          title: 'Same date second',
          startDate: '2027-01-01T00:00:00.000Z',
          endDate: null,
          countryIds: [france.id],
        });
        assert.equal(sameDateFirst.isRevisit, false);
        assert.equal(sameDateSecond.isRevisit, false);
        const count = await tx.orm.public.Trip.where({
          userId: temporaryUserId,
        }).aggregate((aggregate) => ({ total: aggregate.count() }));
        await assert.rejects(
          service.create(temporaryUserId, {
            title: 'Invalid country',
            startDate: '2026-05-01T00:00:00.000Z',
            endDate: null,
            countryIds: [japan.id, 'missing-country'],
          }),
        );
        assert.deepEqual(
          await tx.orm.public.Trip.where({ userId: temporaryUserId }).aggregate(
            (aggregate) => ({ total: aggregate.count() }),
          ),
          count,
        );
        throw rollback;
      }),
      (error) => error === rollback,
    );
    assert.equal(
      await db.orm.public.User.where({ id: temporaryUserId }).first(),
      null,
    );

    // Force failure after the Trip and first TripCountry have been inserted.
    // This exercises the service's actual transaction boundary on PostgreSQL.
    const countries = await db.orm.public.Country.where((country) =>
      country.iso3.in(['JPN', 'FRA']),
    ).all();
    const title = `rollback-${randomUUID()}`;
    const forcedFailure = new Error('Simulated second junction write failure');
    const service = new TripsService({
      client: {
        transaction: (fn) =>
          db.transaction(async (tx) => {
            let writes = 0;
            return fn({
              orm: {
                public: {
                  Country: tx.orm.public.Country,
                  Trip: tx.orm.public.Trip,
                  TripCountry: {
                    create: (input) => {
                      if (++writes === 2) throw forcedFailure;
                      return tx.orm.public.TripCountry.create(input);
                    },
                  },
                },
              },
            });
          }),
      },
    });
    await assert.rejects(
      service.create(DEVELOPMENT_USER.id, {
        title,
        startDate: '2026-04-01T00:00:00.000Z',
        endDate: null,
        countryIds: countries.map((country) => country.id),
      }),
      (error) => error === forcedFailure,
    );
    assert.equal(await db.orm.public.Trip.where({ title }).first(), null);
  } finally {
    await db.close();
  }
});
