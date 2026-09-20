import { BadRequestException, NotFoundException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import type { ICountryRecord } from '../countries/types/country-record.js';
import { ResidenceRepository } from './repositories/residence.repository.js';
import { ResidenceService } from './residence.service.js';

const country: ICountryRecord = {
  id: 'country',
  iso2: 'FR',
  iso3: 'FRA',
  name: 'France',
  slug: 'france',
  continentCode: 'EU',
};

describe('ResidenceService error ownership', () => {
  const findUser = jest.fn<ResidenceRepository['findUser']>();
  const findCountry = jest.fn<ResidenceRepository['findCountry']>();
  const update = jest.fn<ResidenceRepository['update']>();
  const repository = {
    findUser,
    findCountry,
    update,
  } satisfies Pick<ResidenceRepository, 'findUser' | 'findCountry' | 'update'>;
  let service: ResidenceService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [ResidenceService, ResidenceRepository],
    })
      .overrideProvider(ResidenceRepository)
      .useValue(repository)
      .compile();
    service = module.get(ResidenceService);
  });

  beforeEach(() => jest.resetAllMocks());

  it('preserves expected residence 4xx outcomes', async () => {
    findUser.mockResolvedValue(null);
    findCountry.mockResolvedValue(null);

    await expect(service.get('user')).rejects.toThrow(NotFoundException);
    await expect(service.update('user', 'missing-country')).rejects.toThrow(
      BadRequestException,
    );
    update.mockResolvedValue(false);
    await expect(service.update('user', null)).rejects.toThrow(
      NotFoundException,
    );
  });

  it.each([
    ['get', () => findUser.mockRejectedValue(new Error('database failed'))],
    ['update', () => update.mockRejectedValue(new Error('database failed'))],
  ])('propagates unexpected repository errors from %s', async (_, arrange) => {
    arrange();
    if (_ === 'update') findCountry.mockResolvedValue(country);

    await expect(
      _ === 'get' ? service.get('user') : service.update('user', 'country'),
    ).rejects.toThrow('database failed');
  });
});
