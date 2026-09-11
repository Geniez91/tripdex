import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { db } from '../dist/prisma/db.js';
import { CommunityRepository } from '../dist/community/repositories/community.repository.js';
import { CommunityService } from '../dist/community/community.service.js';
import { ResidenceRepository } from '../dist/users/repositories/residence.repository.js';
import { ResidenceService } from '../dist/users/residence.service.js';

test('community counts distinct travelers, year overlaps, current visits and residence; fixtures roll back', async () => {
  const rollback = new Error('Rollback community fixtures');
  const userId = randomUUID();
  try {
    await assert.rejects(
      db.transaction(async (tx) => {
        const database = {
          client: {
            orm: tx.orm,
            raw: db.raw,
            runtime: () => ({
              query: (plan) => tx.query(plan),
            }),
          },
        };
        const repository = new CommunityRepository(database);
        const service = new CommunityService(repository, {
          today: () => '2042-06-15',
        });
        const residence = new ResidenceService(
          new ResidenceRepository(database),
        );
        const destination = await tx.orm.public.Country.where({
          iso3: 'JPN',
        }).first();
        const origin = await tx.orm.public.Country.where({
          iso3: 'FRA',
        }).first();
        assert.ok(destination && origin);
        const lookup = async (year) =>
          (await service.statistics(year)).countries.find(
            (row) => row.country.id === destination.id,
          );
        const before = await lookup(2042);
        const beforePast = await lookup(2041);
        const originCount = async () => {
          const rows = await repository.statistics(
            {
              start: '2042-01-01T00:00:00.000Z',
              next: '2043-01-01T00:00:00.000Z',
              today: '2042-06-15T00:00:00.000Z',
            },
            1000,
          );
          return (
            rows.find(
              (row) => row.id === destination.id && row.originId === origin.id,
            )?.originTravelers ?? 0
          );
        };
        const originsBefore = await originCount();
        const otherId = randomUUID();
        for (const id of [userId, otherId])
          await tx.orm.public.User.create({
            id,
            email: `${id}@tripdex.invalid`,
            username: id,
          });
        assert.deepEqual(await residence.get(userId), {
          residenceCountry: null,
        });
        assert.equal(
          (await residence.update(userId, origin.id)).residenceCountry.id,
          origin.id,
        );
        assert.equal((await residence.get(otherId)).residenceCountry, null);
        await assert.rejects(residence.update(userId, 'unknown-country'), {
          status: 400,
        });
        const trip = async (id, start, end) => {
          const record = await tx.orm.public.Trip.create({
            userId: id,
            title: 'Community integration',
            startDate: `${start}T00:00:00.000Z`,
            endDate: end ? `${end}T00:00:00.000Z` : null,
          });
          await tx.orm.public.TripCountry.create({
            tripId: record.id,
            countryId: destination.id,
          });
        };
        await trip(userId, '2041-12-31', '2042-01-01');
        await trip(userId, '2042-06-15', '2042-06-15');
        await trip(userId, '2042-06-14', '2042-06-16');
        await trip(otherId, '2042-06-15', null);
        const after = await lookup(2042);
        assert.equal(after.travelers, before.travelers + 2);
        assert.equal(after.travelersNow, before.travelersNow + 1);
        assert.equal(await originCount(), originsBefore + 1);
        assert.equal((await lookup(2041)).travelers, beforePast.travelers + 1);
        assert.equal((await lookup(2041)).travelersNow, after.travelersNow);
        assert.equal(after.trending, after.travelers >= 10);
        assert.ok(after.topOrigins.length <= 5);
        assert.ok(
          after.topOrigins.every(
            (row, i, rows) => i === 0 || rows[i - 1].travelers >= row.travelers,
          ),
        );
        assert.deepEqual(await residence.update(userId, null), {
          residenceCountry: null,
        });
        assert.equal((await residence.get(userId)).residenceCountry, null);
        assert.equal(await originCount(), originsBefore);
        await assert.rejects(residence.update(randomUUID(), null), {
          status: 404,
        });
        throw rollback;
      }),
      (error) => error === rollback,
    );
    assert.equal(await db.orm.public.User.where({ id: userId }).first(), null);
  } finally {
    await db.close();
  }
});
