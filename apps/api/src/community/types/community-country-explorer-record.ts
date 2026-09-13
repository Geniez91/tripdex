export interface CommunityCountryExplorerRecord {
  countryId: string;
  iso2: string;
  iso3: string;
  name: string;
  travelers: number;
  travelersNow: number;
  averageRating: number | null;
  ratingCount: number;
  tripId: string | null;
  tripTitle: string | null;
  tripCreatedAt: string | null;
  tripStartDate: string | null;
  tripEndDate: string | null;
  tripRating: number | null;
  tripReview: string | null;
  coverStoragePath: string | null;
  username: string | null;
  tripUserId: string | null;
}
