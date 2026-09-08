import type { CityRecord } from './city-record.js';

export const CITY_REPOSITORY = Symbol('CITY_REPOSITORY');

export interface CityRepositoryPort {
  findAll(countryId?: string, query?: string): Promise<CityRecord[]>;
}
