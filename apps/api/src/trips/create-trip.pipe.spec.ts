import { BadRequestException } from '@nestjs/common';
import { CreateTripPipe } from './create-trip.pipe.js';

describe('CreateTripPipe', () => {
  const pipe = new CreateTripPipe();
  const valid = {
    title: ' Japan 2026 ',
    startDate: '2026-04-01',
    countryIds: ['japan'],
  };

  it('normalizes a calendar date to UTC and trims the title', () => {
    expect(pipe.transform(valid)).toEqual({
      title: 'Japan 2026',
      startDate: '2026-04-01T00:00:00.000Z',
      endDate: null,
      countryIds: ['japan'],
    });
  });

  it('accepts a leap day, a same-day trip and multiple countries', () => {
    expect(
      pipe.transform({
        ...valid,
        startDate: '2024-02-29',
        endDate: '2024-02-29',
        countryIds: ['japan', 'france'],
      }).endDate,
    ).toBe('2024-02-29T00:00:00.000Z');
  });

  it.each([
    null,
    [],
    {},
    { ...valid, title: '  ' },
    { ...valid, title: 'a'.repeat(161) },
    { ...valid, startDate: '2026-02-29' },
    { ...valid, startDate: '2026-04-31' },
    { ...valid, startDate: '2026-04-01T00:00:00Z' },
    { ...valid, endDate: '2026-03-31' },
    { ...valid, countryIds: [] },
    { ...valid, countryIds: ['japan', 'japan'] },
    { ...valid, countryIds: [42] },
    { ...valid, countryIds: [''] },
    { ...valid, userId: 'another-user' },
  ])('rejects invalid or untrusted input %#', (input) => {
    expect(() => pipe.transform(input)).toThrow(BadRequestException);
  });
});
