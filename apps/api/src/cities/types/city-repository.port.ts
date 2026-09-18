import type { ICityRecord } from './city-record.js';

export const CITY_REPOSITORY = Symbol('CITY_REPOSITORY');

export interface ICityRepositoryPort {
  findAll(countryId?: string, query?: string): Promise<ICityRecord[]>;
}
