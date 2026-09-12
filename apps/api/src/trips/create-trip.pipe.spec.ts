import { BadRequestException } from '@nestjs/common';
import { CreateTripPipe } from './create-trip.pipe.js';

describe('CreateTripPipe', () => {
  const pipe = new CreateTripPipe();
  const valid = {
    title: ' Japan 2026 ',
    startDate: '2026-04-01',
    countryIds: ['japan'],
  };

  it('normalizes a calendar date to UTC, trims the title and defaults visibility to private', () => {
    // Arrange
    const input = valid;

    // Act
    const result = pipe.transform(input);

    // Assert
    expect(result).toEqual({
      title: 'Japan 2026',
      startDate: '2026-04-01T00:00:00.000Z',
      endDate: null,
      countryIds: ['japan'],
      cityIds: [],
      rating: null,
      review: null,
      visibility: 'private',
    });
  });

  it('preserves an explicit public visibility choice', () => {
    // Arrange
    const input = { ...valid, visibility: 'public' };

    // Act
    const result = pipe.transform(input);

    // Assert
    expect(result.visibility).toBe('public');
  });

  it('accepts a leap day, a same-day trip and multiple countries', () => {
    // Arrange
    const input = {
      ...valid,
      startDate: '2024-02-29',
      endDate: '2024-02-29',
      countryIds: ['japan', 'france'],
    };

    // Act
    const result = pipe.transform(input);

    // Assert
    expect(result.endDate).toBe('2024-02-29T00:00:00.000Z');
  });

  it('rejects client storage paths and external URLs', () => {
    // Arrange
    const inputs = [
      { ...valid, coverStoragePath: 'users/u/trips/t/cover.webp' },
      { ...valid, coverStoragePath: 'https://example.com/cover.jpg' },
    ];

    // Act
    const transformations = inputs.map((input) => () => pipe.transform(input));

    // Assert
    for (const transform of transformations) {
      expect(transform).toThrow(BadRequestException);
    }
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
    // Arrange
    const transform = () => pipe.transform(input);

    // Act
    const action = transform;

    // Assert
    expect(action).toThrow(BadRequestException);
  });
});
