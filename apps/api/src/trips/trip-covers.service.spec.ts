import { jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  PayloadTooLargeException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { DatabaseService } from '../prisma/database.service.js';
import type { CoverStorageService } from './cover-storage.service.js';
import { TripCoversService } from './trip-covers.service.js';
import { MAX_COVER_BYTES } from './cover-file.js';

const oldPath =
  'users/owner/trips/trip/cover/00000000-0000-4000-8000-000000000001.png';
const bytes = Buffer.from('89504e470d0a1a0a00000000', 'hex');
const file = { buffer: bytes, size: bytes.length, mimetype: 'image/png' };

describe('Trip cover ownership and lifecycle', () => {
  let path: string | null;
  let owner: string;
  const update =
    jest.fn<
      (input: { coverStoragePath: string | null }) => Promise<object | null>
    >();
  const where = jest.fn(
    (filter: {
      id: string;
      userId: string;
      coverStoragePath?: string | null;
    }) => ({
      select: () => ({
        first: () =>
          Promise.resolve(
            filter.id === 'trip' && filter.userId === owner
              ? { id: 'trip', coverStoragePath: path }
              : null,
          ),
      }),
      update: async (input: { coverStoragePath: string | null }) => {
        expect(filter).toEqual({
          id: 'trip',
          userId: 'owner',
          coverStoragePath: path,
        });
        return update(input);
      },
    }),
  );
  const upload = jest.fn<CoverStorageService['upload']>();
  const signedUrl = jest.fn<CoverStorageService['signedUrl']>();
  const cleanup = jest.fn<CoverStorageService['cleanup']>();
  const service = new TripCoversService(
    {
      client: { orm: { public: { Trip: { where } } } },
    } as unknown as DatabaseService,
    { upload, signedUrl, cleanup } as unknown as CoverStorageService,
  );
  beforeEach(() => {
    jest.clearAllMocks();
    update.mockReset();
    path = null;
    owner = 'owner';
    upload.mockResolvedValue();
    signedUrl.mockResolvedValue(
      'https://storage.invalid/cover?token=temporary',
    );
    cleanup.mockResolvedValue(true);
    update.mockImplementation((input) => {
      path = input.coverStoragePath;
      return Promise.resolve({ id: 'trip' });
    });
  });
  it('returns no URL and makes no Storage call without a cover', async () => {
    expect(await service.readUrl('owner', 'trip', null)).toBeNull();
    expect(signedUrl).not.toHaveBeenCalled();
  });
  it('uploads to a generated owner-scoped path and persists only that path', async () => {
    const result = await service.replace('owner', 'trip', file);
    expect(result.coverStoragePath).toMatch(
      /^users\/owner\/trips\/trip\/cover\/[0-9a-f-]{36}\.png$/,
    );
    expect(update).toHaveBeenCalledWith({
      coverStoragePath: result.coverStoragePath,
    });
    expect(result.coverUrl).toContain('token=temporary');
    expect(upload).toHaveBeenCalledWith(result.coverStoragePath, file);
  });
  it.each(['image/svg+xml', 'text/plain', 'image/jpeg'])(
    'rejects MIME %s before upload',
    async (mimetype) => {
      await expect(
        service.replace('owner', 'trip', { ...file, mimetype }),
      ).rejects.toThrow(BadRequestException);
      expect(upload).not.toHaveBeenCalled();
    },
  );
  it('rejects fake image bytes', async () => {
    await expect(
      service.replace('owner', 'trip', {
        ...file,
        buffer: Buffer.from('<script>'),
      }),
    ).rejects.toThrow(BadRequestException);
  });
  it('rejects a missing file', async () => {
    await expect(service.replace('owner', 'trip', undefined)).rejects.toThrow(
      BadRequestException,
    );
  });
  it('rejects oversized files', async () => {
    await expect(
      service.replace('owner', 'trip', { ...file, size: MAX_COVER_BYTES + 1 }),
    ).rejects.toThrow(PayloadTooLargeException);
    expect(upload).not.toHaveBeenCalled();
  });
  it.each(['replace', 'remove'] as const)(
    'denies non-owner %s',
    async (operation) => {
      path = oldPath;
      await expect(
        operation === 'replace'
          ? service.replace('attacker', 'trip', file)
          : service.remove('attacker', 'trip'),
      ).rejects.toThrow(NotFoundException);
      expect(upload).not.toHaveBeenCalled();
      expect(cleanup).not.toHaveBeenCalled();
      expect(update).not.toHaveBeenCalled();
    },
  );
  it('rejects path traversal and never signs another owner’s path', async () => {
    await expect(service.replace('owner', '../trip', file)).rejects.toThrow(
      BadRequestException,
    );
    expect(await service.readUrl('attacker', 'trip', oldPath)).toBeNull();
    expect(
      await service.readUrl(
        'owner',
        'trip',
        'users/owner/trips/trip/cover/../secret.png',
      ),
    ).toBeNull();
    expect(signedUrl).not.toHaveBeenCalled();
  });
  it('preserves the old cover on Storage failure and cleans a partial upload', async () => {
    path = oldPath;
    upload.mockRejectedValue(new Error('Storage unavailable'));
    await expect(service.replace('owner', 'trip', file)).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(path).toBe(oldPath);
    expect(update).not.toHaveBeenCalled();
    expect(cleanup).not.toHaveBeenCalledWith(oldPath);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
  it('preserves the old cover if the new object cannot be signed or is missing', async () => {
    path = oldPath;
    signedUrl.mockResolvedValue(null);
    await expect(service.replace('owner', 'trip', file)).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(update).not.toHaveBeenCalled();
    expect(cleanup).not.toHaveBeenCalledWith(oldPath);
  });
  it('deletes the previous object only after the new path is persisted', async () => {
    path = oldPath;
    cleanup.mockImplementation((removed) => {
      expect(removed).toBe(oldPath);
      expect(path).not.toBe(oldPath);
      return Promise.resolve(true);
    });
    const result = await service.replace('owner', 'trip', file);
    expect(result.cleanupPending).toBe(false);
    expect(upload.mock.invocationCallOrder[0]).toBeLessThan(
      signedUrl.mock.invocationCallOrder[0],
    );
    expect(signedUrl.mock.invocationCallOrder[0]).toBeLessThan(
      update.mock.invocationCallOrder[0],
    );
  });
  it('cleans the new object after a rejected database write', async () => {
    path = oldPath;
    update.mockRejectedValue(new Error('DB failed'));
    await expect(service.replace('owner', 'trip', file)).rejects.toThrow(
      'DB failed',
    );
    expect(cleanup).toHaveBeenCalledWith(upload.mock.calls[0][0]);
    expect(path).toBe(oldPath);
  });
  it('does not delete the new object after a lost commit acknowledgement', async () => {
    path = oldPath;
    update.mockImplementation((input) => {
      path = input.coverStoragePath;
      return Promise.reject(new Error('Connection lost'));
    });
    const result = await service.replace('owner', 'trip', file);
    expect(result.coverStoragePath).toBe(path);
    expect(cleanup).toHaveBeenCalledWith(oldPath);
    expect(cleanup).not.toHaveBeenCalledWith(path);
  });
  it('rejects a concurrent modification and cleans the losing upload', async () => {
    update.mockResolvedValue(null);
    await expect(service.replace('owner', 'trip', file)).rejects.toThrow(
      ConflictException,
    );
    expect(cleanup).toHaveBeenCalledWith(upload.mock.calls[0][0]);
  });
  it('detaches before deleting and makes no Storage call without a cover', async () => {
    expect(await service.remove('owner', 'trip')).toEqual({
      coverStoragePath: null,
      coverUrl: null,
      cleanupPending: false,
    });
    expect(cleanup).not.toHaveBeenCalled();
    path = oldPath;
    cleanup.mockImplementation(() => {
      expect(path).toBeNull();
      return Promise.resolve(true);
    });
    await service.remove('owner', 'trip');
    expect(cleanup).toHaveBeenCalledWith(oldPath);
  });
  it('reports cleanup failure without reverting a successful replacement', async () => {
    path = oldPath;
    cleanup.mockResolvedValue(false);
    expect((await service.replace('owner', 'trip', file)).cleanupPending).toBe(
      true,
    );
    expect(path).not.toBe(oldPath);
  });
  it('preserves the object when deletion fails in PostgreSQL', async () => {
    path = oldPath;
    update.mockRejectedValue(new Error('DB failed'));
    await expect(service.remove('owner', 'trip')).rejects.toThrow('DB failed');
    expect(cleanup).not.toHaveBeenCalled();
    expect(path).toBe(oldPath);
  });
  it('finishes deletion after a lost database acknowledgement', async () => {
    path = oldPath;
    update.mockImplementation((input) => {
      path = input.coverStoragePath;
      return Promise.reject(new Error('Connection lost'));
    });
    expect((await service.remove('owner', 'trip')).coverStoragePath).toBeNull();
    expect(cleanup).toHaveBeenCalledWith(oldPath);
  });
  it('rejects a concurrent deletion conflict without removing the current object', async () => {
    path = oldPath;
    update.mockResolvedValue(null);
    await expect(service.remove('owner', 'trip')).rejects.toThrow(
      ConflictException,
    );
    expect(cleanup).not.toHaveBeenCalled();
  });
  it('reports deletion cleanup failure after detaching the path', async () => {
    path = oldPath;
    cleanup.mockResolvedValue(false);
    expect((await service.remove('owner', 'trip')).cleanupPending).toBe(true);
    expect(path).toBeNull();
  });
});
