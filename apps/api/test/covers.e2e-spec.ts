import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import request from 'supertest';
import { CurrentUserService } from '../src/current-user/current-user.service.js';
import { DatabaseService } from '../src/prisma/database.service.js';
import { TripCoversController } from '../src/trips/trip-covers.controller.js';
import { TripCoversService } from '../src/trips/trip-covers.service.js';
import { CoverStorageService } from '../src/trips/cover-storage.service.js';
import { MAX_COVER_BYTES } from '../src/trips/cover-file.js';

describe('Cover multipart HTTP contract', () => {
  let app: INestApplication<App>;
  let path: string | null = null;
  const identity = jest.fn<CurrentUserService['getUserId']>();
  const upload = jest.fn<CoverStorageService['upload']>();
  const cleanup = jest.fn<CoverStorageService['cleanup']>();
  const image = Buffer.from('89504e470d0a1a0a00000000', 'hex');
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [TripCoversController],
      providers: [
        TripCoversService,
        { provide: CurrentUserService, useValue: { getUserId: identity } },
        {
          provide: CoverStorageService,
          useValue: {
            upload,
            cleanup,
            signedUrl: () => Promise.resolve('https://example.invalid/signed'),
          },
        },
        {
          provide: DatabaseService,
          useValue: {
            client: {
              orm: {
                public: {
                  Trip: {
                    where: (filter: {
                      id: string;
                      userId: string;
                      coverStoragePath?: string | null;
                    }) => ({
                      select: () => ({
                        first: () =>
                          Promise.resolve(
                            filter.id === 'trip' && filter.userId === 'owner'
                              ? { id: 'trip', coverStoragePath: path }
                              : null,
                          ),
                      }),
                      update: (input: { coverStoragePath: string | null }) => {
                        if (
                          filter.userId !== 'owner' ||
                          filter.coverStoragePath !== path
                        )
                          return Promise.resolve(null);
                        path = input.coverStoragePath;
                        return Promise.resolve({ id: 'trip' });
                      },
                    }),
                  },
                },
              },
            },
          },
        },
      ],
    }).compile();
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
      .attach('cover', image, 'second.png')
      .expect(200);
    expect(path).not.toBe(previous);
    expect(cleanup).toHaveBeenCalledWith(previous);
    await request(app.getHttpServer())
      .delete('/me/trips/trip/cover')
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
        .field(field, 'attacker')
        .attach('cover', image, 'cover.png')
        .expect(400);
      expect(upload).not.toHaveBeenCalled();
    },
  );
  it('rejects invalid MIME and missing files', async () => {
    await request(app.getHttpServer())
      .put('/me/trips/trip/cover')
      .attach('cover', Buffer.from('text'), 'cover.txt')
      .expect(400);
    await request(app.getHttpServer()).put('/me/trips/trip/cover').expect(400);
    expect(upload).not.toHaveBeenCalled();
  });
  it('enforces the multipart file limit', async () => {
    await request(app.getHttpServer())
      .put('/me/trips/trip/cover')
      .attach('cover', Buffer.alloc(MAX_COVER_BYTES + 1), 'cover.png')
      .expect(413);
    expect(upload).not.toHaveBeenCalled();
  });
  it('denies non-owner upload and deletion', async () => {
    identity.mockResolvedValue('attacker');
    await request(app.getHttpServer())
      .put('/me/trips/trip/cover')
      .attach('cover', image, 'cover.png')
      .expect(404);
    await request(app.getHttpServer())
      .delete('/me/trips/trip/cover')
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
      .attach('cover', image, 'cover.png')
      .expect(503);
    expect(path).toBeNull();
  });
});
