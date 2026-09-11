import type { CommunityStatisticsRow } from '../repositories/community-statistics.row.js';
import type { CommunityRecord } from '../types/community-record.js';

export class CommunityRecordMapper {
  static fromPersistence(row: CommunityStatisticsRow): CommunityRecord {
    return {
      id: row.id,
      iso2: row.iso2,
      iso3: row.iso3,
      name: row.name,
      travelers: row.travelers,
      travelersNow: row.travelersNow,
      originId: row.originId,
      originIso2: row.originIso2,
      originIso3: row.originIso3,
      originName: row.originName,
      originTravelers: row.originTravelers,
    };
  }
}
