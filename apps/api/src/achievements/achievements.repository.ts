import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../prisma/database.service.js';
import { ProgressionRepository } from '../trips/progression/progression.repository.js';

export interface CommunityAchievementCounts {
  voteCount: number;
  winCount: number;
}

@Injectable()
export class AchievementsRepository {
  constructor(
    private readonly progression: ProgressionRepository,
    private readonly database: DatabaseService,
  ) {}

  snapshot(userId: string) {
    return this.progression.snapshot(userId);
  }

  async communityCounts(userId: string): Promise<CommunityAchievementCounts> {
    const plan = this.database.client.raw.sql`
      SELECT
        (SELECT COUNT(*) FROM public."photoContestVote" WHERE "userId" = ${userId}) AS "voteCount",
        (SELECT COUNT(*)
         FROM public."photoContest" contest
         JOIN public."photoContestSubmission" submission
           ON submission.id = contest."winnerSubmissionId"
         WHERE contest.status = 'CLOSED' AND submission."userId" = ${userId}) AS "winCount"
    `
      .returnsRow({ voteCount: 'pg/int8number@1', winCount: 'pg/int8number@1' })
      .build();
    for await (const row of this.database.client.runtime().query(plan)) return row;
    return { voteCount: 0, winCount: 0 };
  }
}
