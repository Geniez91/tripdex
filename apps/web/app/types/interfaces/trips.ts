export interface CreateTripInput {
  title: string;
  startDate: string;
  endDate: string | null;
  countryIds: string[];
  cityIds: string[];
  rating: number | null;
  review: string | null;
  visibility: "public" | "private";
}

export interface TripFormValues {
  title: string;
  startDate: string;
  endDate: string;
  countryIds: string[];
  cityIds: string[];
  rating: number | null;
  review: string;
  visibility: "public" | "private";
}

export interface TripCoverResult {
  coverStoragePath: string | null;
  coverUrl: string | null;
  cleanupPending: boolean;
}
