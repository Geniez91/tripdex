import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PhotoContestRepository } from '../src/community/photo-contests/photo-contest.repository.ts';
import { PhotoContestService } from '../src/community/photo-contests/photo-contest.service.ts';

const countries = ['JPN', 'ITA', 'FRA'].map(iso3 => ({ id: iso3, iso3, iso2: iso3.slice(0, 2), name: iso3 }));
function contest(countryId, winner, sequence = 1, status = 'CLOSED') {
  return { id: `${countryId}-${sequence}`, countryId, status, winnerSubmissionId: winner,
    startsAt: `2026-0${sequence}-01T00:00:00Z`, endsAt: `2026-0${sequence}-08T00:00:00Z`, createdAt: `2026-0${sequence}-01T00:00:00Z` };
}
// Read-only ORM double: exercise the existing repository/service/mapper chain.
function table(rows) {
  return { where: filter => table(rows.filter(row => Object.entries(filter).every(([key, value]) => row[key] === value))),
    select: () => table(rows), orderBy: () => table(rows), all: async () => rows, first: async () => rows[0] ?? null };
}
function harness(history) {
  const submissions = history.flatMap(c => [
    { id: `loser-${c.id}`, contestId: c.id, userId: 'other-author', tripId: `loser-trip-${c.id}`, coverStoragePath: 'loser-image', createdAt: c.startsAt },
    ...(c.winnerSubmissionId ? [{ id: c.winnerSubmissionId, contestId: c.id, userId: `author-${c.winnerSubmissionId}`,
      tripId: `trip-${c.winnerSubmissionId}`, coverStoragePath: `image-${c.winnerSubmissionId}`, createdAt: c.endsAt }] : []),
  ]);
  const users = submissions.map(s => ({ id: s.userId, username: s.userId, avatarUrl: null, email: 'private@example.invalid', supabaseAuthId: 'private-auth-id' }));
  const orm = { public: { Country: table(countries), PhotoContest: table(history), PhotoContestSubmission: table(submissions),
    PhotoContestVote: table([]), User: table(users), Trip: table(submissions.map(s => ({ id: s.tripId, title: s.tripId }))) } };
  const client = { orm, transaction: operation => operation({ orm }) };
  const repository = new PhotoContestRepository({ client });
  const reads = [];
  const service = new PhotoContestService(repository, { readUrl: async (userId, tripId, path) => {
    reads.push({ userId, tripId, path }); return `https://photos.test/${path}`;
  } }, { now: () => new Date('2026-09-13') });
  return { service, reads };
}
const japan = contest('JPN', 'A');
const italy = contest('ITA', 'B');
const cases = [
  ['A: Japan winner', [japan], { JPN: 'A' }],
  ['B: Italy OPEN preserves Japan', [japan, contest('ITA', null, 1, 'OPEN')], { JPN: 'A' }],
  ['C: Japan and Italy winners coexist', [japan, italy], { JPN: 'A', ITA: 'B' }],
  ['D: three countries keep independent winners', [japan, italy, contest('FRA', 'C')], { JPN: 'A', ITA: 'B', FRA: 'C' }],
  ['E: new Japan OPEN preserves both countries', [japan, italy, contest('JPN', null, 2, 'OPEN')], { JPN: 'A', ITA: 'B' }],
  ['F: new Japan winner replaces only Japan', [japan, italy, contest('JPN', 'C', 2)], { JPN: 'C', ITA: 'B' }],
  ['G: CLOSED without winner preserves previous Japan', [japan, contest('JPN', null, 2)], { JPN: 'A' }],
  ...countries.map(c => [`H: new ${c.iso3} OPEN cannot erase other countries`,
    [japan, italy, contest('FRA', 'C'), contest(c.id, null, 2, 'OPEN')], { JPN: 'A', ITA: 'B', FRA: 'C' }]),
];
for (const [name, history, expected] of cases) {
  test(name, async () => {
    // Arrange
    const before = JSON.stringify(history);
    const { service } = harness(history);
    // Act
    const memories = await service.memories();
    // Assert
    assert.deepEqual(Object.fromEntries(memories.map(m => [m.countryCode, m.winnerSubmissionId])), expected);
    assert.equal(JSON.stringify(history), before, 'winner history must remain intact');
  });
}
test('winner author and photo come from the winning submission, never another submission', async () => {
  // Arrange
  const { service, reads } = harness([japan, italy]);
  // Act
  const memories = await service.memories('ITA');
  // Assert
  assert.equal(memories.length, 1);
  assert.deepEqual(memories[0].user, { username: 'author-B', avatarUrl: null });
  assert.equal(memories[0].imageUrl, 'https://photos.test/image-B');
  assert.deepEqual(reads, [{ userId: 'author-B', tripId: 'trip-B', path: 'image-B' }]);
  assert.doesNotMatch(JSON.stringify(memories), /email|supabaseAuthId|coverStoragePath|other-author|loser/);
});
test('OPEN submissions and CLOSED without a winner never become a memory', async () => {
  // Arrange
  const { service } = harness([contest('JPN', 'unconfirmed', 1, 'OPEN'), contest('ITA', null)]);
  // Act
  const memories = await service.memories();
  // Assert
  assert.deepEqual(memories, []);
});
