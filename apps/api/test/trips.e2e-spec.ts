import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { CountriesService } from '../src/countries/countries.service.js';
import { SupabaseAuthService } from '../src/auth/supabase-auth.service.js';
import { UsersService } from '../src/users/users.service.js';
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
  const journal = jest.fn<TripsService['journal']>();
  const detail = jest.fn<TripsService['detail']>();
  const payload = {
    title: 'Japan 2026',
    startDate: '2026-04-01',
    countryIds: ['japan'],
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SupabaseAuthService)
      .useValue({
        verifyAccessToken: () =>
          Promise.resolve({
            supabaseAuthId: 'auth-id',
            email: 'test@example.invalid',
            requestedUsername: 'test-user',
          }),
      })
      .overrideProvider(UsersService)
      .useValue({
        resolveOrCreateUser: async () => ({
          id: await userId(),
          email: 'test@example.invalid',
          username: 'test-user',
        }),
      })
      .overrideProvider(CountriesService)
      .useValue({ list: () => [country] })
      .overrideProvider(TripsService)
      .useValue({ create, visitedCountries: visited, journal, detail })
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
      cities: [],
      rating: null,
      review: null,
      visibility: 'private',
      isRevisit: false,
      revisitedCountryIds: [],
      coverStoragePath: null,
      coverUrl: null,
    });
    journal.mockResolvedValue([]);
    detail.mockResolvedValue({
      id: 'new-trip',
      title: 'Japan 2026',
      startDate: '2026-04-01T00:00:00.000Z',
      endDate: null,
      countries: [country],
      cities: [],
      rating: 5,
      review: 'First trip',
      visibility: 'private',
      isRevisit: false,
      revisitedCountryIds: [],
      coverStoragePath: null,
      coverUrl: null,
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
    await request(app.getHttpServer())
      .post('/trips')
      .set('Authorization', 'Bearer test-token')
      .send(payload)
      .expect(201);
    expect(create).toHaveBeenCalledWith('current-user', {
      ...payload,
      startDate: '2026-04-01T00:00:00.000Z',
      endDate: null,
      cityIds: [],
      rating: null,
      review: null,
      visibility: 'private',
    });
  });
  it.each([
    { ...payload, countryIds: [] },
    { ...payload, startDate: '2026-02-30' },
    { ...payload, userId: 'attacker-selected-user' },
    { ...payload, coverStoragePath: 'users/attacker/cover.png' },
  ])('rejects invalid requests before writes %#', async (body) => {
    await request(app.getHttpServer())
      .post('/trips')
      .set('Authorization', 'Bearer test-token')
      .send(body)
      .expect(400);
    expect(create).not.toHaveBeenCalled();
  });
  it('scopes visited countries to the current user', async () => {
    await request(app.getHttpServer())
      .get('/me/visited-countries')
      .set('Authorization', 'Bearer test-token')
      .expect(200)
      .expect([country]);
    expect(visited).toHaveBeenCalledWith('current-user');
  });
  it('serves the private journal and trip detail through the current identity', async () => {
    await request(app.getHttpServer())
      .get('/me/trips')
      .set('Authorization', 'Bearer test-token')
      .expect(200)
      .expect([]);
    await request(app.getHttpServer())
      .get('/me/trips/new-trip')
      .set('Authorization', 'Bearer test-token')
      .expect(200);
    expect(journal).toHaveBeenCalledWith('current-user');
    expect(detail).toHaveBeenCalledWith('current-user', 'new-trip');
  });
  it('rejects private endpoints when no identity is available', async () => {
    userId.mockRejectedValue(new UnauthorizedException());
    await request(app.getHttpServer()).post('/trips').send(payload).expect(401);
    await request(app.getHttpServer()).get('/me/visited-countries').expect(401);
    expect(create).not.toHaveBeenCalled();
    expect(visited).not.toHaveBeenCalled();
  });
});
