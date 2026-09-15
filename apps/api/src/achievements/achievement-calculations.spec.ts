import { calculateAchievements } from './achievement-calculations.js';
import { achievementDefinitions } from './achievement-definitions.js';

function facts(overrides: Partial<Parameters<typeof calculateAchievements>[1]> = {}) {
  return {
    tripCount: 0,
    visitedCountryCount: 0,
    exploredContinentCodes: new Set<string>(),
    totalRevisits: 0,
    maxTripsInSameCountry: 0,
    totalTravelDays: 0,
    communityVoteCount: 0,
    communityWinCount: 0,
    ...overrides,
  };
}

function achievement(code: string, input: ReturnType<typeof facts>) {
  return calculateAchievements(achievementDefinitions, input).find((item) => item.code === code)!;
}

describe('calculateAchievements', () => {
  it('returns the complete stable catalogue locked for a traveler without facts', () => {
    const result = calculateAchievements(achievementDefinitions, facts());

    expect(result).toHaveLength(19);
    expect(result.map((item) => item.code)).toEqual(achievementDefinitions.map((item) => item.code));
    expect(result.every((item) => !item.unlocked && item.current === 0)).toBe(true);
  });

  it.each([
    ['PREMIER_VOYAGE', { tripCount: 1 }, 1, true],
    ['PREMIER_PAS', { visitedCountryCount: 1 }, 1, true],
    ['GLOBE_TROTTER', { visitedCountryCount: 10 }, 10, true],
    ['GRAND_EXPLORATEUR', { visitedCountryCount: 25 }, 25, true],
    ['GLOBE_TROTTER', { visitedCountryCount: 9 }, 9, false],
    ['DEJA_VU', { totalRevisits: 2 }, 2, true],
    ['CANT_STAY_AWAY', { maxTripsInSameCountry: 2 }, 2, false],
    ['CANT_STAY_AWAY', { maxTripsInSameCountry: 3 }, 3, true],
    ['TRENTE_JOURS_AILLEURS', { totalTravelDays: 30 }, 30, true],
    ['CENT_JOURS_SUR_LA_ROUTE', { totalTravelDays: 100 }, 100, true],
    ['LA_VOIX_DU_VOYAGEUR', { communityVoteCount: 1 }, 1, true],
    ['PHOTOGRAPHE_TRIPDEX', { communityWinCount: 1 }, 1, true],
  ])('%s uses the proven fact', (code, overrides, current, unlocked) => {
    const result = achievement(code, facts(overrides));

    expect(result.current).toBe(current);
    expect(result.unlocked).toBe(unlocked);
  });

  it.each([
    ['EU', 'PREMIERS_PAS_EUROPE'],
    ['AF', 'PREMIERS_PAS_AFRIQUE'],
    ['AS', 'PREMIERS_PAS_ASIE'],
    ['NA', 'PREMIERS_PAS_AMERIQUE_NORD'],
    ['SA', 'PREMIERS_PAS_AMERIQUE_SUD'],
    ['OC', 'PREMIERS_PAS_OCEANIE'],
    ['AN', 'PREMIERS_PAS_ANTARCTIQUE'],
  ])('unlocks %s only from a visited country in %s', (continent, code) => {
    expect(achievement(code, facts({ exploredContinentCodes: new Set([continent]) }))).toMatchObject({ current: 1, target: 1, unlocked: true });
  });

  it('uses real continent totals for two and three horizons', () => {
    const two = facts({ exploredContinentCodes: new Set(['EU', 'AS']) });
    const three = facts({ exploredContinentCodes: new Set(['EU', 'AS', 'NA']) });

    expect(achievement('NOUVEAU_CONTINENT', two)).toMatchObject({ current: 2, unlocked: true });
    expect(achievement('TROIS_HORIZONS', two)).toMatchObject({ current: 2, unlocked: false });
    expect(achievement('TROIS_HORIZONS', three)).toMatchObject({ current: 3, unlocked: true });
  });
});
