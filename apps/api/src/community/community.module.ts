import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PhotoContestController } from './photo-contests/photo-contest.controller.js';
import { PhotoContestService, PhotoContestClock } from './photo-contests/photo-contest.service.js';
import { PhotoContestRepository } from './photo-contests/photo-contest.repository.js';
import { DatabaseModule } from '../prisma/database.module.js';
import { CommunityController } from './community.controller.js';
import { CommunityService } from './community.service.js';
import { CommunityRepository } from './repositories/community.repository.js';
import { CommunityClock } from './community-clock.js';
import { TripsModule } from '../trips/trips.module.js';
import { CommunityActivityService } from './community-activity.service.js';
import { CommunityActivityRepository } from './repositories/community-activity.repository.js';
import { WeeklyPhotoContestRepository } from './photo-contests/weekly-photo-contest.repository.js';
import { WeeklyPhotoContestSelectionService } from './photo-contests/photo-contest-selection.service.js';
import { WeeklyPhotoContestScheduler } from './photo-contests/weekly-photo-contest.scheduler.js';

@Module({
  imports: [DatabaseModule, TripsModule, AuthModule],
  controllers: [CommunityController, PhotoContestController],
  providers: [
    CommunityService,
    CommunityRepository,
    CommunityClock,
    CommunityActivityService,
    CommunityActivityRepository,
    PhotoContestRepository,
    PhotoContestService,
    PhotoContestClock,
    WeeklyPhotoContestRepository,
    WeeklyPhotoContestSelectionService,
    WeeklyPhotoContestScheduler,
  ],
})
export class CommunityModule {}
