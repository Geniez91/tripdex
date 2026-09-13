import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { TripsController } from './trips.controller.js';
import { VisitedCountriesController } from './visited-countries.controller.js';
import { TripsJournalController } from './trips.journal.controller.js';
import { TripsService } from './trips.service.js';
import { CoverStorageService } from './cover-storage.service.js';
import { TripCoversService } from './trip-covers.service.js';
import { TripCoversController } from './trip-covers.controller.js';
import { TripRepository } from './repositories/trip.repository.js';
import { TripCoversRepository } from './repositories/trip-covers.repository.js';
import { ProgressionController } from './progression/progression.controller.js';
import { ProgressionRepository } from './progression/progression.repository.js';
import { ProgressionService } from './progression/progression.service.js';

@Module({
  imports: [AuthModule],
  controllers: [
    TripsController,
    VisitedCountriesController,
    TripsJournalController,
    TripCoversController,
    ProgressionController,
  ],
  providers: [
    TripsService,
    TripRepository,
    CoverStorageService,
    TripCoversService,
    TripCoversRepository,
    ProgressionRepository,
    ProgressionService,
  ],
  exports: [TripCoversService],
})
export class TripsModule {}
