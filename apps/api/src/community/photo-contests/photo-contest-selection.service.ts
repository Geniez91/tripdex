import { Injectable } from '@nestjs/common';
import { TripCoversService } from '../../trips/trip-covers.service.js';
import { PhotoContestService, PhotoContestClock } from './photo-contest.service.js';
import { WeeklyPhotoContestRepository } from './weekly-photo-contest.repository.js';
import { rankWeeklyCandidates, weeklyPeriod } from './weekly-photo-contest.rules.js';
import type {
  IWeeklyCandidate,
  IWeeklySelectionContext,
  IWeeklySelectionResult,
} from './photo-contest.types.js';
import { addDays } from './photo-contest-helper.js';

const CONTEST_DURATION_DAYS = 7;

@Injectable()
export class WeeklyPhotoContestSelectionService {
  constructor(
    private readonly repository: WeeklyPhotoContestRepository,
    private readonly contests: PhotoContestService,
    private readonly covers: TripCoversService,
    private readonly clock: PhotoContestClock,
  ) {}

  async run(): Promise<IWeeklySelectionResult> {
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
    context: IWeeklySelectionContext,
    now: Date,
  ): Promise<IWeeklySelectionResult> {
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
    context: IWeeklySelectionContext,
    now: Date,
  ): Promise<IWeeklySelectionResult> {
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
    context: IWeeklySelectionContext,
  ): Promise<IWeeklyCandidate | null> {
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
    candidate: IWeeklyCandidate,
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
