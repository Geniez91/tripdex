import { Module } from '@nestjs/common';
import { DatabaseModule } from '../prisma/database.module.js';
import { CommunityController } from './community.controller.js';
import { CommunityService } from './community.service.js';
import { CommunityRepository } from './repositories/community.repository.js';
import { CommunityClock } from './community-clock.js';

@Module({
  imports: [DatabaseModule],
  controllers: [CommunityController],
  providers: [CommunityService, CommunityRepository, CommunityClock],
})
export class CommunityModule {}
