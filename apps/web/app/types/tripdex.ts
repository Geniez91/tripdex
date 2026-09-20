export interface Country {
  id: string;
  iso2: string;
  iso3: string;
  name: string;
  slug: string;
  continentCode: string;
}

export interface ITripCountry {
  country: Pick<Country, "id" | "iso2" | "iso3" | "name">;
  position: number;
  isRevisit: boolean;
}

export interface CreatedTrip {
  id: string;
  title: string;
  startDate: string;
  endDate: string | null;
  countries: ITripCountry[];
  cities?: City[];
  rating?: number | null;
  review?: string | null;
  coverStoragePath?: string | null;
  coverUrl?: string | null;
  containsRevisit: boolean;
  visibility?: "public" | "private";
}

export interface City {
  id: string;
  countryId: string;
  name: string;
  slug: string;
  latitude?: number;
  longitude?: number;
}

export interface JournalTrip extends CreatedTrip {}
