import { jest } from '@jest/globals';
import { CountriesService } from './countries.service.js';
import type { ICountryRepositoryPort } from './types/country-repository.port.js';

describe('CountriesService', () => {
  it('maps repository records to country response DTOs', async () => {
    // Arrange
    const countries = [
      {
        id: 'japan',
        iso2: 'JP',
        iso3: 'JPN',
        name: 'Japan',
        slug: 'japan',
        continentCode: 'AS',
      },
    ];
    const findAll = jest.fn<ICountryRepositoryPort['findAll']>();
    findAll.mockResolvedValue(countries);
    const service = new CountriesService({ findAll });

    // Act
    const result = await service.list();

    // Assert
    expect(result).toEqual(countries);
    expect(findAll).toHaveBeenCalledTimes(1);
  });
});
