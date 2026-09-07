export interface TripRecord {
  id: string;
  title: string;
  startDate: string;
  endDate: string | null;
  rating: number | null;
  review: string | null;
  coverStoragePath: string | null;
}

export interface CountryRecord {
  id: string;
  iso2: string;
  iso3: string;
  name: string;
  slug: string;
  continentCode: string;
}

export interface CityRecord {
  id: string;
  countryId: string;
  name: string;
  slug: string;
  latitude: number;
  longitude: number;
}

export interface TripCountryLink {
  countryId: string;
  tripId: string;
}

export interface TripOwnershipRecord {
  id: string;
  userId: string;
  startDate: string;
}
