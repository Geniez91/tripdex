export interface ICountryResponseDto {
  id: string;
  iso2: string;
  iso3: string;
  name: string;
  slug: string;
  continentCode: string;
}

export interface ICityResponseDto {
  id: string;
  countryId: string;
  name: string;
  slug: string;
  latitude: number;
  longitude: number;
}

export interface ITripCountryResponseDto {
  country: ICountryResponseDto;
  position: number;
  isRevisit: boolean;
}

export interface ITripResponseDto {
  id: string;
  title: string;
  startDate: string;
  endDate: string | null;
  rating: number | null;
  review: string | null;
  coverStoragePath: string | null;
  coverUrl: string | null;
  visibility: 'public' | 'private';
  countries: ITripCountryResponseDto[];
  cities?: ICityResponseDto[];
  containsRevisit: boolean;
}
