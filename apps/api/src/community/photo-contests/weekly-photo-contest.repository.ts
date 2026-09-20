import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../prisma/database.service.js';
import { PhotoContestRepository } from './photo-contest.repository.js';
import type {
  IContestRecord,
  IPhotoContestCreation,
  IWeeklyCandidate,
  IWeeklyPeriod,
  IWeeklySelectionContext,
} from './photo-contest.types.js';

@Injectable()
export class WeeklyPhotoContestRepository {
  constructor(
    private readonly database: DatabaseService,
    private readonly contests: PhotoContestRepository,
  ) {}

  async expired(now: string): Promise<IContestRecord[]> {
    return this.database.client.orm.public.PhotoContest
      .where({ status: 'OPEN' })
      .where(contest => contest.endsAt.lte(now))
      .all();
  }

  private buildSelectionLockQuery() {
    return this.database.client.raw.sql`
      SELECT 1 AS locked
      FROM pg_advisory_xact_lock(734821, 1)
    `
      .returnsRow({
        locked: 'pg/int4@1',
      })
      .build();
  }

  private buildCandidatesQuery(now: string) {
    return this.database.client.raw.sql`
      SELECT
        c.id AS "countryId",
        c.iso3 AS "countryCode",
        c.name AS "countryName",
        t.id AS "tripId",
        t."userId",
        t.visibility,
        t."coverStoragePath",
        t."createdAt"
      FROM public.trip t
      JOIN public."tripCountry" tc ON tc."tripId" = t.id
      JOIN public.country c ON c.id = tc."countryId"
      WHERE t.visibility = 'public'
        AND t."coverStoragePath" IS NOT NULL
        AND t."createdAt" <= ${now}::timestamptz
      ORDER BY
        t."createdAt" DESC,
        c.iso3,
        c.id,
        t.id
    `
      .returnsRow({
        countryId: 'pg/text@1',
        countryCode: 'pg/text@1',
        countryName: 'pg/text@1',
        tripId: 'pg/text@1',
        userId: 'pg/text@1',
        visibility: 'pg/text@1',
        coverStoragePath: 'pg/text@1',
        createdAt: 'pg/timestamptz-string@1',
      })
      .build();
  }

  async withPeriod<T>(
    period: IWeeklyPeriod,
    now: string,
    operation: (context: IWeeklySelectionContext) => Promise<T>,
  ): Promise<T> {
    return this.database.client.transaction(async tx => {
      const lock = this.buildSelectionLockQuery();

      for await (const row of tx.query(lock)) {
        void row;
      }

      const orm = tx.orm.public;

      const weekly = await orm.PhotoContest
        .where({ weeklyPeriod: period.key })
        .first();

      const existing = weekly ?? await orm.PhotoContest
        .where(contest => contest.startsAt.gte(period.start))
        .where(contest => contest.startsAt.lt(period.end))
        .orderBy(contest => contest.startsAt.asc())
        .first();

      const active = await orm.PhotoContest
        .where({ status: 'OPEN' })
        .where(contest => contest.startsAt.lte(now))
        .where(contest => contest.endsAt.gt(now))
        .orderBy(contest => contest.startsAt.desc())
        .first();

      const previous = await orm.PhotoContest
        .where(contest => contest.startsAt.lt(period.start))
        .orderBy(contest => contest.startsAt.desc())
        .orderBy(contest => contest.createdAt.desc())
        .orderBy(contest => contest.id.desc())
        .first();

      const creation: IPhotoContestCreation = {
        eligibleCountry: countryId =>
          this.contests.eligibleCountry(countryId, tx),

        create: (countryId, startsAt, endsAt) =>
          this.contests.create(
            countryId,
            startsAt,
            endsAt,
            period.key,
            tx,
          ),
      };

      const candidates = async (): Promise<IWeeklyCandidate[]> => {
        const plan = this.buildCandidatesQuery(now);
        const results: IWeeklyCandidate[] = [];

        for await (const row of tx.query(plan)) {
          results.push(row);
        }

        return results;
      };

      return operation({
        existing,
        active,
        previous,
        creation,
        candidates,
      });
    });
  }
}
