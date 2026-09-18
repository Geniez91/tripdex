import { jest } from '@jest/globals';
import { CitiesService } from './cities.service.js';
import type { ICityRepositoryPort } from './types/city-repository.port.js';

describe('CitiesService', () => {
  it('trims the search query before querying and maps city records', async () => {
    // Arrange
    const cities = [
      {
        id: 'tokyo',
        countryId: 'japan',
        name: 'Tokyo',
        slug: 'tokyo',
        latitude: 35.6762,
        longitude: 139.6503,
      },
    ];
    const findAll = jest.fn<ICityRepositoryPort['findAll']>();
    findAll.mockResolvedValue(cities);
    const service = new CitiesService({ findAll });

    // Act
    const result = await service.list('japan', '  tok  ');

    // Assert
    expect(result).toEqual(cities);
    expect(findAll).toHaveBeenCalledWith('japan', 'tok');
  });

  it('passes an absent query as undefined', async () => {
    // Arrange
    const findAll = jest.fn<ICityRepositoryPort['findAll']>();
    findAll.mockResolvedValue([]);
    const service = new CitiesService({ findAll });

    // Act
    const result = await service.list();

    // Assert
    expect(result).toEqual([]);
    expect(findAll).toHaveBeenCalledWith(undefined, undefined);
  });
});
