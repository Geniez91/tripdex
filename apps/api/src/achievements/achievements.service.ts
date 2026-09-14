import { Injectable } from '@nestjs/common';
import { calculateProgression } from '../trips/progression/progression-calculations.js';
import type { ProgressionSnapshot } from '../trips/progression/progression-records.js';
import { calculateAchievements, type AchievementFacts } from './achievement-calculations.js';
import { achievementDefinitions } from './achievement-definitions.js';
import type { AchievementsResponseDto } from './dto/achievement-response.dto.js';
import { AchievementsRepository, type CommunityAchievementCounts } from './achievements.repository.js';

function factsFrom(snapshot: ProgressionSnapshot, community: CommunityAchievementCounts): AchievementFacts {
  const progression = calculateProgression(snapshot, new Date().getUTCFullYear());
  return {
    tripCount: new Set(snapshot.tripCountries.map((row) => row.tripId)).size,
    visitedCountryCount: progression.summary.visitedCountries,
    exploredContinentCodes: new Set(
      progression.continents
        .filter((continent) => continent.visitedCountries > 0)
        .map((continent) => continent.continentCode),
    ),
    totalRevisits: progression.summary.totalRevisits,
    maxTripsInSameCountry: Math.max(
      progression.summary.visitedCountries > 0 ? 1 : 0,
      ...progression.revisits.map((revisit) => revisit.tripCount),
    ),
    totalTravelDays: progression.summary.totalTravelDays,
    communityVoteCount: community.voteCount,
    communityWinCount: community.winCount,
  };
}

@Injectable()
export class AchievementsService {
  constructor(private readonly achievements: AchievementsRepository) {}

  async forUser(userId: string): Promise<AchievementsResponseDto> {
    const [snapshot, community] = await Promise.all([
      this.achievements.snapshot(userId),
      this.achievements.communityCounts(userId),
    ]);
    return { achievements: calculateAchievements(achievementDefinitions, factsFrom(snapshot, community)) };
  }
}
