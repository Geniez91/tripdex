import { Module } from '@nestjs/common';
import { DatabaseModule } from '../prisma/database.module.js';
import { CommunityController } from './community.controller.js';
import { CommunityService } from './community.service.js';
import { CommunityRepository } from './repositories/community.repository.js';
import { CommunityClock } from './community-clock.js';
import { TripsModule } from '../trips/trips.module.js';
import { CommunityActivityService } from './community-activity.service.js';
import { CommunityActivityRepository } from './repositories/community-activity.repository.js';

@Module({
  imports: [DatabaseModule, TripsModule],
  controllers: [CommunityController],
  providers: [
    CommunityService,
    CommunityRepository,
    CommunityClock,
    CommunityActivityService,
    CommunityActivityRepository,
  ],
})
export class CommunityModule {}
