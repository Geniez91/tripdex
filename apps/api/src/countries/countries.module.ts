import { Module } from '@nestjs/common';
import { CountriesController } from './countries.controller.js';
import { CountriesService } from './countries.service.js';
import { CountryRepository } from './repositories/country.repository.js';
import { COUNTRY_REPOSITORY } from './types/country-repository.port.js';

@Module({
  controllers: [CountriesController],
  providers: [
    CountriesService,
    { provide: COUNTRY_REPOSITORY, useClass: CountryRepository },
  ],
})
export class CountriesModule {}
