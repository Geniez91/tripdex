import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../prisma/database.service.js';

@Injectable()
export class CountriesService {
  constructor(private readonly database: DatabaseService) {}

  async list() {
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
