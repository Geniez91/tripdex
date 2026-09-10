export interface CreateTripInput {
  title: string;
  startDate: string;
  endDate: string | null;
  countryIds: string[];
  cityIds: string[];
  rating: number | null;
  review: string | null;
}

export interface TripFormValues {
  title: string;
  startDate: string;
  endDate: string;
  countryIds: string[];
  cityIds: string[];
  rating: number | null;
  review: string;
}

export interface TripCoverResult {
  coverStoragePath: string | null;
  coverUrl: string | null;
  cleanupPending: boolean;
}
