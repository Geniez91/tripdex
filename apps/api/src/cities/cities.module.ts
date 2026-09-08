import { Module } from '@nestjs/common';
import { CitiesController } from './cities.controller.js';
import { CitiesService } from './cities.service.js';
import { CityRepository } from './repositories/city.repository.js';
import { CITY_REPOSITORY } from './types/city-repository.port.js';

@Module({
  controllers: [CitiesController],
  providers: [
    CitiesService,
    { provide: CITY_REPOSITORY, useClass: CityRepository },
  ],
})
export class CitiesModule {}
