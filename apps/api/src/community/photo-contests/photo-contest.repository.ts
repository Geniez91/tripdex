import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../prisma/database.service.js';
import type { CandidateRecord, ContestDetailRecord, ContestTransaction, MemoryRecord } from './photo-contest.types.js';
import type { CommunityActivityCursor } from '../dto/community-activity-query.dto.js';
import { currentWinnerContest } from './photo-contest.rules.js';

type Transaction = Parameters<Parameters<DatabaseService['client']['transaction']>[0]>[0];

@Injectable()
export class PhotoContestRepository {
  constructor(private readonly database: DatabaseService) {}

  async eligibleCountry(countryId: string, transaction?: Transaction): Promise<boolean> {
    const plan = this.database.client.raw.sql`
      SELECT t.id FROM public.trip t
      JOIN public."tripCountry" tc ON tc."tripId" = t.id
      JOIN public."user" u ON u.id = t."userId"
      WHERE tc."countryId" = ${countryId} AND t.visibility = 'public' LIMIT 1
    `.returnsRow({ id: 'pg/text@1' }).build();
    for await (const row of transaction ? transaction.query(plan) : this.database.client.runtime().query(plan)) { if (row.id) return true; }
    return false;
  }
  create(countryId: string, startsAt: string, endsAt: string, weeklyPeriod: string | null = null, transaction?: Transaction) {
    return (transaction?.orm ?? this.database.client.orm).public.PhotoContest.create({ countryId, startsAt, endsAt, weeklyPeriod });
  }

  private async candidates(tx: Transaction, contestId: string): Promise<CandidateRecord[]> {
    const submissions = await tx.orm.public.PhotoContestSubmission.where({ contestId }).orderBy(s => s.createdAt.asc()).all();
    const votes = await tx.orm.public.PhotoContestVote.where({ contestId }).all();
    return Promise.all(submissions.map(async submission => {
      const user = await tx.orm.public.User.where({ id: submission.userId }).select('username', 'avatarUrl').first();
      const trip = await tx.orm.public.Trip.where({ id: submission.tripId }).select('title').first();
      return { ...submission, username: user!.username, avatarUrl: user!.avatarUrl, tripTitle: trip!.title,
        votes: votes.filter(vote => vote.submissionId === submission.id).length };
    }));
  }

  async detail(id: string): Promise<ContestDetailRecord> {
    return this.database.client.transaction(async tx => {
      const contest = await tx.orm.public.PhotoContest.where({ id }).first();
      if (!contest) throw new NotFoundException('Concours introuvable.');
      const country = await tx.orm.public.Country.where({ id: contest.countryId }).select('id', 'iso2', 'iso3', 'name').first();
      return { contest, country: country!, submissions: await this.candidates(tx, id) };
    });
  }

  async withContest<T>(id: string, operation: (context: ContestTransaction) => Promise<T>): Promise<T> {
    return this.database.client.transaction(async tx => {
      // Serialize submissions, vote changes and closure on the same contest.
      const lock = this.database.client.raw.sql`SELECT id FROM public."photoContest" WHERE id = ${id} FOR UPDATE`
        .returnsRow({ id: 'pg/text@1' }).build();
      for await (const row of tx.query(lock)) { void row; }
      const contest = await tx.orm.public.PhotoContest.where({ id }).first();
      if (!contest) throw new NotFoundException('Concours introuvable.');
      return operation({
        contest,
        trip: async tripId => {
          // Cover replacement locks this row too; a captured cover cannot be deleted mid-submission.
          const tripLock = this.database.client.raw.sql`SELECT id FROM public.trip WHERE id = ${tripId} FOR UPDATE`
            .returnsRow({ id: 'pg/text@1' }).build();
          for await (const row of tx.query(tripLock)) { void row; }
          const trip = await tx.orm.public.Trip.where({ id: tripId }).first();
          if (!trip) return null;
          const countries = await tx.orm.public.TripCountry.where({ tripId }).all();
          return { ...trip, countryIds: countries.map(c => c.countryId) };
        },
        ownSubmission: userId => tx.orm.public.PhotoContestSubmission.where({ contestId: id, userId }).first(),
        submit: async (userId, tripId, coverStoragePath) => {
          await tx.orm.public.PhotoContestSubmission.create({ contestId: id, userId, tripId, coverStoragePath });
        },
        candidates: () => this.candidates(tx, id),
        vote: async (userId, submissionId) => {
          const existing = await tx.orm.public.PhotoContestVote.where({ contestId: id, userId }).first();
          if (existing) await tx.orm.public.PhotoContestVote.where({ id: existing.id }).update({ submissionId });
          else await tx.orm.public.PhotoContestVote.create({ contestId: id, userId, submissionId });
        },
        close: async winnerSubmissionId => {
          await tx.orm.public.PhotoContest.where({ id }).update({ status: 'CLOSED', winnerSubmissionId });
        },
      });
    });
  }

  async participation(contestId: string, countryId: string, userId: string) {
    const orm = this.database.client.orm.public;
    const vote = await orm.PhotoContestVote.where({ contestId, userId }).first();
    const submission = await orm.PhotoContestSubmission.where({ contestId, userId }).first();
    const trips = await orm.Trip.where({ userId, visibility: 'public' }).all();
    const eligibleTrips = [];
    for (const trip of trips) {
      if (trip.coverStoragePath && await orm.TripCountry.where({ tripId: trip.id, countryId }).first()) eligibleTrips.push(trip);
    }
    return { votedSubmissionId: vote?.submissionId ?? null, ownSubmissionId: submission?.id ?? null, eligibleTrips };
  }

  async currentOpen(now: string) {
    return this.database.client.orm.public.PhotoContest.where({ status: 'OPEN' })
      .where(contest => contest.startsAt.lte(now))
      .where(contest => contest.endsAt.gt(now))
      .orderBy(contest => contest.startsAt.desc())
      .orderBy(contest => contest.id.desc()).first();
  }

  async opened(limit: number, cursor: CommunityActivityCursor | null, now: string) {
    const date = cursor?.createdAt ?? '9999-12-31T23:59:59.999Z';
    const id = cursor?.id ?? '';
    const plan = this.database.client.raw.sql`
      SELECT id, "startsAt" FROM public."photoContest"
      WHERE "startsAt" <= ${now}::timestamptz
        AND ("startsAt" < ${date}::timestamptz OR ("startsAt" = ${date}::timestamptz AND 'contest:' || id < ${id}))
      ORDER BY "startsAt" DESC, id DESC LIMIT ${limit + 1}
    `.returnsRow({ id: 'pg/text@1', startsAt: 'pg/timestamptz-string@1' }).build();
    const rows = [];
    for await (const row of this.database.client.runtime().query(plan)) rows.push(row);
    return rows;
  }

  async memories(countryCode?: string): Promise<MemoryRecord[]> {
    const orm = this.database.client.orm.public;
    const country = countryCode ? await orm.Country.where({ iso3: countryCode }).first() : null;
    if (countryCode && !country) return [];
    const history = country
      ? await orm.PhotoContest.where({ countryId: country.id, status: 'CLOSED' }).all()
      : await orm.PhotoContest.where({ status: 'CLOSED' }).all();
    const ids: string[] = [];
    for (const countryId of new Set(history.map(contest => contest.countryId))) {
      const winner = currentWinnerContest(history.filter(contest => contest.countryId === countryId));
      if (winner) ids.push(winner.id);
    }
    const memories: MemoryRecord[] = [];
    for (const id of ids) {
      const record = await this.detail(id);
      const winner = record.submissions.find(s => s.id === record.contest.winnerSubmissionId);
      if (winner) memories.push({ contestId: id, country: record.country, winner });
    }
    return memories;
  }
}
