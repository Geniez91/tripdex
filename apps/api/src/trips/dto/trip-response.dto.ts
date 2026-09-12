export interface CountryResponseDto {
  id: string;
  iso2: string;
  iso3: string;
  name: string;
  slug: string;
  continentCode: string;
}

export interface CityResponseDto {
  id: string;
  countryId: string;
  name: string;
  slug: string;
  latitude: number;
  longitude: number;
}

export interface TripResponseDto {
  id: string;
  title: string;
  startDate: string;
  endDate: string | null;
  rating: number | null;
  review: string | null;
  coverStoragePath: string | null;
  coverUrl: string | null;
  visibility: 'public' | 'private';
  countries: CountryResponseDto[];
  cities?: CityResponseDto[];
  isRevisit: boolean;
  revisitedCountryIds: string[];
}
