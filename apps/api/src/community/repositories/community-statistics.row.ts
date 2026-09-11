/** Decoded SQL projection, including nullable columns from the origin LEFT JOIN. */
export interface CommunityStatisticsRow {
  id: string;
  iso2: string;
  iso3: string;
  name: string;
  travelers: number;
  travelersNow: number;
  originId: string | null;
  originIso2: string | null;
  originIso3: string | null;
  originName: string | null;
  originTravelers: number | null;
}
