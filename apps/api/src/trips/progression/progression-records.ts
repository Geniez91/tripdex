import type { ICountryRecord } from '../types/trip-records.js';

export interface IProgressionTripCountryRow {
  tripId: string;
  startDate: string;
  endDate: string | null;
  countryId: string | null;
  arrivalDate: string | null;
}

export interface IProgressionSnapshot {
  countries: ICountryRecord[];
  tripCountries: IProgressionTripCountryRow[];
}
