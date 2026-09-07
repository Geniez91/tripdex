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
}
