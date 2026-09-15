import { BadRequestException, NotFoundException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { ResidenceRepository } from './repositories/residence.repository.js';
import { ResidenceService } from './residence.service.js';

describe('ResidenceService error ownership', () => {
  const findUser = jest.fn<ResidenceRepository['findUser']>();
  const findCountry = jest.fn<ResidenceRepository['findCountry']>();
  const update = jest.fn<ResidenceRepository['update']>();
  const service = new ResidenceService(
    { findUser, findCountry, update } as unknown as ResidenceRepository,
  );

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
    if (_ === 'update') findCountry.mockResolvedValue({} as never);

    await expect(
      _ === 'get' ? service.get('user') : service.update('user', 'country'),
    ).rejects.toThrow('database failed');
  });
});
