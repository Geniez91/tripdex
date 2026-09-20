import { BadRequestException } from '@nestjs/common';
import type { ICommunityActivityCursor } from './dto/community-activity-query.dto.js';
import type { IActivityCursor, IActivityRecord } from './types/community-activity.types.js';

export function encodeActivityCursor(cursor: IActivityCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}

export function decodeCommunityActivityCursor(
  value: string,
): ICommunityActivityCursor {
  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
  } catch {
    throw new BadRequestException('cursor must be a valid feed cursor.');
  }
  if (!isRecord(decoded) || typeof decoded.createdAt !== 'string' || typeof decoded.id !== 'string' || !decoded.id) {
    throw new BadRequestException('cursor must be a valid feed cursor.');
  }
  const cursor: ICommunityActivityCursor = {
    createdAt: decoded.createdAt,
    id: decoded.id.includes(':') ? decoded.id : `trip:${decoded.id}`,
  };
  if (!Number.isFinite(Date.parse(cursor.createdAt)) || !cursor.id)
    throw new BadRequestException('cursor must be a valid feed cursor.');
  return cursor;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function activityDateKey(value: string): string {
  return (
    new Date(value).toISOString().slice(0, 19) +
    (value.match(/\.(\d+)/)?.[1] ?? '').padEnd(6, '0')
  );
}

export function compareActivityRecords(
  left: IActivityRecord,
  right: IActivityRecord,
): number {
  const leftKey = `${activityDateKey(left.cursor.createdAt)}:${left.cursor.id}`;
  const rightKey = `${activityDateKey(right.cursor.createdAt)}:${right.cursor.id}`;
  return leftKey < rightKey ? 1 : leftKey > rightKey ? -1 : 0;
}
