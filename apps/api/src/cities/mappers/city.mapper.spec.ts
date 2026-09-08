import { CityMapper } from './city.mapper.js';

describe('CityMapper', () => {
  it('maps a persistence record to an API DTO', () => {
    // Arrange
    const city = {
      id: 'tokyo',
      countryId: 'japan',
      name: 'Tokyo',
      slug: 'tokyo',
      latitude: 35.6762,
      longitude: 139.6503,
    };

    // Act
    const result = CityMapper.toResponse(city);

    // Assert
    expect(result).toEqual(city);
  });
});
