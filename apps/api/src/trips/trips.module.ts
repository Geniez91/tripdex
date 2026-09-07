import { Module } from '@nestjs/common';
import { CurrentUserModule } from '../current-user/current-user.module.js';
import { TripsController } from './trips.controller.js';
import { VisitedCountriesController } from './visited-countries.controller.js';
import { TripsJournalController } from './trips.journal.controller.js';
import { TripsService } from './trips.service.js';
import { CoverStorageService } from './cover-storage.service.js';
import { TripCoversService } from './trip-covers.service.js';
import { TripCoversController } from './trip-covers.controller.js';

@Module({
  imports: [CurrentUserModule],
  controllers: [
    TripsController,
    VisitedCountriesController,
    TripsJournalController,
    TripCoversController,
  ],
  providers: [TripsService, CoverStorageService, TripCoversService],
})
export class TripsModule {}
