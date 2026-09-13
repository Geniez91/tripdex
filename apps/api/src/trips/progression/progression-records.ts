import type { CountryRecord } from '../types/trip-records.js';

export interface ProgressionTripCountryRow {
  tripId: string;
  startDate: string;
  endDate: string | null;
  countryId: string | null;
  arrivalDate: string | null;
}

export interface ProgressionSnapshot {
  countries: CountryRecord[];
  tripCountries: ProgressionTripCountryRow[];
}
