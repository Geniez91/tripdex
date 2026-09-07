import { Module } from '@nestjs/common';
import { CurrentUserModule } from '../current-user/current-user.module.js';
import { TripsController } from './trips.controller.js';
import { VisitedCountriesController } from './visited-countries.controller.js';
import { TripsService } from './trips.service.js';

@Module({
  imports: [CurrentUserModule],
  controllers: [TripsController, VisitedCountriesController],
  providers: [TripsService],
})
export class TripsModule {}
