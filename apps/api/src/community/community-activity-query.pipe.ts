import { BadRequestException, Injectable } from '@nestjs/common';
import type { PipeTransform } from '@nestjs/common';
import type {
  ICommunityActivityCursor,
  ICommunityActivityQueryDto,
} from './dto/community-activity-query.dto.js';
import { decodeCommunityActivityCursor } from './community-activity.helpers.js';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 20;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}


@Injectable()
export class CommunityActivityQueryPipe implements PipeTransform<
  unknown,
  ICommunityActivityQueryDto
> {
  transform(value: unknown): ICommunityActivityQueryDto {
    if (!isRecord(value)) {
      return { limit: DEFAULT_LIMIT, cursor: null };
    }
    const input = value;
    const limitValue = input.limit;
    const limit =
      limitValue == null
        ? DEFAULT_LIMIT
        : typeof limitValue === 'string' && /^\d+$/.test(limitValue)
          ? Number(limitValue)
          : NaN;
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
      throw new BadRequestException(
        'limit must be an integer between 1 and 20.',
      );
    }
    const cursor =
      input.cursor == null
        ? null
        : typeof input.cursor === 'string'
          ? decodeCommunityActivityCursor(input.cursor)
          : null;
    if (input.cursor != null && cursor === null) {
      throw new BadRequestException('cursor must be a valid feed cursor.');
    }
    return { limit, cursor };
  }
}
