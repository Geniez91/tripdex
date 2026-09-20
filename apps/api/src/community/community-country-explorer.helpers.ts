import type {
  TCommunityCountryExplorerRecentTripRecord,
  ICommunityCountryExplorerRecord,
} from './types/community-country-explorer-record.js';

export function isCommunityCountryExplorerRecentTripRecord(
  row: ICommunityCountryExplorerRecord,
): row is TCommunityCountryExplorerRecentTripRecord {
  return Boolean(
    row.tripId && row.tripTitle && row.tripCreatedAt && row.tripStartDate &&
    row.username && row.tripUserId,
  );
}
