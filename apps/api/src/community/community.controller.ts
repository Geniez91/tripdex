import {
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { CommunityService } from './community.service.js';
import { CommunityQueryPipe } from './community-query.pipe.js';
import type { CommunityQueryDto } from './dto/community-query.dto.js';
import type { CommunityStatisticsResponseDto } from './dto/community-response.dto.js';

import { CommunityActivityQueryPipe } from './community-activity-query.pipe.js';
import { CommunityActivityService } from './community-activity.service.js';
import type { CommunityActivityQueryDto } from './dto/community-activity-query.dto.js';
import type { CommunityActivityResponseDto } from './dto/community-activity-response.dto.js';
@Controller('community')
export class CommunityController {
  constructor(
    private readonly community: CommunityService,
    private readonly activity: CommunityActivityService,
  ) {}

  @Get('activity')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  activityFeed(
    @Query(CommunityActivityQueryPipe) query: CommunityActivityQueryDto,
  ): Promise<CommunityActivityResponseDto> {
    return this.activity.list(query);
  }

  @Get('countries')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  statistics(
    @Query(CommunityQueryPipe) query: CommunityQueryDto,
  ): Promise<CommunityStatisticsResponseDto> {
    return this.community.statistics(query.year);
  }
}
