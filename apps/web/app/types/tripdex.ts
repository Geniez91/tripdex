export interface Country {
  id: string;
  iso2: string;
  iso3: string;
  name: string;
  slug: string;
  continentCode: string;
}

export interface CreatedTrip {
  id: string;
  title: string;
  startDate: string;
  endDate: string | null;
  countries: Pick<Country, "id" | "iso2" | "iso3" | "name">[];
  cities?: City[];
  rating?: number | null;
  review?: string | null;
  coverStoragePath?: string | null;
  coverUrl?: string | null;
  isRevisit?: boolean;
}

export interface City {
  id: string;
  countryId: string;
  name: string;
  slug: string;
  latitude?: number;
  longitude?: number;
}

export interface JournalTrip extends CreatedTrip {
  revisitedCountryIds?: string[];
}
