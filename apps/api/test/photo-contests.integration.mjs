import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import request from 'supertest';
import { db } from '../src/prisma/db.ts';
import { DatabaseService } from '../src/prisma/database.service.ts';
import { PhotoContestController } from '../src/community/photo-contests/photo-contest.controller.ts';
import { PhotoContestService, PhotoContestClock } from '../src/community/photo-contests/photo-contest.service.ts';
import { PhotoContestRepository } from '../src/community/photo-contests/photo-contest.repository.ts';
import { CommunityController } from '../src/community/community.controller.ts';
import { CommunityService } from '../src/community/community.service.ts';
import { CommunityActivityService } from '../src/community/community-activity.service.ts';
import { CommunityActivityRepository } from '../src/community/repositories/community-activity.repository.ts';
import { TripCoversService } from '../src/trips/trip-covers.service.ts';
import { TripCoversRepository } from '../src/trips/repositories/trip-covers.repository.ts';
import { CoverStorageService } from '../src/trips/cover-storage.service.ts';
import { AuthGuard } from '../src/auth/guards/auth.guard.ts';
import { authenticatedUser } from '../src/auth/auth-request.ts';

test('Photo contests: real PostgreSQL and HTTP contracts (fixtures roll back)', async t => {
  const rollback = new Error('rollback photo contest fixtures');
  try {
    await assert.rejects(db.transaction(async tx => {
      const database = { client: { orm: tx.orm, raw: db.raw,
        runtime: () => ({ query: plan => tx.query(plan) }), transaction: operation => operation(tx) } };
      const users = [randomUUID(), randomUUID(), randomUUID()];
      for (const id of users) await tx.orm.public.User.create({ id, username: id, email: `${id}@tripdex.invalid` });
      const country = await tx.orm.public.Country.create({ iso2: 'XZ', iso3: 'XZQ', name: 'Contest fixture', slug: randomUUID(), continentCode: 'AS' });
      const otherCountry = await tx.orm.public.Country.create({ iso2: 'XY', iso3: 'XYQ', name: 'Other fixture', slug: randomUUID(), continentCode: 'AS' });
      let now = new Date('2042-01-04T00:00:00.000Z');
      const signedPaths = [];
      const cleanedPaths = [];
      const module = await Test.createTestingModule({
        controllers: [PhotoContestController, CommunityController],
        providers: [PhotoContestService, PhotoContestRepository, CommunityActivityService, CommunityActivityRepository,
          TripCoversService, TripCoversRepository,
          { provide: DatabaseService, useValue: database },
          { provide: CommunityService, useValue: {} },
          { provide: PhotoContestClock, useValue: { now: () => now } },
          { provide: CoverStorageService, useValue: {
            signedUrl: async path => { signedPaths.push(path); return `https://photos.test/${path.split('/').at(-1)}?signature=test`; },
            upload: async () => {}, cleanup: async path => { cleanedPaths.push(path); return true; },
          } },
        ],
      }).overrideGuard(AuthGuard).useValue({ canActivate(context) {
        const req = context.switchToHttp().getRequest();
        const id = req.headers.authorization?.replace('Bearer ', '');
        if (!users.includes(id)) throw new UnauthorizedException();
        req[authenticatedUser] = { id, username: id };
        return true;
      } }).compile();
      const app = module.createNestApplication();
      await app.init();
      const http = request(app.getHttpServer());
      const service = module.get(PhotoContestService);
      const repository = module.get(PhotoContestRepository);
      const createTrip = async (userId, visibility, countryId = country.id, cover = true) => {
        const id = randomUUID();
        const trip = await tx.orm.public.Trip.create({ id, userId, visibility, title: `Souvenir ${id}`,
          startDate: '2041-12-01T00:00:00.000Z', createdAt: '2042-01-01T00:00:00.000Z',
          coverStoragePath: cover ? `users/${userId}/trips/${id}/cover/${randomUUID()}.png` : null });
        await tx.orm.public.TripCountry.create({ tripId: id, countryId });
        return trip;
      };
      const privateTrip = await createTrip(users[0], 'private');
      let own, other, contest, candidateA, candidateB;
      try {
        await t.test('PRIVATE-only country is ineligible; first PUBLIC enables eligibility without creating a contest', async () => {
          // Arrange
          assert.equal(await repository.eligibleCountry(country.id), false);
          // Act
          own = await createTrip(users[0], 'public');
          other = await createTrip(users[1], 'public');
          // Assert
          assert.equal(await repository.eligibleCountry(country.id), true);
          assert.equal((await tx.orm.public.PhotoContest.where({ countryId: country.id }).all()).length, 0);
        });
        await t.test('public read and no memory before a real winner', async () => {
          // Arrange
          contest = await service.create(country.id, '2042-01-01T00:00:00.000Z', '2042-01-08T00:00:00.000Z');
          // Act
          const response = await http.get(`/community/photo-contests/${contest.id}`).expect(200);
          // Assert
          assert.equal(response.body.status, 'OPEN');
          assert.equal(response.body.submissions.length, 0);
          const memory = await http.get(`/community/countries/${country.iso3}/memory`).expect(200);
          assert.ok(!memory.body || Object.keys(memory.body).length === 0);
          assert.equal((await service.memories(country.iso3)).length, 0);
          await http.post('/community/photo-contests').send({ countryId: country.id }).expect(404);
          await http.post(`/community/photo-contests/${contest.id}/close`).expect(404);
        });
        await t.test('submission and vote require authentication', async () => {
          // Arrange
          const path = `/community/photo-contests/${contest.id}`;
          // Act / Assert
          await http.post(`${path}/submissions`).send({ tripId: own.id }).expect(401);
          await http.put(`${path}/vote`).send({ submissionId: 'none' }).expect(401);
          await http.get(`${path}/participation`).expect(401);
        });
        await t.test('rejects PRIVATE, other owner, wrong country, missing cover and arbitrary URL', async () => {
          // Arrange
          const wrongCountry = await createTrip(users[0], 'public', otherCountry.id);
          const noCover = await createTrip(users[0], 'public', country.id, false);
          const path = `/community/photo-contests/${contest.id}/submissions`;
          // Act / Assert
          for (const [tripId, status] of [[privateTrip.id, 400], [other.id, 403], [wrongCountry.id, 400], [noCover.id, 400]]) {
            await http.post(path).set('Authorization', `Bearer ${users[0]}`).send({ tripId }).expect(status);
          }
          await http.post(path).set('Authorization', `Bearer ${users[0]}`).send({ tripId: own.id, imageUrl: 'https://arbitrary.test/photo' }).expect(400);
        });
        await t.test('eligible PUBLIC covers accepted; one submission per user/contest', async () => {
          // Arrange
          const path = `/community/photo-contests/${contest.id}/submissions`;
          // Act
          await http.post(path).set('Authorization', `Bearer ${users[0]}`).send({ tripId: own.id }).expect(204);
          await http.post(path).set('Authorization', `Bearer ${users[1]}`).send({ tripId: other.id }).expect(204);
          await http.post(path).set('Authorization', `Bearer ${users[0]}`).send({ tripId: own.id }).expect(409);
          const result = await service.detail(contest.id);
          [candidateA, candidateB] = result.submissions;
          // Assert
          assert.equal(result.submissions.length, 2);
          assert.ok(result.submissions.every(s => s.imageUrl.startsWith('https://photos.test/')));
          assert.doesNotMatch(JSON.stringify(result), /coverStoragePath|userId|email|supabaseAuthId|authMetadata/);
        });
        await t.test('different countries can have simultaneous OPEN contests', async () => {
          // Arrange
          const otherContest = await service.create(otherCountry.id, contest.startsAt, contest.endsAt);
          // Act
          const first = await service.detail(contest.id);
          const second = await service.detail(otherContest.id);
          // Assert
          assert.equal(first.acceptsEntries, true);
          assert.equal(second.acceptsEntries, true);
          assert.notEqual(first.country.id, second.country.id);
        });
        await t.test('authenticated self vote and change A to B keep one vote', async () => {
          // Arrange
          const path = `/community/photo-contests/${contest.id}/vote`;
          // Act
          await http.put(path).set('Authorization', `Bearer ${users[0]}`).send({ submissionId: candidateA.id }).expect(204);
          let result = await service.detail(contest.id);
          assert.equal(result.submissions.find(s => s.id === candidateA.id).votes, 1);
          await http.put(path).set('Authorization', `Bearer ${users[0]}`).send({ submissionId: candidateB.id }).expect(204);
          result = await service.detail(contest.id);
          // Assert
          assert.equal(result.totalVotes, 1);
          assert.equal(result.submissions.find(s => s.id === candidateA.id).votes, 0);
          assert.equal(result.submissions.find(s => s.id === candidateB.id).votes, 1);
          assert.equal((await tx.orm.public.PhotoContestVote.where({ contestId: contest.id, userId: users[0] }).all()).length, 1);
          const participation = await http.get(`/community/photo-contests/${contest.id}/participation`).set('Authorization', `Bearer ${users[0]}`).expect(200);
          assert.equal(participation.body.votedSubmissionId, candidateB.id);
        });
        await t.test('feed contains real contest and PUBLIC trips, excludes PRIVATE, and paginates without repeats', async () => {
          // Arrange
          let cursor = null;
          const entries = [];
          // Act
          for (let i = 0; i < 6; i++) {
            const response = await http.get('/community/activity').query({ limit: 2, ...(cursor ? { cursor } : {}) }).expect(200);
            entries.push(...response.body.activities);
            cursor = response.body.nextCursor;
            if (!cursor) break;
          }
          // Assert
          assert.ok(entries.some(a => a.type === 'PHOTO_CONTEST_OPENED' && a.contest.id === contest.id));
          assert.ok(entries.some(a => a.type === 'TRIP_LOGGED' && a.trip.id === own.id));
          assert.ok(!entries.some(a => a.type === 'TRIP_LOGGED' && a.trip.id === privateTrip.id));
          const keys = entries.map(a => `${a.type}:${a.trip?.id ?? a.contest.id}`);
          assert.equal(new Set(keys).size, keys.length);
          assert.doesNotMatch(JSON.stringify(entries), /coverStoragePath|supabaseAuthId|email/);
        });
        await t.test('current OPEN contest is available ahead of a newer trip without changing chronological pagination', async () => {
          // Arrange
          const newer = await createTrip(users[0], 'public');
          await tx.orm.public.Trip.where({ id: newer.id }).update({ createdAt: '2042-01-03T12:00:00.000Z' });
          // Act
          const first = await http.get('/community/activity').query({ limit: 1 }).expect(200);
          const next = await http.get('/community/activity').query({ limit: 1, cursor: first.body.nextCursor }).expect(200);
          // Assert
          assert.equal(first.body.activities[0].type, 'TRIP_LOGGED');
          assert.equal(first.body.activities[0].trip.id, newer.id);
          assert.equal(first.body.openContest.type, 'PHOTO_CONTEST_OPENED');
          assert.equal(first.body.openContest.contest.status, 'OPEN');
          assert.ok(first.body.nextCursor);
          assert.equal(next.body.activities.length, 1);
          assert.notEqual(next.body.activities[0].trip?.id, newer.id);
          assert.equal(next.body.openContest, undefined);
        });
        await t.test('closure chooses most votes and blocks all subsequent mutations', async () => {
          // Arrange
          now = new Date('2042-01-08T00:00:00.000Z');
          // Act
          await service.close(contest.id);
          const result = await service.detail(contest.id);
          // Assert
          assert.equal(result.status, 'CLOSED');
          assert.equal(result.winnerSubmissionId, candidateB.id);
          await http.put(`/community/photo-contests/${contest.id}/vote`).set('Authorization', `Bearer ${users[0]}`).send({ submissionId: candidateA.id }).expect(409);
          await http.post(`/community/photo-contests/${contest.id}/submissions`).set('Authorization', `Bearer ${users[2]}`).send({ tripId: own.id }).expect(409);
          const memory = await http.get(`/community/countries/${country.iso3}/memory`).expect(200);
          assert.equal(memory.body.winnerSubmissionId, candidateB.id);
          assert.equal(memory.body.imageUrl, result.submissions.find(s => s.id === candidateB.id).imageUrl);
          assert.doesNotMatch(JSON.stringify(memory.body), /coverStoragePath|userId|email|supabaseAuthId/);
        });
        await t.test('new OPEN contest and CLOSED empty contest preserve the previous winner', async () => {
          // Arrange
          const next = await service.create(country.id, '2042-01-08T00:00:00.000Z', '2042-01-15T00:00:00.000Z');
          // Act / Assert
          assert.equal((await service.memories(country.iso3))[0].winnerSubmissionId, candidateB.id);
          await service.close(next.id);
          assert.equal((await service.detail(next.id)).winnerSubmissionId, null);
          assert.equal((await service.memories(country.iso3))[0].winnerSubmissionId, candidateB.id);
        });
        await t.test('a newer real winner replaces the memory; zero votes ties use earliest then id', async () => {
          // Arrange
          now = new Date('2042-01-16T00:00:00.000Z');
          const next = await service.create(country.id, '2042-01-15T00:00:00.000Z', '2042-01-22T00:00:00.000Z');
          await service.submit(next.id, users[0], own.id);
          await service.submit(next.id, users[1], other.id);
          const candidates = await tx.orm.public.PhotoContestSubmission.where({ contestId: next.id }).all();
          for (const candidate of candidates) await tx.orm.public.PhotoContestSubmission.where({ id: candidate.id }).update({ createdAt: '2042-01-16T00:00:00.000Z' });
          // Act
          await service.close(next.id);
          // Assert
          assert.equal((await service.memories(country.iso3))[0].winnerSubmissionId, candidates.map(s => s.id).sort()[0]);
          assert.equal((await service.memories(country.iso3))[0].contestId, next.id);
        });
        await t.test('replacing a submitted cover retains the original candidate file and history', async () => {
          // Arrange
          const covers = module.get(TripCoversService);
          const bytes = Buffer.from('89504e470d0a1a0a00000000', 'hex');
          // Act
          await covers.replace(users[1], other.id, { buffer: bytes, size: bytes.length, mimetype: 'image/png' });
          await service.detail(contest.id);
          // Assert
          assert.ok(signedPaths.includes(other.coverStoragePath));
          assert.ok(!cleanedPaths.includes(other.coverStoragePath));
          assert.equal(await module.get(TripCoversRepository).isSubmitted(other.id, other.coverStoragePath), true);
        });
        await t.test('OPEN without history and CLOSED empty without history never yield a memory', async () => {
          // Arrange
          const empty = await service.create(otherCountry.id, '2042-01-15T00:00:00.000Z', '2042-01-22T00:00:00.000Z');
          // Act / Assert
          assert.equal((await service.memories(otherCountry.iso3)).length, 0);
          await service.close(empty.id);
          assert.equal((await service.memories(otherCountry.iso3)).length, 0);
          const response = await http.get('/community/memories').expect(200);
          assert.ok(!response.body.some(m => m.countryCode === otherCountry.iso3));
        });
        for (const invariant of ['period', 'submission', 'vote', 'vote-contest']) {
          await t.test(`PostgreSQL enforces ${invariant} independently of service validation`, async () => {
            // Arrange
            const expectedCode = invariant === 'period' ? '23514' : invariant === 'vote-contest' ? '23503' : '23505';
            // Act / Assert
            await assert.rejects(db.transaction(async checkTx => {
              const destination = await checkTx.orm.public.Country.where({ iso3: 'JPN' }).first();
              const id = randomUUID();
              await checkTx.orm.public.User.create({ id, username: id, email: `${id}@tripdex.invalid` });
              const trip = await checkTx.orm.public.Trip.create({ userId: id, title: 'Constraint fixture', startDate: '2042-01-01T00:00:00.000Z' });
              const checkContest = await checkTx.orm.public.PhotoContest.create({ countryId: destination.id,
                startsAt: '2042-01-01T00:00:00.000Z', endsAt: invariant === 'period' ? '2042-01-01T00:00:00.000Z' : '2042-01-08T00:00:00.000Z' });
              const submission = await checkTx.orm.public.PhotoContestSubmission.create({ contestId: checkContest.id, userId: id, tripId: trip.id, coverStoragePath: 'internal-fixture' });
              if (invariant === 'submission') {
                await checkTx.orm.public.PhotoContestSubmission.create({ contestId: checkContest.id, userId: id, tripId: trip.id, coverStoragePath: 'internal-fixture' });
              } else if (invariant === 'vote') {
                await checkTx.orm.public.PhotoContestVote.create({ contestId: checkContest.id, userId: id, submissionId: submission.id });
                await checkTx.orm.public.PhotoContestVote.create({ contestId: checkContest.id, userId: id, submissionId: submission.id });
              } else if (invariant === 'vote-contest') {
                const other = await checkTx.orm.public.PhotoContest.create({ countryId: destination.id, startsAt: checkContest.startsAt, endsAt: checkContest.endsAt });
                await checkTx.orm.public.PhotoContestVote.create({ contestId: other.id, userId: id, submissionId: submission.id });
              }
              throw new Error('Expected database constraint was not enforced');
            }), error => {
              for (let cause = error; cause; cause = cause.cause) if (cause.code === expectedCode) return true;
              return false;
            });
          });
        }
      } finally { await app.close(); }
      throw rollback;
    }), error => error === rollback);
  } finally { await db.close(); }
});
