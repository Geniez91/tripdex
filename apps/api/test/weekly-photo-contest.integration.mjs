import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { db } from '../src/prisma/db.ts';
import { PhotoContestRepository } from '../src/community/photo-contests/photo-contest.repository.ts';
import { PhotoContestService } from '../src/community/photo-contests/photo-contest.service.ts';
import { WeeklyPhotoContestRepository } from '../src/community/photo-contests/weekly-photo-contest.repository.ts';
import { WeeklyPhotoContestSelectionService } from '../src/community/photo-contests/photo-contest-selection.service.ts';
import { WeeklyPhotoContestScheduler } from '../src/community/photo-contests/weekly-photo-contest.scheduler.ts';
import { weeklyPeriod } from '../src/community/photo-contests/weekly-photo-contest.rules.ts';

test('Weekly contest PostgreSQL schema and scheduler (fixtures roll back)', async t => {
  const rollback = new Error('rollback weekly fixtures');
  try {
    await t.test('weeklyPeriod exists with its valid unique index', async () => {
      const plan = db.raw.sql`
        SELECT json_build_object(
          'columns', (SELECT json_agg(column_name) FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'photoContest' AND column_name = 'weeklyPeriod'),
          'indexes', (SELECT json_agg(json_build_object('definition', pg_get_indexdef(i.indexrelid),
            'unique', i.indisunique, 'valid', i.indisvalid)) FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
            WHERE c.relname = 'photoContest_weeklyPeriod_key')
        )::text AS evidence
      `.returnsRow({ evidence: 'pg/text@1' }).build();
      const rows = [];
      for await (const row of db.runtime().query(plan)) rows.push(row);
      const evidence = JSON.parse(rows[0].evidence);
      assert.deepEqual(evidence.columns, ['weeklyPeriod']);
      assert.equal(evidence.indexes.length, 1);
      assert.equal(evidence.indexes[0].unique, true);
      assert.equal(evidence.indexes[0].valid, true);
      assert.match(evidence.indexes[0].definition, /\("weeklyPeriod"\)/);
    });
    await t.test('two scheduler ticks create exactly one contest for the same week', async () => {
      await assert.rejects(db.transaction(async tx => {
        const database = { client: { orm: tx.orm, raw: db.raw, transaction: fn => fn(tx) } };
        const id = randomUUID();
        const country = await tx.orm.public.Country.create({ iso2: 'XW', iso3: 'XWQ', name: 'Weekly rollback fixture', slug: id, continentCode: 'AS' });
        await tx.orm.public.User.create({ id, username: id, email: `${id}@tripdex.invalid` });
        const tripId = randomUUID();
        const now = new Date('2090-06-05T12:00:00.000Z');
        const path = `users/${id}/trips/${tripId}/cover/${randomUUID()}.png`;
        await tx.orm.public.Trip.create({ id: tripId, userId: id, title: 'Weekly fixture', visibility: 'public',
          startDate: now.toISOString(), createdAt: now.toISOString(), coverStoragePath: path });
        await tx.orm.public.TripCountry.create({ tripId, countryId: country.id, position: 0 });
        const covers = { readUrl: async (_user, _trip, storagePath) => storagePath === path ? 'https://photos.test/fixture.png' : null };
        const repository = new PhotoContestRepository(database);
        const service = new PhotoContestService(repository, covers, { now: () => now });
        const selection = new WeeklyPhotoContestSelectionService(new WeeklyPhotoContestRepository(database, repository), service, covers, { now: () => now });
        const results = [];
        const errors = [];
        const scheduler = new WeeklyPhotoContestScheduler({ run: async () => {
          try { const result = await selection.run(); results.push(result); return result; }
          catch (error) { errors.push(error); throw error; }
        } });
        await scheduler.tick();
        await scheduler.tick();
        await scheduler.onApplicationShutdown();
        assert.deepEqual(errors, []);
        assert.deepEqual(results.map(result => result.outcome), ['created', 'existing']);
        assert.equal(results[0].contest.id, results[1].contest.id);
        const contests = await tx.orm.public.PhotoContest.where({ weeklyPeriod: weeklyPeriod(now).key }).all();
        assert.equal(contests.length, 1);
        assert.equal(contests[0].countryId, country.id);
        throw rollback;
      }), error => error === rollback);
    });
    await t.test('PostgreSQL rejects duplicate weeklyPeriod with SQLSTATE 23505', async () => {
      await assert.rejects(db.transaction(async tx => {
        const country = await tx.orm.public.Country.where({ iso3: 'JPN' }).first();
        const data = { countryId: country.id, weeklyPeriod: '2091-06-04',
          startsAt: '2091-06-04T00:00:00.000Z', endsAt: '2091-06-11T00:00:00.000Z' };
        await tx.orm.public.PhotoContest.create(data);
        await tx.orm.public.PhotoContest.create(data);
        throw new Error('Duplicate weeklyPeriod was accepted');
      }), error => {
        for (let cause = error; cause; cause = cause.cause) {
          if (cause.code === '23505' && cause.constraint === 'photoContest_weeklyPeriod_key') return true;
        }
        return false;
      });
    });
  } finally { await db.close(); }
});
