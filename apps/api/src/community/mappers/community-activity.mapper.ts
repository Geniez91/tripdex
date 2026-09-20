import type { ITripActivityItemDto } from '../dto/community-activity-response.dto.js';
import type { ICommunityActivityRow } from '../types/community-activity-row.js';
import type { ICommunityActivityRecord } from '../types/community-activity.types.js';

interface IActivityParts {
  row: ICommunityActivityRow;
  countries: ITripActivityItemDto['trip']['countries'];
  cities: ITripActivityItemDto['trip']['cities'];
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
  static group(rows: ICommunityActivityRow[]): ICommunityActivityRecord[] {
    const grouped = new Map<string, IActivityParts>();
    for (const row of rows) {
      const existing = grouped.get(row.tripId);
      if (existing) {
        this.addRelations(existing, row);
        continue;
      }
      const parts: IActivityParts = { row, countries: [], cities: [] };
      this.addRelations(parts, row);
      grouped.set(row.tripId, parts);
    }
    return [...grouped.values()].map((parts) => this.toRecord(parts));
  }

  private static addRelations(
    parts: IActivityParts,
    row: ICommunityActivityRow,
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

  private static toRecord(parts: IActivityParts): ICommunityActivityRecord {
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
      cursor: { createdAt: row.activityDate, id: `trip:${row.tripId}` },
      coverPath: row.coverStoragePath,
      userId: row.userId,
    };
  }
}
