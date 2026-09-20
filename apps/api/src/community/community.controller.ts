import {
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Query,
} from '@nestjs/common';
import { CommunityService } from './community.service.js';
import { CommunityQueryPipe } from './community-query.pipe.js';
import type { ICommunityQueryDto } from './dto/community-query.dto.js';
import type { ICommunityStatisticsResponseDto } from './dto/community-response.dto.js';

import { CommunityActivityQueryPipe } from './community-activity-query.pipe.js';
import { CommunityActivityService } from './community-activity.service.js';
import type { ICommunityActivityQueryDto } from './dto/community-activity-query.dto.js';
import type { ICommunityActivityResponseDto } from './dto/community-activity-response.dto.js';
import { CommunityCountryExplorerService } from './community-country-explorer.service.js';
import type { ICommunityCountryExplorerDto } from './dto/community-country-explorer.dto.js';
@Controller('community')
export class CommunityController {
  constructor(
    private readonly community: CommunityService,
    private readonly activity: CommunityActivityService,
    private readonly countries: CommunityCountryExplorerService,
  ) {}

  @Get('activity')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  activityFeed(
    @Query(CommunityActivityQueryPipe) query: ICommunityActivityQueryDto,
  ): Promise<ICommunityActivityResponseDto> {
    return this.activity.list(query);
  }

  @Get('countries')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  statistics(
    @Query(CommunityQueryPipe) query: ICommunityQueryDto,
  ): Promise<ICommunityStatisticsResponseDto> {
    return this.community.statistics(query.year);
  }

  @Get('countries/:countryCode')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  countryExplorer(
    @Param('countryCode') countryCode: string,
  ): Promise<ICommunityCountryExplorerDto> {
    return this.countries.detail(countryCode);
  }
}
