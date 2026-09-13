import { Injectable } from '@nestjs/common';
import type { CommunityActivityQueryDto } from './dto/community-activity-query.dto.js';
import { CommunityActivityMapper } from './mappers/community-activity.mapper.js';
import { CommunityActivityRepository } from './repositories/community-activity.repository.js';
import { TripCoversService } from '../trips/trip-covers.service.js';
import { PhotoContestRepository } from './photo-contests/photo-contest.repository.js';
import { PhotoContestService, PhotoContestClock } from './photo-contests/photo-contest.service.js';
import { PhotoContestMapper } from './photo-contests/photo-contest.mapper.js';
import type {
  CommunityActivityItemDto,
  CommunityActivityResponseDto,
  PhotoContestActivityItemDto,
} from './dto/community-activity-response.dto.js';


function encodeCursor(cursor: ActivityCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}

interface ActivityCursor {
  createdAt: string;
  id: string;
}

interface ActivityRecord {
  item: CommunityActivityItemDto;
  cursor: ActivityCursor;
}

function activityDateKey(value: string): string {
      // Keep PostgreSQL microseconds in the ordering and cursor, not only JS milliseconds.
  return (
    new Date(value).toISOString().slice(0, 19) +
    (value.match(/\.(\d+)/)?.[1] ?? '').padEnd(6, '0')
  );
}

function compareActivityRecords(
  left: ActivityRecord,
  right: ActivityRecord,
): number {
  const leftKey =
    `${activityDateKey(left.cursor.createdAt)}:${left.cursor.id}`;

  const rightKey =
    `${activityDateKey(right.cursor.createdAt)}:${right.cursor.id}`;

  return leftKey < rightKey ? 1 : leftKey > rightKey ? -1 : 0;
}

@Injectable()
export class CommunityActivityService {
  constructor(
    private readonly activities: CommunityActivityRepository,
    private readonly covers: TripCoversService,
    private readonly contests: PhotoContestRepository,
    private readonly contestService: PhotoContestService,
    private readonly clock: PhotoContestClock,
  ) {}

  private async enrichTripCover(
    record: ReturnType<typeof CommunityActivityMapper.group>[number],
  ): Promise<ActivityRecord> {
    record.item.trip.coverUrl = await this.covers.readUrl(
      record.userId,
      record.item.trip.id,
      record.coverPath,
    );

    return record;
  }

  private async contestActivityRecord(
    contest: Awaited<
      ReturnType<PhotoContestRepository['opened']>
    >[number],
  ): Promise<ActivityRecord> {
    const detail = await this.contestService.detail(contest.id);

    return {
      item: PhotoContestMapper.activity(detail),
      cursor: {
        createdAt: contest.startsAt,
        id: `contest:${contest.id}`,
      },
    };
  }

  private paginate(
    records: ActivityRecord[],
    limit: number,
  ): {
    page: ActivityRecord[];
    hasNextPage: boolean;
  } {
    const hasNextPage = records.length > limit;

    return {
      page: hasNextPage
        ? records.slice(0, limit)
        : records,
      hasNextPage,
    };
  }

  private nextCursor(
    page: ActivityRecord[],
    hasNextPage: boolean,
  ): string | null {
    if (!hasNextPage || page.length === 0) {
      return null;
    }

    return encodeCursor(page[page.length - 1].cursor);
  }

  private async currentOpenContest(
    cursor: CommunityActivityQueryDto['cursor'],
  ): Promise<PhotoContestActivityItemDto | null> {
    if (cursor) {
      return null;
    }

    const current = await this.contests.currentOpen(
      this.clock.now().toISOString(),
    );

    if (!current) {
      return null;
    }

    const detail = await this.contestService.detail(current.id);

    return PhotoContestMapper.activity(detail);
  }

  async list(
    query: CommunityActivityQueryDto,
  ): Promise<CommunityActivityResponseDto> {
    const rows = await this.activities.list(
      query.limit,
      query.cursor,
    );

    const tripRecords = CommunityActivityMapper.group(rows);

    const opened = await this.contests.opened(
      query.limit,
      query.cursor,
      this.clock.now().toISOString(),
    );

    const records: ActivityRecord[] = [];

    for (const record of tripRecords) {
      records.push(await this.enrichTripCover(record));
    }

    for (const contest of opened) {
      records.push(await this.contestActivityRecord(contest));
    }

    records.sort(compareActivityRecords);

    const { page, hasNextPage } = this.paginate(
      records,
      query.limit,
    );

    const openContest = await this.currentOpenContest(
      query.cursor,
    );

    const nextCursor = this.nextCursor(
      page,
      hasNextPage,
    );

    return {
      ...(!query.cursor ? { openContest } : {}),
      activities: page.map(record => record.item),
      nextCursor,
    };
  }
}
