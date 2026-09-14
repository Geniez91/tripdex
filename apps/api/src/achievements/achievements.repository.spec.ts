import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { DatabaseService } from '../prisma/database.service.js';
import { ProgressionRepository } from '../trips/progression/progression.repository.js';
import { AchievementsRepository } from './achievements.repository.js';

describe('AchievementsRepository', () => {
  it('reads vote and historical winner counts together for one owner', async () => {
    const values: unknown[] = [];
    const query = jest.fn(async function* () {
      yield { voteCount: 1, winCount: 2 };
    });
    const sql = (strings: TemplateStringsArray, ...parameters: unknown[]) => {
      values.push(...parameters);
      expect(strings.join('')).toContain('public."photoContestVote"');
      expect(strings.join('')).toContain('contest."winnerSubmissionId"');
      expect(strings.join('')).toContain("contest.status = 'CLOSED'");
      return { returnsRow: () => ({ build: () => 'community-counts' }) };
    };
    const module = await Test.createTestingModule({
      providers: [
        AchievementsRepository,
        { provide: ProgressionRepository, useValue: { snapshot: jest.fn() } },
        {
          provide: DatabaseService,
          useValue: { client: { raw: { sql }, runtime: () => ({ query }) } },
        },
      ],
    }).compile();
    const repository = module.get(AchievementsRepository);

    await expect(repository.communityCounts('traveler')).resolves.toEqual({ voteCount: 1, winCount: 2 });
    expect(values).toEqual(['traveler', 'traveler']);
    expect(query).toHaveBeenCalledWith('community-counts');
  });
});
