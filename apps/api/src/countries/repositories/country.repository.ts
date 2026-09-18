import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../prisma/database.service.js';
import type { ICountryRecord } from '../types/country-record.js';
import type { ICountryRepositoryPort } from '../types/country-repository.port.js';

@Injectable()
export class CountryRepository implements ICountryRepositoryPort {
  constructor(private readonly database: DatabaseService) {}

  async findAll(): Promise<ICountryRecord[]> {
    return await this.database.client.orm.public.Country.select(
      'id',
      'iso2',
      'iso3',
      'name',
      'slug',
      'continentCode',
    )
      .orderBy((country) => country.name.asc())
      .all();
  }
}
