import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { AppService } from '../src/app.service.js';
import { CitiesService } from '../src/cities/cities.service.js';
import { ResidenceService } from '../src/users/residence.service.js';
import { SupabaseAuthService } from '../src/auth/supabase-auth.service.js';
import { UsersService } from '../src/users/users.service.js';

describe('HTTP status audit: cities and residence', () => {
  let app: INestApplication<App>;
  const list = jest.fn<CitiesService['list']>();
  const get = jest.fn<ResidenceService['get']>();
  const update = jest.fn<ResidenceService['update']>();
  const getHello = jest.fn<AppService['getHello']>();
  let errorLogger: jest.SpiedFunction<Logger['error']>;
  let timingLogger: jest.SpiedFunction<Logger['log']>;
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AppService)
      .useValue({ getHello })
      .overrideProvider(CitiesService)
      .useValue({ list })
      .overrideProvider(ResidenceService)
      .useValue({ get, update })
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
        resolveOrCreateUser: () =>
          Promise.resolve({
            id: 'user-id',
            email: 'test@example.invalid',
            username: 'test-user',
          }),
      })
      .compile();
    app = module.createNestApplication();
    await app.init();
    errorLogger = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    timingLogger = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
  });
  beforeEach(() => {
    jest.resetAllMocks();
    list.mockResolvedValue([]);
    get.mockResolvedValue({ residenceCountry: null });
    update.mockResolvedValue({ residenceCountry: null });
    getHello.mockReturnValue('Hello World!');
  });
  afterAll(async () => {
    errorLogger.mockRestore();
    timingLogger.mockRestore();
    await app.close();
  });

  it('GET cities returns 200 and a JSON array without authentication', async () => {
    // Arrange
    const endpoint = request(app.getHttpServer());
    // Act
    const response = await endpoint.get('/cities?countryId=fr&q=Paris');
    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
    expect(list).toHaveBeenCalledWith('fr', 'Paris');
    expect(timingLogger).toHaveBeenCalledTimes(1);
    expect(timingLogger.mock.calls[0]?.[0]).toMatch(/^GET \/cities 200 \d+ms$/);
    expect(timingLogger.mock.calls[0]?.[0]).not.toContain('countryId');
  });
  it.each(['get', 'put'] as const)(
    '%s residence returns 200 with a representation',
    async (method) => {
      // Arrange
      const endpoint = request(app.getHttpServer());
      // Act
      const response = await endpoint[method]('/me/residence')
        .set('Authorization', 'Bearer valid')
        .send(method === 'put' ? { residenceCountryId: null } : undefined);
      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ residenceCountry: null });
      expect(response.headers['cache-control']).toBe('private, no-store');
      if (method === 'put')
        expect(update).toHaveBeenCalledWith('user-id', null);
      else expect(get).toHaveBeenCalledWith('user-id');
    },
  );
  it.each(['get', 'put'] as const)(
    '%s residence returns 401 through the real guard',
    async (method) => {
      // Arrange
      const endpoint = request(app.getHttpServer());
      // Act
      const response = await endpoint[method]('/me/residence');
      // Assert
      expect(response.status).toBe(401);
      expect(get).not.toHaveBeenCalled();
      expect(update).not.toHaveBeenCalled();
    },
  );
  it('PUT residence rejects invalid fields with 400 before the service', async () => {
    // Arrange
    const endpoint = request(app.getHttpServer());
    // Act
    const response = await endpoint
      .put('/me/residence')
      .set('Authorization', 'Bearer valid')
      .send({ userId: 'other' });
    // Assert
    expect(response.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });
  it.each([
    { method: 'get', error: new NotFoundException(), status: 404 },
    { method: 'put', error: new NotFoundException(), status: 404 },
    { method: 'put', error: new BadRequestException(), status: 400 },
    { method: 'get', error: new ServiceUnavailableException(), status: 503 },
    { method: 'put', error: new ServiceUnavailableException(), status: 503 },
  ] as const)(
    '$method residence preserves $status from the service',
    async ({ method, error, status }) => {
      // Arrange
      (method === 'get' ? get : update).mockRejectedValueOnce(error);
      // Act
      const response = await request(app.getHttpServer())
        [method]('/me/residence')
        .set('Authorization', 'Bearer valid')
        .send(method === 'put' ? { residenceCountryId: null } : undefined);
      // Assert
      expect(response.status).toBe(status);
      expect(response.body).toEqual(error.getResponse());
      expect(errorLogger).not.toHaveBeenCalled();
      expect(timingLogger.mock.calls[0]?.[0]).toMatch(
        new RegExp(`^${method.toUpperCase()} /me/residence ${status} \\d+ms$`),
      );
    },
  );

  it.each([
    [new Error('Internal PostgreSQL failure.'), 'PostgreSQL'],
    ['Internal filesystem failure.', 'filesystem'],
    [{ detail: 'Internal storage failure.' }, 'storage'],
  ])(
    'maps an unexpected thrown value to a safe 500 response',
    async (unexpected, hiddenDetail) => {
      // Arrange
      getHello.mockImplementationOnce(() => {
        throw unexpected;
      });

      // Act
      const response = await request(app.getHttpServer()).get(
        '/?access_token=must-not-log',
      );

      // Assert
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        statusCode: 500,
        message: 'Internal server error',
      });
      expect(JSON.stringify(response.body)).not.toContain(hiddenDetail);
      expect(errorLogger).toHaveBeenCalledTimes(1);
      expect(errorLogger.mock.calls[0]?.[0]).toBe(
        `Unexpected HTTP error: GET / (${unexpected instanceof Error ? unexpected.name : 'non-Error'})`,
      );
      expect(errorLogger.mock.calls[0]?.[0]).not.toContain('access_token');
      expect(timingLogger.mock.calls[0]?.[0]).toMatch(/^GET \/ 500 \d+ms$/);
    },
  );
});
