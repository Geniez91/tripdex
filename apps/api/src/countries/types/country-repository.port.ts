import type { CountryRecord } from './country-record.js';

export const COUNTRY_REPOSITORY = Symbol('COUNTRY_REPOSITORY');

export interface CountryRepositoryPort {
  findAll(): Promise<CountryRecord[]>;
}
