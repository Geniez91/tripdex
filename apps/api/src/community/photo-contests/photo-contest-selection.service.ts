import { Injectable } from '@nestjs/common';
import { TripCoversService } from '../../trips/trip-covers.service.js';
import { PhotoContestService, PhotoContestClock } from './photo-contest.service.js';
import { WeeklyPhotoContestRepository, WeeklySelectionContext } from './weekly-photo-contest.repository.js';
import { rankWeeklyCandidates, WeeklyCandidate, weeklyPeriod } from './weekly-photo-contest.rules.js';
import type { ContestRecord } from './photo-contest.types.js';
import { addDays } from './photo-contest-helper.js';

export interface WeeklySelectionResult {
  outcome: 'created' | 'existing' | 'active' | 'no-candidate';
  contest: ContestRecord | null;
  countryName: string | null;
}
const CONTEST_DURATION_DAYS = 7;

@Injectable()
export class WeeklyPhotoContestSelectionService {
  constructor(
    private readonly repository: WeeklyPhotoContestRepository,
    private readonly contests: PhotoContestService,
    private readonly covers: TripCoversService,
    private readonly clock: PhotoContestClock,
  ) {}

  async run(): Promise<WeeklySelectionResult> {
    const now = this.clock.now();

    await this.closeExpiredContests(now);

    return this.repository.withPeriod(
      weeklyPeriod(now),
      now.toISOString(),
      context => this.selectContest(context, now),
    );
  }

  private async closeExpiredContests(now: Date): Promise<void> {
    const expiredContests = await this.repository.expired(now.toISOString());

    for (const contest of expiredContests) {
      await this.contests.close(contest.id);
    }
  }

  private async selectContest(
    context: WeeklySelectionContext,
    now: Date,
  ): Promise<WeeklySelectionResult> {
    if (context.existing) {
      return {
        outcome: 'existing',
        contest: context.existing,
        countryName: null,
      };
    }

    if (context.active) {
      return {
        outcome: 'active',
        contest: context.active,
        countryName: null,
      };
    }

    return this.createContestFromBestCandidate(context, now);
  }

  private async createContestFromBestCandidate(
    context: WeeklySelectionContext,
    now: Date,
  ): Promise<WeeklySelectionResult> {
    const candidate = await this.findEligibleCandidate(context);

    if (!candidate) {
      return {
        outcome: 'no-candidate',
        contest: null,
        countryName: null,
      };
    }

    const contest = await this.contests.create(
      candidate.countryId,
      now.toISOString(),
      addDays(now, CONTEST_DURATION_DAYS).toISOString(),
      context.creation,
    );

    return {
      outcome: 'created',
      contest,
      countryName: candidate.countryName,
    };
  }

  private async findEligibleCandidate(
    context: WeeklySelectionContext,
  ): Promise<WeeklyCandidate | null> {
    const candidates = rankWeeklyCandidates(
      await context.candidates(),
      context.previous?.countryId ?? null,
    );

    for (const candidate of candidates) {
      if (await this.hasUsableCover(candidate)) {
        return candidate;
      }
    }

    return null;
  }

  private async hasUsableCover(
    candidate: WeeklyCandidate,
  ): Promise<boolean> {
    return Boolean(
      await this.covers.readUrl(
        candidate.userId,
        candidate.tripId,
        candidate.coverStoragePath,
      ),
    );
  }
}
