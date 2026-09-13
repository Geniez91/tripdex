import { jest } from '@jest/globals';
import { WeeklyPhotoContestSelectionService } from './photo-contest-selection.service.js';
import { PhotoContestService } from './photo-contest.service.js';
import { WeeklyPhotoContestRepository, type WeeklySelectionContext } from './weekly-photo-contest.repository.js';
import { rankWeeklyCandidates, weeklyPeriod, type WeeklyCandidate } from './weekly-photo-contest.rules.js';
import { TripCoversService } from '../../trips/trip-covers.service.js';
import type { ContestRecord } from './photo-contest.types.js';

const now = new Date('2026-09-13T12:00:00Z');
const userId = '11111111-1111-4111-8111-111111111111';
const tripId = '22222222-2222-4222-8222-222222222222';
const candidate: WeeklyCandidate = { countryId: 'jp', countryCode: 'JPN', countryName: 'Japan',
  tripId, userId, visibility: 'public', createdAt: '2026-09-12T12:00:00.123456Z',
  coverStoragePath: `users/${userId}/trips/${tripId}/cover/33333333-3333-4333-8333-333333333333.png` };

describe('Weekly selection', () => {
  it('uses the current Monday UTC period even when starting on Sunday', () => {
    // Arrange / Act
    const period = weeklyPeriod(now);
    // Assert
    expect(period).toEqual({ key: '2026-09-07', start: '2026-09-07T00:00:00.000Z', end: '2026-09-14T00:00:00.000Z' });
  });

  it('ranks log timestamps at microsecond precision, excludes previous country and keeps country tie-break', () => {
    // Arrange
    const candidates = [candidate, { ...candidate, countryId: 'es', countryCode: 'ESP' },
      { ...candidate, countryId: 'fr', countryCode: 'FRA', createdAt: '2026-09-12T12:00:00.123457Z' },
      { ...candidate, countryId: 'previous', createdAt: '2026-09-13T00:00:00Z' },
      { ...candidate, countryId: 'private', visibility: 'private' }];
    // Act
    const ranked = rankWeeklyCandidates(candidates, 'previous');
    // Assert
    expect(ranked.map(c => c.countryId)).toEqual(['fr', 'es', 'jp']);
  });

  it('creates through the contest service once, then reuses the same weekly period', async () => {
    // Arrange
    let stored: ContestRecord | null = null;
    const create = jest.fn(async (countryId: string, startsAt: string, endsAt: string) => {
      stored = { id: 'weekly', countryId, startsAt, endsAt, weeklyPeriod: weeklyPeriod(now).key,
        status: 'OPEN', winnerSubmissionId: null, createdAt: now.toISOString() };
      return stored;
    });
    const context = (): WeeklySelectionContext => ({ existing: stored, active: null, previous: null,
      candidates: async () => [candidate], creation: { eligibleCountry: async () => true, create } });
    const repository = { expired: async () => [], withPeriod: async <T>(period: ReturnType<typeof weeklyPeriod>,
      _now: string, operation: (value: WeeklySelectionContext) => Promise<T>) => {
      expect(period.key).toBe('2026-09-07');
      return operation(context());
    } } as unknown as WeeklyPhotoContestRepository;
    const covers = { readUrl: async () => 'https://photos.test/usable' } as unknown as TripCoversService;
    const clock = { now: () => now };
    const contests = new PhotoContestService({} as never, covers, clock);
    const selection = new WeeklyPhotoContestSelectionService(repository, contests, covers, clock);
    // Act
    const first = await selection.run();
    const second = await selection.run();
    // Assert
    expect(first.outcome).toBe('created');
    expect(second.outcome).toBe('existing');
    expect(second.contest?.id).toBe(first.contest?.id);
    expect(create).toHaveBeenCalledTimes(1);
  });
});
