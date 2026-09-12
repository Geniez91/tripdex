import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import ts from 'typescript';
import { db } from '../dist/prisma/db.js';

// Execute the current source without a build or a mocked SQL boundary.
function sourceClass(path, name) {
  const module = { exports: {} };
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    experimentalDecorators: true,
  } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports,
    require: () => ({ Injectable: () => value => value }) });
  return module.exports[name];
}
const Repository = sourceClass('../src/community/repositories/community-activity.repository.ts', 'CommunityActivityRepository');
const Mapper = sourceClass('../src/community/mappers/community-activity.mapper.ts', 'CommunityActivityMapper');

test('a user can see their own PUBLIC trip and another user PUBLIC trip, but not their PRIVATE trip', async () => {
  const rollback = new Error('rollback self activity fixtures');
  try {
    await assert.rejects(db.transaction(async tx => {
      const currentUserId = randomUUID();
      const otherUserId = randomUUID();
      for (const id of [currentUserId, otherUserId]) {
        await tx.orm.public.User.create({ id, username: id, email: `${id}@tripdex.invalid` });
      }
      const country = await tx.orm.public.Country.where({ iso3: 'JPN' }).first();
      const create = async (userId, visibility, createdAt) => {
        const trip = await tx.orm.public.Trip.create({ userId, visibility, createdAt,
          title: 'Self activity regression', startDate: '2026-09-01T00:00:00.000Z' });
        await tx.orm.public.TripCountry.create({ tripId: trip.id, countryId: country.id });
        return trip;
      };
      const own = await create(currentUserId, 'public', '2099-01-03T00:00:00.000Z');
      const privateTrip = await create(currentUserId, 'private', '2099-01-04T00:00:00.000Z');
      const other = await create(otherUserId, 'public', '2099-01-02T00:00:00.000Z');
      const repository = new Repository({ client: { raw: db.raw, runtime: () => ({ query: plan => tx.query(plan) }) } });
      const records = Mapper.group(await repository.list(10, null));
      const ids = records.map(r => r.item.trip.id);
      assert.ok(ids.includes(own.id));
      assert.ok(ids.includes(other.id));
      assert.ok(!ids.includes(privateTrip.id));
      assert.ok(ids.indexOf(own.id) < ids.indexOf(other.id));
      const activity = records.find(r => r.item.trip.id === own.id);
      assert.equal(activity.userId, currentUserId);
      assert.equal(activity.item.type, 'TRIP_LOGGED');
      assert.equal(activity.item.trip.countries[0].iso3, 'JPN');
      assert.equal(activity.item.activityDate, '2099-01-03T00:00:00.000Z');
      throw rollback;
    }), error => error === rollback);
  } finally { await db.close(); }
});
