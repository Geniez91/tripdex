export interface ITripRecord {
  id: string;
  title: string;
  startDate: string;
  endDate: string | null;
  rating: number | null;
  review: string | null;
  coverStoragePath: string | null;
  visibility: 'public' | 'private';
}

export interface ICountryRecord {
  id: string;
  iso2: string;
  iso3: string;
  name: string;
  slug: string;
  continentCode: string;
}

export interface ICityRecord {
  id: string;
  countryId: string;
  name: string;
  slug: string;
  latitude: number;
  longitude: number;
}

export interface ITripCountryLink {
  countryId: string;
  tripId: string;
}

export interface ITripOwnershipRecord {
  id: string;
  userId: string;
  startDate: string;
}
