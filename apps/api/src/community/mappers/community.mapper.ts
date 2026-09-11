import type { CommunityCountryStatisticsDto } from '../dto/community-response.dto.js';
import type { CommunityRecord } from '../types/community-record.js';

export function mapCommunityStatistics(
  rows: readonly CommunityRecord[],
  trendingThreshold: number,
): CommunityCountryStatisticsDto[] {
  const countries = new Map<string, CommunityCountryStatisticsDto>();
  for (const row of rows) {
    let statistics = countries.get(row.id);
    if (!statistics) {
      statistics = {
        country: { id: row.id, iso2: row.iso2, iso3: row.iso3, name: row.name },
        travelers: row.travelers,
        travelersNow: row.travelersNow,
        trending: row.travelers >= trendingThreshold,
        topOrigins: [],
      };
      countries.set(row.id, statistics);
    }
    if (
      row.originId !== null &&
      row.originIso2 !== null &&
      row.originIso3 !== null &&
      row.originName !== null &&
      row.originTravelers !== null
    ) {
      statistics.topOrigins.push({
        country: {
          id: row.originId,
          iso2: row.originIso2,
          iso3: row.originIso3,
          name: row.originName,
        },
        travelers: row.originTravelers,
      });
    }
  }
  return [...countries.values()];
}
