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

@Controller('community/countries')
export class CommunityController {
  constructor(private readonly community: CommunityService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  statistics(
    @Query(CommunityQueryPipe) query: CommunityQueryDto,
  ): Promise<CommunityStatisticsResponseDto> {
    return this.community.statistics(query.year);
  }
}
