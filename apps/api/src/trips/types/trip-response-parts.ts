import type { ICityRecord, ICountryRecord, ITripRecord } from './trip-records.js';

export interface ITripCountryResponsePart {
  country: ICountryRecord;
  position: number;
  isRevisit: boolean;
}

export interface ITripResponseParts {
  trip: ITripRecord;
  countries: ITripCountryResponsePart[];
  cities?: ICityRecord[];
  coverUrl: string | null;
  containsRevisit: boolean;
}
