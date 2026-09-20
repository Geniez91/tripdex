import { activityDateKey, compareActivityRecords } from './community-activity.helpers.js';
import type { IActivityRecord } from './types/community-activity.types.js';

describe('Community activity ordering helpers', () => {
  it('preserves PostgreSQL microseconds and breaks equal timestamps by ID', () => {
    expect(activityDateKey('2026-01-01T00:00:00.000001Z')).toBe(
      '2026-01-01T00:00:00000001',
    );
    const record = (id: string, createdAt: string) => ({
      item: {} as IActivityRecord['item'], cursor: { id, createdAt },
    });
    expect(compareActivityRecords(record('b', '2026-01-01T00:00:00.000001Z'), record('a', '2026-01-01T00:00:00.000001Z'))).toBe(-1);
    expect(compareActivityRecords(record('a', '2026-01-01T00:00:00.000002Z'), record('z', '2026-01-01T00:00:00.000001Z'))).toBe(-1);
  });
});
