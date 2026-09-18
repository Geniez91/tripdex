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

  it('maps the fixed community aggregate without per-achievement queries', async () => {
    const aggregate = {
      eligibleUserCount: 2, premierVoyage: 2, premierPas: 2, globeTrotter: 1, grandExplorateur: 0,
      premiersPasEurope: 1, premiersPasAfrique: 0, premiersPasAsie: 1, premiersPasAmeriqueNord: 0,
      premiersPasAmeriqueSud: 0, premiersPasOceanie: 0, premiersPasAntarctique: 0,
      nouveauContinent: 1, troisHorizons: 0, dejaVu: 1, cantStayAway: 1,
      trenteJoursAilleurs: 1, centJoursSurLaRoute: 0, laVoixDuVoyageur: 1, photographeTripdex: 1,
    };
    const query = jest.fn(async function* () { yield aggregate; });
    const sql = (strings: TemplateStringsArray) => {
      const statement = strings.join('');
      expect(statement).toContain('WITH trip_facts AS');
      expect(statement).toContain('COUNT(*) AS "tripCount"');
      expect(statement).toContain('FROM country_trips');
      expect(statement).toContain('previousEndDay');
      expect(statement).toContain('public."photoContestVote"');
      expect(statement).toContain('contest."winnerSubmissionId"');
      return { returnsRow: () => ({ build: () => 'community-stats' }) };
    };
    const module = await Test.createTestingModule({
      providers: [
        AchievementsRepository,
        { provide: ProgressionRepository, useValue: { snapshot: jest.fn() } },
        { provide: DatabaseService, useValue: { client: { raw: { sql }, runtime: () => ({ query }) } } },
      ],
    }).compile();

    const result = await module.get(AchievementsRepository).communityStats();

    expect(result.eligibleUserCount).toBe(2);
    expect(result.holderCounts).toMatchObject({
      PREMIER_VOYAGE: 2, GLOBE_TROTTER: 1, PREMIERS_PAS_ASIE: 1,
      DEJA_VU: 1, CANT_STAY_AWAY: 1, TRENTE_JOURS_AILLEURS: 1,
      LA_VOIX_DU_VOYAGEUR: 1, PHOTOGRAPHE_TRIPDEX: 1,
    });
    expect(Object.keys(result.holderCounts)).toHaveLength(19);
    expect(query).toHaveBeenCalledTimes(1);
  });
});
