export interface CreateTripDto {
  title: string;
  startDate: string;
  endDate: string | null;
  countryIds: string[];
  cityIds: string[];
  rating: number | null;
  review: string | null;
  visibility: 'public' | 'private';
}
