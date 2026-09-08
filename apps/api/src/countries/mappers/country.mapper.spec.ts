import { CountryMapper } from './country.mapper.js';

describe('CountryMapper', () => {
  it('maps a persistence record to an API DTO', () => {
    // Arrange
    const country = {
      id: 'japan',
      iso2: 'JP',
      iso3: 'JPN',
      name: 'Japan',
      slug: 'japan',
      continentCode: 'AS',
    };

    // Act
    const result = CountryMapper.toResponse(country);

    // Assert
    expect(result).toEqual(country);
  });
});
