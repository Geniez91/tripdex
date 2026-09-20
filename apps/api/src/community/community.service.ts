import { Injectable } from '@nestjs/common';
import { CommunityRepository } from './repositories/community.repository.js';
import { CommunityClock } from './community-clock.js';
import {
  COMMUNITY_TOP_ORIGINS_LIMIT,
  COMMUNITY_TRENDING_THRESHOLD,
} from './community.rules.js';
import { mapCommunityStatistics } from './mappers/community.mapper.js';
import type { ICommunityStatisticsResponseDto } from './dto/community-response.dto.js';

@Injectable()
export class CommunityService {
  constructor(
    private readonly repository: CommunityRepository,
    private readonly clock: CommunityClock,
  ) {}

  async statistics(year: number): Promise<ICommunityStatisticsResponseDto> {
    const asOfDate = this.clock.today();
    const rows = await this.repository.statistics(
      {
        start: `${String(year).padStart(4, '0')}-01-01T00:00:00.000Z`,
        next: `${String(year + 1).padStart(4, '0')}-01-01T00:00:00.000Z`,
        today: `${asOfDate}T00:00:00.000Z`,
      },
      COMMUNITY_TOP_ORIGINS_LIMIT,
    );
    return {
      year,
      asOfDate,
      countries: mapCommunityStatistics(rows, COMMUNITY_TRENDING_THRESHOLD),
    };
  }
}
