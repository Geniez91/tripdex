import type { CommunityActivityItemDto } from '../dto/community-activity-response.dto.js';
import type { CommunityActivityRow } from '../types/community-activity-row.js';

interface ActivityParts {
  row: CommunityActivityRow;
  countries: CommunityActivityItemDto['trip']['countries'];
  cities: CommunityActivityItemDto['trip']['cities'];
}

export interface CommunityActivityRecord {
  item: CommunityActivityItemDto;
  cursor: { createdAt: string; id: string };
  coverPath: string | null;
  userId: string;
}

function durationDays(
  startDate: string,
  endDate: string | null,
): number | null {
  if (!endDate) return null;
  return (
    Math.round((Date.parse(endDate) - Date.parse(startDate)) / 86_400_000) + 1
  );
}

export class CommunityActivityMapper {
  static group(rows: CommunityActivityRow[]): CommunityActivityRecord[] {
    const grouped = new Map<string, ActivityParts>();
    for (const row of rows) {
      const existing = grouped.get(row.tripId);
      if (existing) {
        this.addRelations(existing, row);
        continue;
      }
      const parts: ActivityParts = { row, countries: [], cities: [] };
      this.addRelations(parts, row);
      grouped.set(row.tripId, parts);
    }
    return [...grouped.values()].map((parts) => this.toRecord(parts));
  }

  private static addRelations(
    parts: ActivityParts,
    row: CommunityActivityRow,
  ): void {
    if (!parts.countries.some((country) => country.id === row.countryId)) {
      parts.countries.push({
        id: row.countryId,
        iso2: row.countryIso2,
        iso3: row.countryIso3,
        name: row.countryName,
      });
    }
    if (
      row.cityId &&
      row.cityName &&
      !parts.cities.some((city) => city.id === row.cityId)
    ) {
      parts.cities.push({ id: row.cityId, name: row.cityName });
    }
  }

  private static toRecord(parts: ActivityParts): CommunityActivityRecord {
    const { row } = parts;
    return {
      item: {
        type: 'TRIP_LOGGED',
        activityDate: new Date(row.activityDate).toISOString(),
        user: { username: row.username, avatarUrl: row.avatarUrl },
        trip: {
          id: row.tripId,
          title: row.title,
          countries: parts.countries,
          cities: parts.cities,
          startDate: new Date(row.startDate).toISOString(),
          endDate: row.endDate ? new Date(row.endDate).toISOString() : null,
          durationDays: durationDays(row.startDate, row.endDate),
          rating: row.rating,
          review: row.review,
          coverUrl: null,
        },
      },
      cursor: { createdAt: row.activityDate, id: row.tripId },
      coverPath: row.coverStoragePath,
      userId: row.userId,
    };
  }
}
