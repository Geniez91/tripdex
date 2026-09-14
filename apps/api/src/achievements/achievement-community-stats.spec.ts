import {
  achievementPercentage,
  achievementRarity,
  communityStat,
  displayPercentage,
} from './achievement-community-stats.js';
import { withCommunityStats } from './achievement-community-stats.js';

describe('achievement community stats', () => {
  it('returns zero and no rarity when no traveler is eligible', () => {
    expect(communityStat(0, 0)).toEqual({ percentage: 0, rarity: null });
  });

  it.each([
    [0, 100, 0, 'LEGENDARY'],
    [99, 10_000, 0.99, 'LEGENDARY'],
    [1, 100, 1, 'VERY_RARE'],
    [499, 10_000, 4.99, 'VERY_RARE'],
    [5, 100, 5, 'RARE'],
    [1_999, 10_000, 19.99, 'RARE'],
    [20, 100, 20, 'UNCOMMON'],
    [4_999, 10_000, 49.99, 'UNCOMMON'],
    [50, 100, 50, 'COMMON'],
    [100, 100, 100, 'COMMON'],
  ])('classifies %s/%s', (holders, eligible, percentage, rarity) => {
    const raw = achievementPercentage(holders, eligible);
    expect(raw).toBeCloseTo(percentage, 10);
    expect(achievementRarity(raw, eligible)).toBe(rarity);
  });

  it('uses the raw rate for rarity even when display rounding crosses a threshold', () => {
    const raw = achievementPercentage(496, 10_000);

    expect(displayPercentage(raw)).toBe(5);
    expect(achievementRarity(raw, 10_000)).toBe('VERY_RARE');
  });

  it('attaches statistics without changing catalogue order', () => {
    const result = withCommunityStats([
      { code: 'FIRST', name: 'First', description: '', category: 'JOURNAL', unlocked: false, current: 0, target: 1 },
      { code: 'SECOND', name: 'Second', description: '', category: 'JOURNAL', unlocked: true, current: 1, target: 1 },
    ], { FIRST: 0, SECOND: 2 }, 2);

    expect(result.map((item) => item.code)).toEqual(['FIRST', 'SECOND']);
    expect(result.map((item) => item.community)).toEqual([
      { percentage: 0, rarity: 'LEGENDARY' },
      { percentage: 100, rarity: 'COMMON' },
    ]);
  });
});
