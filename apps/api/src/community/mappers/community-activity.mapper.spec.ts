import { CommunityActivityMapper } from './community-activity.mapper.js';
import type { ICommunityActivityRow } from '../types/community-activity-row.js';

const row: ICommunityActivityRow = {
  tripId: 'own-public', userId: 'current-user', username: 'traveler',
  activityDate: '2026-09-11 18:25:45.818582+00',
  startDate: '2026-09-01 00:00:00+00', endDate: '2026-09-03 00:00:00+00',
  title: 'Japan', avatarUrl: null, rating: null, review: null,
  coverStoragePath: null, countryId: 'jp', countryIso2: 'JP',
  countryIso3: 'JPN', countryName: 'Japan', cityId: null, cityName: null,
};

it('keeps the current owner activity and serializes PostgreSQL dates for display', () => {
  const [record] = CommunityActivityMapper.group([row]);
  expect(record.userId).toBe('current-user');
  expect(record.item.type).toBe('TRIP_LOGGED');
  expect(record.item.activityDate).toBe('2026-09-11T18:25:45.818Z');
  expect(record.item.trip.startDate).toBe('2026-09-01T00:00:00.000Z');
  expect(record.item.trip.endDate).toBe('2026-09-03T00:00:00.000Z');
  expect(record.item.trip.durationDays).toBe(3);
  expect(record.cursor.createdAt).toBe(row.activityDate);
});

it('retains an open-ended trip', () => {
  const [record] = CommunityActivityMapper.group([{ ...row, endDate: null }]);
  expect(record.item.trip.endDate).toBeNull();
  expect(record.item.trip.durationDays).toBeNull();
});
