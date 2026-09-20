import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { db } from '../dist/prisma/db.js';
import { TripsService } from '../dist/trips/trips.service.js';
import { TripCoversService } from '../dist/trips/trip-covers.service.js';
import { TripRepository } from '../dist/trips/repositories/trip.repository.js';
import { TripCoversRepository } from '../dist/trips/repositories/trip-covers.repository.js';
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
        const italy = await tx.orm.public.Country.where({
          iso3: 'ITA',
        }).first();
        const spain = await tx.orm.public.Country.where({
          iso3: 'ESP',
        }).first();
        assert.ok(japan && france && italy && spain, 'Run npm run db:seed first');
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
        const database = {
          client: { orm: tx.orm, transaction: (fn) => fn(tx) },
        };
        const covers = new TripCoversService(
          new TripCoversRepository(database),
          {
            upload: async () => {},
            signedUrl: async () => 'https://example.invalid/signed-cover',
            cleanup: async () => true,
          },
        );
        const service = new TripsService(new TripRepository(database), covers);
        await service.create(otherId, {
          title: 'Japan for another user',
          startDate: '2025-01-01T00:00:00.000Z',
          endDate: null,
          cityIds: [],
          rating: null,
          review: null,
          countryIds: [japan.id],
        });
        const trip = await service.create(temporaryUserId, {
          title: 'Japan integration',
          startDate: '2026-04-01T00:00:00.000Z',
          endDate: null,
          cityIds: [],
          rating: null,
          review: null,
          countryIds: [japan.id],
        });
        assert.equal(trip.containsRevisit, false);
        assert.deepEqual(trip.countries, [
          {
            country: { id: japan.id, iso2: japan.iso2, iso3: japan.iso3, name: japan.name, slug: japan.slug, continentCode: japan.continentCode },
            position: 0,
            isRevisit: false,
          },
        ]);
        assert.equal(trip.coverStoragePath, null);
        assert.equal(trip.coverUrl, null);
        const image = Buffer.from('89504e470d0a1a0a00000000', 'hex');
        const file = {
          buffer: image,
          size: image.length,
          mimetype: 'image/png',
        };
        await assert.rejects(covers.replace(otherId, trip.id, file));
        const firstCover = await covers.replace(temporaryUserId, trip.id, file);
        assert.ok(
          firstCover.coverStoragePath.startsWith(
            `users/${temporaryUserId}/trips/${trip.id}/cover/`,
          ),
        );
        assert.equal(
          (await service.detail(temporaryUserId, trip.id)).coverUrl,
          'https://example.invalid/signed-cover',
        );
        const secondCover = await covers.replace(
          temporaryUserId,
          trip.id,
          file,
        );
        assert.notEqual(
          secondCover.coverStoragePath,
          firstCover.coverStoragePath,
        );
        assert.equal(
          (await service.journal(temporaryUserId))[0].coverUrl,
          'https://example.invalid/signed-cover',
        );
        await covers.remove(temporaryUserId, trip.id);
        assert.equal(
          (await service.detail(temporaryUserId, trip.id)).coverStoragePath,
          null,
        );
        assert.equal(
          (await tx.orm.public.TripCountry.where({ tripId: trip.id }).all())
            .length,
          1,
        );
        const ordered = await service.create(otherId, {
          title: 'Italy France Japan order',
          startDate: '2026-04-10T00:00:00.000Z',
          endDate: null,
          cityIds: [],
          rating: null,
          review: null,
          countryIds: [italy.id, france.id, japan.id],
        });
        assert.deepEqual(
          ordered.countries.map(({ country, position }) => ({ id: country.id, position })),
          [
            { id: italy.id, position: 0 },
            { id: france.id, position: 1 },
            { id: japan.id, position: 2 },
          ],
        );
        await service.create(temporaryUserId, {
          title: 'Private Italy visit',
          startDate: '2026-04-15T00:00:00.000Z',
          endDate: null,
          cityIds: [],
          rating: null,
          review: null,
          visibility: 'private',
          countryIds: [italy.id],
        });
        const revisit = await service.create(temporaryUserId, {
          title: 'France and Italy again',
          startDate: '2026-05-01T00:00:00.000Z',
          endDate: null,
          cityIds: [],
          rating: null,
          review: null,
          countryIds: [france.id, italy.id],
        });
        assert.equal(revisit.containsRevisit, true);
        assert.deepEqual(
          revisit.countries.map(({ country, isRevisit, position }) => ({
            id: country.id,
            isRevisit,
            position,
          })),
          [
            { id: france.id, isRevisit: false, position: 0 },
            { id: italy.id, isRevisit: true, position: 1 },
          ],
        );
        assert.deepEqual(
          (await service.visitedCountries(temporaryUserId))
            .map((country) => country.iso3)
            .sort(),
          ['FRA', 'ITA', 'JPN'],
        );
        assert.deepEqual(
          (await service.visitedCountries(otherId)).map(
            (country) => country.iso3,
          ),
          ['JPN'],
        );
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
          cityIds: [],
          rating: null,
          review: null,
          countryIds: [france.id],
        });
        const sameDateSecond = await service.create(sameDateUserId, {
          title: 'Same date second',
          startDate: '2027-01-01T00:00:00.000Z',
          endDate: null,
          cityIds: [],
          rating: null,
          review: null,
          countryIds: [france.id],
        });
        assert.equal(sameDateFirst.containsRevisit, false);
        assert.equal(sameDateSecond.containsRevisit, false);
        assert.equal(sameDateFirst.countries[0].isRevisit, false);
        assert.equal(sameDateSecond.countries[0].isRevisit, false);
        const count = await tx.orm.public.Trip.where({
          userId: temporaryUserId,
        }).aggregate((aggregate) => ({ total: aggregate.count() }));
        await assert.rejects(
          service.create(temporaryUserId, {
            title: 'Invalid country',
            startDate: '2026-05-01T00:00:00.000Z',
            endDate: null,
            cityIds: [],
            rating: null,
            review: null,
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
    const repository = new TripRepository({
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
      repository.create(DEVELOPMENT_USER.id, {
        title,
        startDate: '2026-04-01T00:00:00.000Z',
        endDate: null,
        cityIds: [],
        rating: null,
        review: null,
        countryIds: countries.map((country) => country.id),
      }),
      (error) => error === forcedFailure,
    );
    assert.equal(await db.orm.public.Trip.where({ title }).first(), null);
  } finally {
    await db.close();
  }
});
