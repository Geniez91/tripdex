import type { CityRecord, CountryRecord, TripRecord } from './trip-records.js';

export interface TripResponseParts {
  trip: TripRecord;
  countries: CountryRecord[];
  cities?: CityRecord[];
  coverUrl: string | null;
  isRevisit: boolean;
  revisitedCountryIds: string[];
}
