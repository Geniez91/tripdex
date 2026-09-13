import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import ts from 'typescript';

const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../../app/services/communityActivity.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
const { presentCommunityActivity: present, communityActivityKey: key } = context.exports;
const now = Date.parse('2026-09-13T12:00:00Z');
const trip = id => ({ type: 'TRIP_LOGGED', activityDate: '2026-09-13T10:00:00Z', trip: { id } });
const contest = { type: 'PHOTO_CONTEST_OPENED', activityDate: '2026-09-10T00:00:00Z', contest: {
  id: 'weekly', status: 'OPEN', startsAt: '2026-09-10T00:00:00Z', endsAt: '2026-09-17T00:00:00Z',
} };

test('OPEN contest precedes even newer trips without changing cached chronology', () => {
  const activities = [trip('newer'), contest, trip('older')];
  const before = JSON.stringify(activities);
  const view = present(activities, now);
  assert.equal(view.featured, contest);
  assert.deepEqual(Array.from(view.recent, key), ['trip:newer', 'trip:older']);
  assert.equal(JSON.stringify(activities), before);
});

test('remaining activities retain their original chronological order', () => {
  const closed = { ...contest, contest: { ...contest.contest, id: 'previous', status: 'CLOSED' } };
  const activities = [trip('a'), contest, trip('b'), closed, trip('c')];
  assert.deepEqual(Array.from(present(activities, now).recent, key), ['trip:a', 'trip:b', 'contest:previous', 'trip:c']);
});

test('no OPEN contest preserves the exact current feed', () => {
  const activities = [trip('a'), { ...contest, contest: { ...contest.contest, status: 'CLOSED' } }];
  const view = present(activities, now);
  assert.equal(view.featured, null);
  assert.equal(view.recent, activities);
});

test('an expired or future contest has no premium position', () => {
  for (const time of [Date.parse(contest.contest.endsAt), Date.parse(contest.contest.startsAt) - 1]) {
    const activities = [trip('a'), contest];
    assert.equal(present(activities, time).featured, null);
    assert.equal(present(activities, time).recent, activities);
  }
});

test('pagination duplicates never produce a second featured contest or alter its cursor', () => {
  const response = { activities: [trip('a'), contest, trip('b'), { ...contest }], nextCursor: 'unchanged-cursor' };
  const view = present(response.activities, now);
  assert.equal([view.featured, ...view.recent].filter(activity => key(activity) === 'contest:weekly').length, 1);
  assert.deepEqual(Array.from(view.recent, key), ['trip:a', 'trip:b']);
  assert.equal(response.nextCursor, 'unchanged-cursor');
  assert.equal(response.activities.length, 4);
});

test('current OPEN contest is first even when its chronological activity is on a later page', () => {
  // Arrange
  const firstPage = [trip('newest'), trip('newer')];
  // Act
  const first = present(firstPage, now, contest);
  const next = present([...firstPage, contest, trip('older')], now, contest);
  // Assert
  assert.equal(first.featured, contest);
  assert.equal(next.featured, contest);
  assert.deepEqual(Array.from(next.recent, key), ['trip:newest', 'trip:newer', 'trip:older']);
  assert.equal([next.featured, ...next.recent].filter(activity => key(activity) === 'contest:weekly').length, 1);
});
