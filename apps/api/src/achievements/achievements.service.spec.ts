import { AchievementsService } from './achievements.service.js';
import { jest } from '@jest/globals';
import type { AchievementsRepository } from './achievements.repository.js';
import { createAchievementTestSnapshot } from '../../test/achievements.fixtures.js';

describe('AchievementsService', () => {
  it('reports one trip in the same country before a revisit exists', async () => {
    const repository = {
      snapshot: jest.fn(async () => createAchievementTestSnapshot([
        { tripId: 'one', startDate: '2026-01-01T00:00:00.000Z', endDate: null, countryId: 'fr', arrivalDate: null },
      ])),
      communityCounts: jest.fn(async () => ({ voteCount: 0, winCount: 0 })),
      communityStats: jest.fn(async () => ({ eligibleUserCount: 0, holderCounts: {} })),
    } as Pick<AchievementsRepository, 'snapshot' | 'communityCounts'>;
    const result = await new AchievementsService(repository as AchievementsRepository).forUser('traveler');

    expect(result.achievements.find((item) => item.code === 'CANT_STAY_AWAY'))
      .toMatchObject({ current: 1, target: 3, unlocked: false });
  });

  it('reuses M5.1 facts for private multi-country trips and overlapping travel periods', async () => {
    const repository = {
      snapshot: jest.fn(async () => createAchievementTestSnapshot([
        { tripId: 'one', startDate: '2026-01-01T00:00:00.000Z', endDate: '2026-01-20T00:00:00.000Z', countryId: 'fr', arrivalDate: null },
        { tripId: 'one', startDate: '2026-01-01T00:00:00.000Z', endDate: '2026-01-20T00:00:00.000Z', countryId: 'jp', arrivalDate: null },
        { tripId: 'two', startDate: '2026-01-15T00:00:00.000Z', endDate: '2026-02-09T00:00:00.000Z', countryId: 'jp', arrivalDate: null },
      ])),
      communityCounts: jest.fn(async () => ({ voteCount: 1, winCount: 0 })),
      communityStats: jest.fn(async () => ({ eligibleUserCount: 2, holderCounts: { PREMIER_VOYAGE: 2 } })),
    } as Pick<AchievementsRepository, 'snapshot' | 'communityCounts'>;
    const service = new AchievementsService(repository as AchievementsRepository);

    const result = await service.forUser('traveler');
    const byCode = new Map(result.achievements.map((item) => [item.code, item]));

    expect(byCode.get('PREMIER_VOYAGE')).toMatchObject({ current: 2, unlocked: true });
    expect(byCode.get('NOUVEAU_CONTINENT')).toMatchObject({ current: 2, unlocked: true });
    expect(byCode.get('DEJA_VU')).toMatchObject({ current: 1, unlocked: true });
    expect(byCode.get('CANT_STAY_AWAY')).toMatchObject({ current: 2, unlocked: false });
    expect(byCode.get('TRENTE_JOURS_AILLEURS')).toMatchObject({ current: 40, unlocked: true });
    expect(byCode.get('LA_VOIX_DU_VOYAGEUR')).toMatchObject({ current: 1, unlocked: true });
    expect(byCode.get('PHOTOGRAPHE_TRIPDEX')).toMatchObject({ current: 0, unlocked: false });
  });
});
