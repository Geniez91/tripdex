import type { ActivityCursor, ActivityRecord } from './types/community-activity.types.js';

export function encodeActivityCursor(cursor: ActivityCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}

export function activityDateKey(value: string): string {
  return (
    new Date(value).toISOString().slice(0, 19) +
    (value.match(/\.(\d+)/)?.[1] ?? '').padEnd(6, '0')
  );
}

export function compareActivityRecords(
  left: ActivityRecord,
  right: ActivityRecord,
): number {
  const leftKey = `${activityDateKey(left.cursor.createdAt)}:${left.cursor.id}`;
  const rightKey = `${activityDateKey(right.cursor.createdAt)}:${right.cursor.id}`;
  return leftKey < rightKey ? 1 : leftKey > rightKey ? -1 : 0;
}
