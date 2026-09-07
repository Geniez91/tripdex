import { Controller, Get, Injectable, Module } from '@nestjs/common';
import { DatabaseService } from '../prisma/database.module.js';

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

@Controller('countries')
export class CountriesController {
  constructor(private readonly countries: CountriesService) {}

  @Get()
  list() {
    return this.countries.list();
  }
}

@Module({ controllers: [CountriesController], providers: [CountriesService] })
export class CountriesModule {}
