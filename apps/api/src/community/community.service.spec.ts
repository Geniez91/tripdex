import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { CommunityClock } from './community-clock.js';
import { COMMUNITY_TOP_ORIGINS_LIMIT } from './community.rules.js';
import { CommunityRepository } from './repositories/community.repository.js';
import { CommunityService } from './community.service.js';

describe('CommunityService statistics error ownership', () => {
  const statistics = jest.fn<CommunityRepository['statistics']>();
  const today = jest.fn<CommunityClock['today']>();
  const repository = { statistics } satisfies Pick<CommunityRepository, 'statistics'>;
  const clock = { today } satisfies Pick<CommunityClock, 'today'>;
  let service: CommunityService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [CommunityService, CommunityRepository, CommunityClock],
    })
      .overrideProvider(CommunityRepository)
      .useValue(repository)
      .overrideProvider(CommunityClock)
      .useValue(clock)
      .compile();
    service = module.get(CommunityService);
  });

  beforeEach(() => {
    jest.resetAllMocks();
    today.mockReturnValue('2026-09-16');
  });

  it('returns mapped statistics with the requested period', async () => {
    statistics.mockResolvedValue([]);

    await expect(service.statistics(2026)).resolves.toEqual({
      year: 2026,
      asOfDate: '2026-09-16',
      countries: [],
    });
    expect(statistics).toHaveBeenCalledWith(
      {
        start: '2026-01-01T00:00:00.000Z',
        next: '2027-01-01T00:00:00.000Z',
        today: '2026-09-16T00:00:00.000Z',
      },
      COMMUNITY_TOP_ORIGINS_LIMIT,
    );
  });

  it('propagates an unexpected repository error unchanged', async () => {
    const failure = new Error('query failed');
    statistics.mockRejectedValue(failure);

    await expect(service.statistics(2026)).rejects.toBe(failure);
  });
});
