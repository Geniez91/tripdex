import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import request from 'supertest';
import { AuthModule } from '../src/auth/auth.module.js';
import { SupabaseAuthService } from '../src/auth/supabase-auth.service.js';
import { UsersService } from '../src/users/users.service.js';
import { TripCoversController } from '../src/trips/trip-covers.controller.js';
import { TripCoversService } from '../src/trips/trip-covers.service.js';
import { CoverStorageService } from '../src/trips/cover-storage.service.js';
import { MAX_COVER_BYTES } from '../src/trips/cover-file.js';
import { TripCoversRepository } from '../src/trips/repositories/trip-covers.repository.js';

describe('Cover multipart HTTP contract', () => {
  let app: INestApplication<App>;
  let path: string | null = null;
  const identity = jest.fn<() => Promise<string>>();
  const upload = jest.fn<CoverStorageService['upload']>();
  const cleanup = jest.fn<CoverStorageService['cleanup']>();
  const image = Buffer.from('89504e470d0a1a0a00000000', 'hex');
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AuthModule],
      controllers: [TripCoversController],
      providers: [
        TripCoversService,
        {
          provide: CoverStorageService,
          useValue: {
            upload,
            cleanup,
            signedUrl: () => Promise.resolve('https://example.invalid/signed'),
          },
        },
        {
          provide: TripCoversRepository,
          useValue: {
            findOwned: (userId: string, tripId: string) =>
              Promise.resolve(
                userId === 'owner' && tripId === 'trip'
                  ? { id: 'trip', coverStoragePath: path }
                  : null,
              ),
            updatePath: (
              userId: string,
              tripId: string,
              expectedPath: string | null,
              coverStoragePath: string | null,
            ) => {
              if (
                userId !== 'owner' ||
                tripId !== 'trip' ||
                expectedPath !== path
              )
                return Promise.resolve(false);
              path = coverStoragePath;
              return Promise.resolve(true);
            },
          },
        },
      ],
    })
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
          id: await identity(),
          email: 'test@example.invalid',
          username: 'test-user',
        }),
      })
      .compile();
    app = module.createNestApplication();
    await app.init();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    path = null;
    identity.mockResolvedValue('owner');
    upload.mockResolvedValue();
    cleanup.mockResolvedValue(true);
  });
  afterAll(async () => {
    await app.close();
  });
  it('uploads, replaces, then deletes using only the server identity', async () => {
    const first = await request(app.getHttpServer())
      .put('/me/trips/trip/cover')
      .set('Authorization', 'Bearer test-token')
      .attach('cover', image, 'first.png')
      .expect(200);
    expect(first.body).toMatchObject({
      coverUrl: 'https://example.invalid/signed',
      cleanupPending: false,
    });
    expect(path).toMatch(/^users\/owner\/trips\/trip\/cover\//);
    const previous = path;
    await request(app.getHttpServer())
      .put('/me/trips/trip/cover')
      .set('Authorization', 'Bearer test-token')
      .attach('cover', image, 'second.png')
      .expect(200);
    expect(path).not.toBe(previous);
    expect(cleanup).toHaveBeenCalledWith(previous);
    await request(app.getHttpServer())
      .delete('/me/trips/trip/cover')
      .set('Authorization', 'Bearer test-token')
      .expect(200)
      .expect({
        coverStoragePath: null,
        coverUrl: null,
        cleanupPending: false,
      });
    expect(path).toBeNull();
  });
  it.each(['userId', 'coverStoragePath'])(
    'rejects untrusted multipart field %s',
    async (field) => {
      await request(app.getHttpServer())
        .put('/me/trips/trip/cover')
        .set('Authorization', 'Bearer test-token')
        .field(field, 'attacker')
        .attach('cover', image, 'cover.png')
        .expect(400);
      expect(upload).not.toHaveBeenCalled();
    },
  );
  it('rejects invalid MIME and missing files', async () => {
    await request(app.getHttpServer())
      .put('/me/trips/trip/cover')
      .set('Authorization', 'Bearer test-token')
      .attach('cover', Buffer.from('text'), 'cover.txt')
      .expect(400);
    await request(app.getHttpServer())
      .put('/me/trips/trip/cover')
      .set('Authorization', 'Bearer test-token')
      .expect(400);
    expect(upload).not.toHaveBeenCalled();
  });
  it('enforces the multipart file limit', async () => {
    await request(app.getHttpServer())
      .put('/me/trips/trip/cover')
      .set('Authorization', 'Bearer test-token')
      .attach('cover', Buffer.alloc(MAX_COVER_BYTES + 1), 'cover.png')
      .expect(413);
    expect(upload).not.toHaveBeenCalled();
  });
  it('denies non-owner upload and deletion', async () => {
    identity.mockResolvedValue('attacker');
    await request(app.getHttpServer())
      .put('/me/trips/trip/cover')
      .set('Authorization', 'Bearer test-token')
      .attach('cover', image, 'cover.png')
      .expect(404);
    await request(app.getHttpServer())
      .delete('/me/trips/trip/cover')
      .set('Authorization', 'Bearer test-token')
      .expect(404);
    expect(upload).not.toHaveBeenCalled();
    expect(cleanup).not.toHaveBeenCalled();
  });
  it('rejects both operations without identity', async () => {
    identity.mockRejectedValue(new UnauthorizedException());
    await request(app.getHttpServer())
      .put('/me/trips/trip/cover')
      .attach('cover', image, 'cover.png')
      .expect(401);
    await request(app.getHttpServer())
      .delete('/me/trips/trip/cover')
      .expect(401);
  });
  it('returns a readable Storage failure without a path update', async () => {
    upload.mockRejectedValue(new Error('Storage failed'));
    await request(app.getHttpServer())
      .put('/me/trips/trip/cover')
      .set('Authorization', 'Bearer test-token')
      .attach('cover', image, 'cover.png')
      .expect(503);
    expect(path).toBeNull();
  });
});
