import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { CountriesService } from '../src/countries/countries.service.js';
import { CurrentUserService } from '../src/current-user/current-user.service.js';
import { TripsService } from '../src/trips/trips.service.js';

describe('Milestone HTTP contract', () => {
  let app: INestApplication<App>;
  const country = {
    id: 'japan',
    iso2: 'JP',
    iso3: 'JPN',
    name: 'Japan',
    slug: 'japan',
    continentCode: 'AS',
  };
  const userId = jest.fn<() => Promise<string>>();
  const create = jest.fn<TripsService['create']>();
  const visited = jest.fn<TripsService['visitedCountries']>();
  const payload = {
    title: 'Japan 2026',
    startDate: '2026-04-01',
    countryIds: ['japan'],
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(CurrentUserService)
      .useValue({ getUserId: userId })
      .overrideProvider(CountriesService)
      .useValue({ list: () => [country] })
      .overrideProvider(TripsService)
      .useValue({ create, visitedCountries: visited })
      .compile();
    app = module.createNestApplication();
    await app.init();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    userId.mockResolvedValue('current-user');
    visited.mockResolvedValue([country]);
    create.mockResolvedValue({
      id: 'new-trip',
      title: 'Japan 2026',
      startDate: '2026-04-01T00:00:00.000Z',
      endDate: null,
      countries: [country],
    });
  });
  afterAll(async () => {
    await app.close();
  });

  it('serves country IDs and ISO3 codes', async () => {
    await request(app.getHttpServer())
      .get('/countries')
      .expect(200)
      .expect([country]);
  });
  it('creates with the server identity and normalized dates', async () => {
    await request(app.getHttpServer()).post('/trips').send(payload).expect(201);
    expect(create).toHaveBeenCalledWith('current-user', {
      ...payload,
      startDate: '2026-04-01T00:00:00.000Z',
      endDate: null,
    });
  });
  it.each([
    { ...payload, countryIds: [] },
    { ...payload, startDate: '2026-02-30' },
    { ...payload, userId: 'attacker-selected-user' },
  ])('rejects invalid requests before writes %#', async (body) => {
    await request(app.getHttpServer()).post('/trips').send(body).expect(400);
    expect(create).not.toHaveBeenCalled();
  });
  it('scopes visited countries to the current user', async () => {
    await request(app.getHttpServer())
      .get('/me/visited-countries')
      .expect(200)
      .expect([country]);
    expect(visited).toHaveBeenCalledWith('current-user');
  });
  it('rejects private endpoints when no identity is available', async () => {
    userId.mockRejectedValue(new UnauthorizedException());
    await request(app.getHttpServer()).post('/trips').send(payload).expect(401);
    await request(app.getHttpServer()).get('/me/visited-countries').expect(401);
    expect(create).not.toHaveBeenCalled();
    expect(visited).not.toHaveBeenCalled();
  });
});
