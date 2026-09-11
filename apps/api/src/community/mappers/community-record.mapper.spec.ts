import { CommunityRecordMapper } from './community-record.mapper.js';
import { mapCommunityStatistics } from './community.mapper.js';
import type { CommunityStatisticsRow } from '../repositories/community-statistics.row.js';

const rowWithOrigin: CommunityStatisticsRow = {
  id: 'jp',
  iso2: 'JP',
  iso3: 'JPN',
  name: 'Japan',
  travelers: 12,
  travelersNow: 3,
  originId: 'fr',
  originIso2: 'FR',
  originIso3: 'FRA',
  originName: 'France',
  originTravelers: 7,
};

describe('CommunityRecordMapper', () => {
  it('preserves country, origin and distinct annual/current counts', () => {
    // Arrange
    const row = Object.freeze({ ...rowWithOrigin });
    // Act
    const record = CommunityRecordMapper.fromPersistence(row);
    // Assert
    expect(record).toEqual(rowWithOrigin);
    expect(record.travelers).toBe(12);
    expect(record.travelersNow).toBe(3);
  });
  it('preserves an absent origin and zero counts', () => {
    // Arrange
    const row: CommunityStatisticsRow = {
      ...rowWithOrigin,
      travelers: 0,
      travelersNow: 0,
      originId: null,
      originIso2: null,
      originIso3: null,
      originName: null,
      originTravelers: null,
    };
    // Act
    const record = CommunityRecordMapper.fromPersistence(row);
    // Assert
    expect(record).toEqual(row);
  });
  it.each([
    'originId',
    'originIso2',
    'originIso3',
    'originName',
    'originTravelers',
  ] as const)('preserves independent nullability of %s', (field) => {
    // Arrange
    const row: CommunityStatisticsRow = { ...rowWithOrigin, [field]: null };
    // Act
    const record = CommunityRecordMapper.fromPersistence(row);
    // Assert
    expect(record).toEqual(row);
    expect(record[field]).toBeNull();
  });
  it('keeps response grouping, origin order and totals unchanged across the new boundary', () => {
    // Arrange
    const rows: CommunityStatisticsRow[] = [
      rowWithOrigin,
      {
        ...rowWithOrigin,
        originId: 'ca',
        originIso2: 'CA',
        originIso3: 'CAN',
        originName: 'Canada',
        originTravelers: 5,
      },
    ];
    // Act
    const result = mapCommunityStatistics(
      rows.map((row) => CommunityRecordMapper.fromPersistence(row)),
      10,
    );
    // Assert
    expect(result).toEqual([
      {
        country: { id: 'jp', iso2: 'JP', iso3: 'JPN', name: 'Japan' },
        travelers: 12,
        travelersNow: 3,
        trending: true,
        topOrigins: [
          {
            country: { id: 'fr', iso2: 'FR', iso3: 'FRA', name: 'France' },
            travelers: 7,
          },
          {
            country: { id: 'ca', iso2: 'CA', iso3: 'CAN', name: 'Canada' },
            travelers: 5,
          },
        ],
      },
    ]);
  });
});
