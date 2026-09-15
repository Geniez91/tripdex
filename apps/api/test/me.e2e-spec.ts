import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import request from 'supertest';
import { AuthModule } from '../src/auth/auth.module.js';
import { UserRepository } from '../src/users/repositories/user.repository.js';
import { UserProvisioningError } from '../src/users/user-provisioning.error.js';

const authUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'alice@example.invalid',
  email_confirmed_at: '2026-09-01T00:00:00Z',
  is_anonymous: false,
  user_metadata: {
    username: ' Alice_Paris ',
    userId: 'attacker',
    role: 'admin',
  },
};
const profile = {
  id: 'tripdex-id',
  email: authUser.email,
  username: 'alice_paris',
};
const persistenceUser = {
  ...profile,
  supabaseAuthId: authUser.id,
  access_token: 'must-not-leak',
  refresh_token: 'must-not-leak',
  user_metadata: authUser.user_metadata,
};

describe('GET /me authenticated chain', () => {
  let app: INestApplication<App>;
  const findBySupabaseAuthId =
    jest.fn<UserRepository['findBySupabaseAuthId']>();
  const create = jest.fn<UserRepository['create']>();

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AuthModule] })
      .overrideProvider(UserRepository)
      .useValue({ findBySupabaseAuthId, create })
      .compile();
    app = module.createNestApplication();
    await app.init();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    jest.replaceProperty(process, 'env', {
      ...process.env,
      SUPABASE_URL: 'https://auth.example.invalid',
      SUPABASE_SERVICE_ROLE_KEY: 'test-only-key',
    });
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(authUser));
    findBySupabaseAuthId.mockResolvedValue(null);
    create.mockResolvedValue(persistenceUser);
  });
  afterEach(() => jest.restoreAllMocks());
  afterAll(() => app.close());

  it('returns 401 without authentication and performs no provisioning', async () => {
    // Arrange
    const endpoint = request(app.getHttpServer());

    // Act
    const response = await endpoint.get('/me');

    // Assert
    expect(response.status).toBe(401);
    expect(create).not.toHaveBeenCalled();
    expect(findBySupabaseAuthId).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('provisions the first verified request and returns only the HTTP profile', async () => {
    // Arrange
    const endpoint = request(app.getHttpServer());

    // Act
    const response = await endpoint
      .get('/me?userId=attacker')
      .set('Authorization', 'Bearer test-token');

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toEqual(profile);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(create).toHaveBeenCalledWith({
      supabaseAuthId: authUser.id,
      email: authUser.email,
      username: 'alice_paris',
    });
  });

  it('returns an existing TripDex user without creation or sensitive fields', async () => {
    // Arrange
    findBySupabaseAuthId.mockResolvedValue(persistenceUser);

    // Act
    const response = await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', 'Bearer test-token');

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toEqual(profile);
    expect(create).not.toHaveBeenCalled();
    expect(findBySupabaseAuthId).toHaveBeenCalledWith(authUser.id);
  });

  it.each(['bad_jwt', 'session_expired'])(
    'returns 401 for %s without any user DB access',
    async (code) => {
      // Arrange
      jest
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(
          Response.json(
            { code, message: 'internal auth detail' },
            { status: 401 },
          ),
        );

      // Act
      const response = await request(app.getHttpServer())
        .get('/me')
        .set('Authorization', 'Bearer rejected-token');

      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        code: 'AUTH_INVALID',
        message: 'Authentication required.',
      });
      expect(findBySupabaseAuthId).not.toHaveBeenCalled();
      expect(create).not.toHaveBeenCalled();
    },
  );

  it('returns 503 for provider failure without provisioning', async () => {
    // Arrange
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        Response.json({ message: 'internal detail' }, { status: 503 }),
      );

    // Act
    const response = await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', 'Bearer test-token');

    // Assert
    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({ code: 'AUTH_UNAVAILABLE' });
    expect(findBySupabaseAuthId).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it.each([
    [{}, 'USERNAME_REQUIRED'],
    [{ username: { role: 'admin' } }, 'USERNAME_INVALID'],
  ])(
    'returns a recoverable response for invalid username metadata %#',
    async (metadata, code) => {
      // Arrange
      jest
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(
          Response.json({ ...authUser, user_metadata: metadata }),
        );

      // Act
      const response = await request(app.getHttpServer())
        .get('/me')
        .set('Authorization', 'Bearer test-token');

      // Assert
      expect(response.status).toBe(422);
      expect(response.body).toEqual({
        code,
        message: 'Choose a valid username.',
      });
      expect(create).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['USERNAME_TAKEN', 409, 'Choose another username.'],
    [
      'ACCOUNT_LINK_CONFLICT',
      409,
      'Account provisioning requires assistance.',
    ],
    [
      'USER_PROVISIONING_UNAVAILABLE',
      503,
      'Account provisioning temporarily unavailable.',
    ],
  ] as const)(
    'translates provisioning error %s',
    async (code, status, message) => {
    // Arrange
    create.mockRejectedValue(new UserProvisioningError(code));

    // Act
    const response = await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', 'Bearer test-token');

    // Assert
    expect(response.status).toBe(status);
    expect(response.body).toEqual({ code, message });
    expect(response.body).not.toHaveProperty('supabaseAuthId');
    },
  );
});
