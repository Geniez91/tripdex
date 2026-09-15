import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './prisma/database.module.js';
import { CountriesModule } from './countries/countries.module.js';
import { TripsModule } from './trips/trips.module.js';
import { CitiesModule } from './cities/cities.module.js';
import { CommunityModule } from './community/community.module.js';
import { AchievementsModule } from './achievements/achievements.module.js';
import { GlobalExceptionFilter } from './global-exception.filter.js';
import { HttpRequestTimingInterceptor } from './http-request-timing.interceptor.js';

@Module({
  imports: [
    DatabaseModule,
    CountriesModule,
    TripsModule,
    CitiesModule,
    CommunityModule,
    AchievementsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpRequestTimingInterceptor,
    },
  ],
})
export class AppModule {}
