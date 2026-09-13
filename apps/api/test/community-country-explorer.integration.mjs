import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { db } from '../dist/prisma/db.js';
import { CommunityCountryExplorerRepository } from '../dist/community/repositories/community-country-explorer.repository.js';

test('country explorer aggregates unique travelers and public ratings, ordered public trips only', async () => {
  const rollback = new Error('Rollback country explorer fixtures');
  try {
    await assert.rejects(db.transaction(async tx => {
      const country = await tx.orm.public.Country.where({ iso3: 'JPN' }).first();
      assert.ok(country, 'Run npm run db:seed first');
      const userIds = [randomUUID(), randomUUID()];
      for (const id of userIds) {
        await tx.orm.public.User.create({
          id,
          email: `${id}@tripdex.invalid`,
          username: `country-${id}`,
        });
      }

      const trips = [
        { title: 'old public', userId: userIds[0], visibility: 'public', rating: 5, createdAt: '2042-04-01T00:00:00.000Z', start: '2042-06-14', end: '2042-06-15' },
        { title: 'middle public', userId: userIds[0], visibility: 'public', rating: 3, createdAt: '2042-04-02T00:00:00.000Z', start: '2042-05-01', end: '2042-05-03' },
        { title: 'new public', userId: userIds[1], visibility: 'public', rating: null, createdAt: '2042-04-03T00:00:00.000Z', start: '2042-03-01', end: '2042-03-02' },
        { title: 'newer public', userId: userIds[0], visibility: 'public', rating: null, createdAt: '2042-04-04T00:00:00.000Z', start: '2042-02-01', end: '2042-02-03' },
        { title: 'newest public', userId: userIds[1], visibility: 'public', rating: null, createdAt: '2042-04-05T00:00:00.000Z', start: '2042-01-01', end: '2042-01-04' },
        { title: 'private current', userId: userIds[1], visibility: 'private', rating: 1, createdAt: '2042-04-06T00:00:00.000Z', start: '2042-06-15', end: '2042-06-16' },
      ];

      for (const fixture of trips) {
        const trip = await tx.orm.public.Trip.create({
          userId: fixture.userId,
          title: fixture.title,
          startDate: `${fixture.start}T00:00:00.000Z`,
          endDate: `${fixture.end}T00:00:00.000Z`,
          rating: fixture.rating,
          review: null,
          visibility: fixture.visibility,
          coverStoragePath: null,
        });
        await tx.orm.public.TripCountry.create({ tripId: trip.id, countryId: country.id });
        const createdAt = db.raw.sql`UPDATE public.trip SET "createdAt" = ${fixture.createdAt}::timestamptz WHERE id = ${trip.id} RETURNING id`
          .returnsRow({ id: 'pg/text@1' }).build();
        for await (const row of tx.query(createdAt)) { void row; }
      }

      const database = {
        client: {
          raw: db.raw,
          runtime: () => ({ query: plan => tx.query(plan) }),
        },
      };
      const repository = new CommunityCountryExplorerRepository(database);
      const rows = await repository.detail('JPN', '2042-06-15');

      assert.equal(rows.length, 4);
      assert.equal(rows[0].travelers, 2);
      assert.equal(rows[0].travelersNow, 2);
      assert.equal(rows[0].averageRating, 4);
      assert.equal(rows[0].ratingCount, 2);
      assert.deepEqual(rows.map(row => row.tripTitle), [
        'newest public', 'newer public', 'new public', 'middle public',
      ]);
      assert.ok(rows.every(row => row.username?.startsWith('country-')));
      throw rollback;
    }), error => error === rollback);
  } finally {
    await db.close();
  }
});
