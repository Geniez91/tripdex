import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../prisma/database.service.js';
import type { CountryRecord } from '../types/country-record.js';
import type { CountryRepositoryPort } from '../types/country-repository.port.js';

@Injectable()
export class CountryRepository implements CountryRepositoryPort {
  constructor(private readonly database: DatabaseService) {}

  async findAll(): Promise<CountryRecord[]> {
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
