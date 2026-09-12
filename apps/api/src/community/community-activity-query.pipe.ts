import { BadRequestException, Injectable } from '@nestjs/common';
import type { PipeTransform } from '@nestjs/common';
import type {
  CommunityActivityCursor,
  CommunityActivityQueryDto,
} from './dto/community-activity-query.dto.js';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 20;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function decodeCursor(value: string): CommunityActivityCursor {
  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
  } catch {
    throw new BadRequestException('cursor must be a valid feed cursor.');
  }
  if (
    !isRecord(decoded) ||
    typeof decoded.createdAt !== 'string' ||
    typeof decoded.id !== 'string'
  ) {
    throw new BadRequestException('cursor must be a valid feed cursor.');
  }
  const cursor: CommunityActivityCursor = {
    createdAt: decoded.createdAt,
    id: decoded.id,
  };
  if (!Number.isFinite(Date.parse(cursor.createdAt)) || !cursor.id) {
    throw new BadRequestException('cursor must be a valid feed cursor.');
  }
  return cursor;
}

@Injectable()
export class CommunityActivityQueryPipe implements PipeTransform<
  unknown,
  CommunityActivityQueryDto
> {
  transform(value: unknown): CommunityActivityQueryDto {
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
          ? decodeCursor(input.cursor)
          : null;
    if (input.cursor != null && cursor === null) {
      throw new BadRequestException('cursor must be a valid feed cursor.');
    }
    return { limit, cursor };
  }
}
