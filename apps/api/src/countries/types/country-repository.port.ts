import type { ICountryRecord } from './country-record.js';

export const COUNTRY_REPOSITORY = Symbol('COUNTRY_REPOSITORY');

export interface ICountryRepositoryPort {
  findAll(): Promise<ICountryRecord[]>;
}
