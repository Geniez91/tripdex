import { Injectable } from '@nestjs/common';
import type { CommunityActivityQueryDto } from './dto/community-activity-query.dto.js';
import type { CommunityActivityResponseDto } from './dto/community-activity-response.dto.js';
import { CommunityActivityMapper } from './mappers/community-activity.mapper.js';
import { CommunityActivityRepository } from './repositories/community-activity.repository.js';
import { TripCoversService } from '../trips/trip-covers.service.js';

function encodeCursor(cursor: { createdAt: string; id: string }): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}

@Injectable()
export class CommunityActivityService {
  constructor(
    private readonly activities: CommunityActivityRepository,
    private readonly covers: TripCoversService,
  ) {}

  async list(
    query: CommunityActivityQueryDto,
  ): Promise<CommunityActivityResponseDto> {
    const rows = await this.activities.list(query.limit, query.cursor);
    const records = CommunityActivityMapper.group(rows);
    const hasNextPage = records.length > query.limit;
    const page = hasNextPage ? records.slice(0, query.limit) : records;
    for (const record of page) {
      record.item.trip.coverUrl = await this.covers.readUrl(
        record.userId,
        record.item.trip.id,
        record.coverPath,
      );
    }
    return {
      activities: page.map((record) => record.item),
      nextCursor:
        hasNextPage && page.length
          ? encodeCursor(page[page.length - 1].cursor)
          : null,
    };
  }
}
