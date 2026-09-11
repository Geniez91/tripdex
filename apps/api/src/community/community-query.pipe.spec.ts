import { BadRequestException } from '@nestjs/common';
import { CommunityQueryPipe } from './community-query.pipe.js';
import { ResidencePipe } from '../users/residence.pipe.js';

describe('Community and residence validation', () => {
  const query = new CommunityQueryPipe();
  it.each(['0001', '2026', '9998'])('accepts calendar year %s', (year) => {
    expect(query.transform({ year })).toEqual({ year: Number(year) });
  });
  it.each([
    null,
    {},
    { year: '0000' },
    { year: '9999' },
    { year: 2026 },
    { year: ['2026', '2027'] },
    { year: '2026 OR 1=1' },
    { year: '2026', userId: 'other' },
  ])('rejects invalid queries %j', (value) => {
    expect(() => query.transform(value)).toThrow(BadRequestException);
  });
  const residence = new ResidencePipe();
  it('accepts a country ID or explicit clearing', () => {
    expect(residence.transform({ residenceCountryId: 'country-id' })).toEqual({
      residenceCountryId: 'country-id',
    });
    expect(residence.transform({ residenceCountryId: null })).toEqual({
      residenceCountryId: null,
    });
  });
  it.each([
    null,
    {},
    { residenceCountryId: '' },
    { residenceCountryId: ' id ' },
    { residenceCountryId: 42 },
    { residenceCountryId: null, userId: 'other' },
  ])('rejects invalid residence writes %j', (value) => {
    expect(() => residence.transform(value)).toThrow(BadRequestException);
  });
});
