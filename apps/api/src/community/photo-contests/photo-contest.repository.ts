import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../prisma/database.service.js';
import type { ICandidateRecord, IContestDetailRecord, IContestTransaction, IMemoryRecord } from './photo-contest.types.js';
import type { ICommunityActivityCursor } from '../dto/community-activity-query.dto.js';
import { currentWinnerContest } from './photo-contest.rules.js';

type TTransaction = Parameters<Parameters<DatabaseService['client']['transaction']>[0]>[0];

type TParticipationTripRow = {
  id: string;
  title: string;
  coverStoragePath: string;
};

@Injectable()
export class PhotoContestRepository {
  constructor(private readonly database: DatabaseService) {}

  async eligibleCountry(countryId: string, transaction?: TTransaction): Promise<boolean> {
    const plan = this.database.client.raw.sql`
      SELECT t.id FROM public.trip t
      JOIN public."tripCountry" tc ON tc."tripId" = t.id
      JOIN public."user" u ON u.id = t."userId"
      WHERE tc."countryId" = ${countryId} AND t.visibility = 'public' LIMIT 1
    `.returnsRow({ id: 'pg/text@1' }).build();
    for await (const row of transaction ? transaction.query(plan) : this.database.client.runtime().query(plan)) { if (row.id) return true; }
    return false;
  }
  create(countryId: string, startsAt: string, endsAt: string, weeklyPeriod: string | null = null, transaction?: TTransaction) {
    return (transaction?.orm ?? this.database.client.orm).public.PhotoContest.create({ countryId, startsAt, endsAt, weeklyPeriod });
  }

  private buildCandidatesQuery(contestId: string) {
    return this.database.client.raw.sql`
      SELECT
        submission.id,
        submission."contestId",
        submission."userId",
        submission."tripId",
        submission."coverStoragePath",
        submission."createdAt",
        traveler.username,
        traveler."avatarUrl",
        trip.title AS "tripTitle",
        COUNT(vote.id) AS votes
      FROM public."photoContestSubmission" submission
      JOIN public."user" traveler ON traveler.id = submission."userId"
      JOIN public.trip trip ON trip.id = submission."tripId"
      LEFT JOIN public."photoContestVote" vote
        ON vote."contestId" = submission."contestId"
        AND vote."submissionId" = submission.id
      WHERE submission."contestId" = ${contestId}
      GROUP BY submission.id, submission."contestId", submission."userId", submission."tripId",
        submission."coverStoragePath", submission."createdAt", traveler.username, traveler."avatarUrl", trip.title
      ORDER BY submission."createdAt" ASC
    `
      .returnsRow({
        id: 'pg/text@1',
        contestId: 'pg/text@1',
        userId: 'pg/text@1',
        tripId: 'pg/text@1',
        coverStoragePath: 'pg/text@1',
        createdAt: 'pg/timestamptz-string@1',
        username: 'pg/text@1',
        avatarUrl: { codecId: 'pg/text@1', nullable: true },
        tripTitle: 'pg/text@1',
        votes: 'pg/int8number@1',
      })
      .build();
  }

  private async candidates(tx: TTransaction, contestId: string): Promise<ICandidateRecord[]> {
    const candidates: ICandidateRecord[] = [];
    const plan = this.buildCandidatesQuery(contestId);
    for await (const row of tx.query(plan)) candidates.push(row);
    return candidates;
  }

  async detail(id: string): Promise<IContestDetailRecord> {
    return this.database.client.transaction(async tx => {
      const contest = await tx.orm.public.PhotoContest.where({ id }).first();
      if (!contest) throw new NotFoundException('Concours introuvable.');
      const country = await tx.orm.public.Country.where({ id: contest.countryId }).select('id', 'iso2', 'iso3', 'name').first();
      return { contest, country: country!, submissions: await this.candidates(tx, id) };
    });
  }

  async withContest<T>(id: string, operation: (context: IContestTransaction) => Promise<T>): Promise<T> {
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
    const eligibleTrips = await this.eligibleTrips(userId, countryId);
    return { votedSubmissionId: vote?.submissionId ?? null, ownSubmissionId: submission?.id ?? null, eligibleTrips };
  }

  private async eligibleTrips(userId: string, countryId: string): Promise<TParticipationTripRow[]> {
    const plan = this.database.client.raw.sql`
      SELECT trip.id, trip.title, trip."coverStoragePath"
      FROM public.trip trip
      JOIN public."tripCountry" country ON country."tripId" = trip.id
      WHERE trip."userId" = ${userId}
        AND trip.visibility = 'public'
        AND trip."coverStoragePath" IS NOT NULL
        AND country."countryId" = ${countryId}
    `
      .returnsRow({
        id: 'pg/text@1',
        title: 'pg/text@1',
        coverStoragePath: 'pg/text@1',
      })
      .build();
    const trips: TParticipationTripRow[] = [];
    for await (const row of this.database.client.runtime().query(plan)) trips.push(row);
    return trips;
  }

  async currentOpen(now: string) {
    return this.database.client.orm.public.PhotoContest.where({ status: 'OPEN' })
      .where(contest => contest.startsAt.lte(now))
      .where(contest => contest.endsAt.gt(now))
      .orderBy(contest => contest.startsAt.desc())
      .orderBy(contest => contest.id.desc()).first();
  }

  async opened(limit: number, cursor: ICommunityActivityCursor | null, now: string) {
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

  async memories(countryCode?: string): Promise<IMemoryRecord[]> {
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
    const memories: IMemoryRecord[] = [];
    for (const id of ids) {
      const record = await this.detail(id);
      const winner = record.submissions.find(s => s.id === record.contest.winnerSubmissionId);
      if (winner) memories.push({ contestId: id, country: record.country, winner });
    }
    return memories;
  }
}
