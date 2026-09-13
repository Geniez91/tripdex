import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { ProgressionRepository } from './progression.repository.js';
import { ProgressionService } from './progression.service.js';

describe('ProgressionService', () => {
  it('scopes progression data to the authenticated user and calculates it', async () => {
    // Arrange
    const snapshot = {
      countries: [
        {
          id: 'fr',
          iso2: 'FR',
          iso3: 'FRA',
          name: 'France',
          slug: 'france',
          continentCode: 'EU',
        },
      ],
      tripCountries: [
        {
          tripId: 'private-trip',
          startDate: '2026-01-01T00:00:00.000Z',
          endDate: null,
          countryId: 'fr',
          arrivalDate: null,
        },
      ],
    };
    const repository = { snapshot: jest.fn().mockResolvedValue(snapshot) };
    const module = await Test.createTestingModule({
      providers: [
        ProgressionService,
        { provide: ProgressionRepository, useValue: repository },
      ],
    }).compile();
    const service = module.get(ProgressionService);

    // Act
    const result = await service.forUser('owner-id');

    // Assert
    expect(repository.snapshot).toHaveBeenCalledWith('owner-id');
    expect(result.summary.visitedCountries).toBe(1);
    expect(result.summary.totalCountries).toBe(1);
    await module.close();
  });
});
