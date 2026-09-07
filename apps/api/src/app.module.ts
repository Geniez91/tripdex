import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './prisma/database.module.js';
import { CountriesModule } from './countries/countries.module.js';
import { TripsModule } from './trips/trips.module.js';

@Module({
  imports: [DatabaseModule, CountriesModule, TripsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
