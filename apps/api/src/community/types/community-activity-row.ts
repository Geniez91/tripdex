export interface CommunityActivityRow {
  tripId: string;
  activityDate: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  title: string;
  startDate: string;
  endDate: string | null;
  rating: number | null;
  review: string | null;
  coverStoragePath: string | null;
  countryId: string;
  countryIso2: string;
  countryIso3: string;
  countryName: string;
  cityId: string | null;
  cityName: string | null;
}
