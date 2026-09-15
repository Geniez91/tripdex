import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { TripsModule } from '../trips/trips.module.js';
import { AchievementsController } from './achievements.controller.js';
import { AchievementsRepository } from './achievements.repository.js';
import { AchievementsService } from './achievements.service.js';

@Module({
  imports: [AuthModule, TripsModule],
  controllers: [AchievementsController],
  providers: [AchievementsRepository, AchievementsService],
})
export class AchievementsModule {}
