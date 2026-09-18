import type { ICityRecord, ICountryRecord, ITripRecord } from './trip-records.js';

export interface ITripResponseParts {
  trip: ITripRecord;
  countries: ICountryRecord[];
  cities?: ICityRecord[];
  coverUrl: string | null;
  isRevisit: boolean;
  revisitedCountryIds: string[];
}
