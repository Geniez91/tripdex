import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CoverStorageService } from './cover-storage.service.js';
import { TripCoversService } from './trip-covers.service.js';
import { MAX_COVER_BYTES } from './cover-file.js';
import { TripCoversRepository } from './repositories/trip-covers.repository.js';

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
  const findOwned = jest.fn((userId: string, tripId: string) =>
    Promise.resolve(
      userId === owner && tripId === 'trip'
        ? { id: 'trip', coverStoragePath: path }
        : null,
    ),
  );
  const updatePath = jest.fn(
    async (
      _userId: string,
      _tripId: string,
      _expectedPath: string | null,
      coverStoragePath: string | null,
    ) => {
      const result = await update({ coverStoragePath });
      if (result) path = coverStoragePath;
      return Boolean(result);
    },
  );
  const upload = jest.fn<CoverStorageService['upload']>();
  const signedUrl = jest.fn<CoverStorageService['signedUrl']>();
  const cleanup = jest.fn<CoverStorageService['cleanup']>();
  const isSubmitted = jest.fn<TripCoversRepository['isSubmitted']>();
  const repository = {
    findOwned,
    updatePath,
    isSubmitted,
  } satisfies Pick<TripCoversRepository, 'findOwned' | 'updatePath' | 'isSubmitted'>;
  const storage = {
    upload,
    signedUrl,
    cleanup,
  } satisfies Pick<CoverStorageService, 'upload' | 'signedUrl' | 'cleanup'>;
  let service: TripCoversService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [TripCoversService, TripCoversRepository, CoverStorageService],
    })
      .overrideProvider(TripCoversRepository)
      .useValue(repository)
      .overrideProvider(CoverStorageService)
      .useValue(storage)
      .compile();
    service = module.get(TripCoversService);
  });
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
    isSubmitted.mockResolvedValue(false);
    update.mockImplementation((input) => {
      path = input.coverStoragePath;
      return Promise.resolve({ id: 'trip' });
    });
  });
  it('keeps a submitted cover when it is removed from the trip', async () => {
    // Arrange
    path = oldPath;
    isSubmitted.mockResolvedValue(true);
    // Act
    const result = await service.remove('owner', 'trip');
    // Assert
    expect(result.coverStoragePath).toBeNull();
    expect(cleanup).not.toHaveBeenCalled();
  });
  it('defers cleanup when submission references cannot be checked', async () => {
    // Arrange
    path = oldPath;
    isSubmitted.mockRejectedValue(new Error('database unavailable'));
    // Act
    const result = await service.remove('owner', 'trip');
    // Assert
    expect(result.cleanupPending).toBe(true);
    expect(cleanup).not.toHaveBeenCalled();
  });
  it('returns no URL and makes no Storage call without a cover', async () => {
    // Arrange
    const pathToRead = null;

    // Act
    const result = await service.readUrl('owner', 'trip', pathToRead);

    // Assert
    expect(result).toBeNull();
    expect(signedUrl).not.toHaveBeenCalled();
  });
  it('uploads to a generated owner-scoped path and persists only that path', async () => {
    // Arrange
    const ownerId = 'owner';
    const tripId = 'trip';

    // Act
    const result = await service.replace(ownerId, tripId, file);

    // Assert
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
      // Arrange
      const invalidFile = { ...file, mimetype };

      // Act
      const replacement = service.replace('owner', 'trip', invalidFile);

      // Assert
      await expect(replacement).rejects.toThrow(BadRequestException);
      expect(upload).not.toHaveBeenCalled();
    },
  );
  it('rejects fake image bytes', async () => {
    // Arrange
    const invalidFile = { ...file, buffer: Buffer.from('<script>') };

    // Act
    const replacement = service.replace('owner', 'trip', invalidFile);

    // Assert
    await expect(replacement).rejects.toThrow(BadRequestException);
  });
  it('rejects a missing file', async () => {
    // Arrange
    const missingFile = undefined;

    // Act
    const replacement = service.replace('owner', 'trip', missingFile);

    // Assert
    await expect(replacement).rejects.toThrow(BadRequestException);
  });
  it('rejects oversized files', async () => {
    // Arrange
    const oversizedFile = { ...file, size: MAX_COVER_BYTES + 1 };

    // Act
    const replacement = service.replace('owner', 'trip', oversizedFile);

    // Assert
    await expect(replacement).rejects.toThrow(PayloadTooLargeException);
    expect(upload).not.toHaveBeenCalled();
  });
  it.each(['replace', 'remove'] as const)(
    'denies non-owner %s',
    async (operation) => {
      // Arrange
      path = oldPath;

      // Act
      const action =
        operation === 'replace'
          ? service.replace('attacker', 'trip', file)
          : service.remove('attacker', 'trip');

      // Assert
      await expect(action).rejects.toThrow(NotFoundException);
      expect(upload).not.toHaveBeenCalled();
      expect(cleanup).not.toHaveBeenCalled();
      expect(update).not.toHaveBeenCalled();
    },
  );
  it('rejects path traversal and never signs another owner’s path', async () => {
    // Arrange
    const invalidReplacement = service.replace('owner', '../trip', file);

    // Act
    const attackerUrl = await service.readUrl('attacker', 'trip', oldPath);
    const traversalUrl = await service.readUrl(
      'owner',
      'trip',
      'users/owner/trips/trip/cover/../secret.png',
    );

    // Assert
    await expect(invalidReplacement).rejects.toThrow(BadRequestException);
    expect(attackerUrl).toBeNull();
    expect(traversalUrl).toBeNull();
    expect(signedUrl).not.toHaveBeenCalled();
  });
  it('preserves the old cover on Storage failure and cleans a partial upload', async () => {
    // Arrange
    path = oldPath;
    upload.mockRejectedValue(new Error('Storage unavailable'));

    // Act
    const replacement = service.replace('owner', 'trip', file);

    // Assert
    await expect(replacement).rejects.toThrow(ServiceUnavailableException);
    expect(path).toBe(oldPath);
    expect(update).not.toHaveBeenCalled();
    expect(cleanup).not.toHaveBeenCalledWith(oldPath);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
  it('preserves the old cover if the new object cannot be signed or is missing', async () => {
    // Arrange
    path = oldPath;
    signedUrl.mockResolvedValue(null);

    // Act
    const replacement = service.replace('owner', 'trip', file);

    // Assert
    await expect(replacement).rejects.toThrow(ServiceUnavailableException);
    expect(update).not.toHaveBeenCalled();
    expect(cleanup).not.toHaveBeenCalledWith(oldPath);
  });
  it('deletes the previous object only after the new path is persisted', async () => {
    // Arrange
    path = oldPath;
    cleanup.mockImplementation((removed) => {
      expect(removed).toBe(oldPath);
      expect(path).not.toBe(oldPath);
      return Promise.resolve(true);
    });
    // Act
    const result = await service.replace('owner', 'trip', file);

    // Assert
    expect(result.cleanupPending).toBe(false);
    expect(upload.mock.invocationCallOrder[0]).toBeLessThan(
      signedUrl.mock.invocationCallOrder[0],
    );
    expect(signedUrl.mock.invocationCallOrder[0]).toBeLessThan(
      update.mock.invocationCallOrder[0],
    );
  });
  it('cleans the new object after a rejected database write', async () => {
    // Arrange
    path = oldPath;
    update.mockRejectedValue(new Error('DB failed'));

    // Act
    const replacement = service.replace('owner', 'trip', file);

    // Assert
    await expect(replacement).rejects.toThrow('DB failed');
    expect(cleanup).toHaveBeenCalledWith(upload.mock.calls[0][0]);
    expect(path).toBe(oldPath);
  });
  it('does not delete the new object after a lost commit acknowledgement', async () => {
    // Arrange
    path = oldPath;
    update.mockImplementation((input) => {
      path = input.coverStoragePath;
      return Promise.reject(new Error('Connection lost'));
    });
    // Act
    const result = await service.replace('owner', 'trip', file);

    // Assert
    expect(result.coverStoragePath).toBe(path);
    expect(cleanup).toHaveBeenCalledWith(oldPath);
    expect(cleanup).not.toHaveBeenCalledWith(path);
  });
  it('rejects a concurrent modification and cleans the losing upload', async () => {
    // Arrange
    update.mockResolvedValue(null);

    // Act
    const replacement = service.replace('owner', 'trip', file);

    // Assert
    await expect(replacement).rejects.toThrow(ConflictException);
    expect(cleanup).toHaveBeenCalledWith(upload.mock.calls[0][0]);
  });
  it('detaches before deleting and makes no Storage call without a cover', async () => {
    // Arrange
    const removalWithoutCover = service.remove('owner', 'trip');

    // Act
    const resultWithoutCover = await removalWithoutCover;

    // Assert
    expect(resultWithoutCover).toEqual({
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
    const removal = service.remove('owner', 'trip');

    // Act
    await removal;

    // Assert
    expect(cleanup).toHaveBeenCalledWith(oldPath);
  });
  it('reports cleanup failure without reverting a successful replacement', async () => {
    // Arrange
    path = oldPath;
    cleanup.mockResolvedValue(false);

    // Act
    const result = await service.replace('owner', 'trip', file);

    // Assert
    expect(result.cleanupPending).toBe(true);
    expect(path).not.toBe(oldPath);
  });
  it('preserves the object when deletion fails in PostgreSQL', async () => {
    // Arrange
    path = oldPath;
    update.mockRejectedValue(new Error('DB failed'));

    // Act
    const removal = service.remove('owner', 'trip');

    // Assert
    await expect(removal).rejects.toThrow('DB failed');
    expect(cleanup).not.toHaveBeenCalled();
    expect(path).toBe(oldPath);
  });
  it('finishes deletion after a lost database acknowledgement', async () => {
    // Arrange
    path = oldPath;
    update.mockImplementation((input) => {
      path = input.coverStoragePath;
      return Promise.reject(new Error('Connection lost'));
    });
    // Act
    const result = await service.remove('owner', 'trip');

    // Assert
    expect(result.coverStoragePath).toBeNull();
    expect(cleanup).toHaveBeenCalledWith(oldPath);
  });
  it('rejects a concurrent deletion conflict without removing the current object', async () => {
    // Arrange
    path = oldPath;
    update.mockResolvedValue(null);

    // Act
    const removal = service.remove('owner', 'trip');

    // Assert
    await expect(removal).rejects.toThrow(ConflictException);
    expect(cleanup).not.toHaveBeenCalled();
  });
  it('reports deletion cleanup failure after detaching the path', async () => {
    // Arrange
    path = oldPath;
    cleanup.mockResolvedValue(false);

    // Act
    const result = await service.remove('owner', 'trip');

    // Assert
    expect(result.cleanupPending).toBe(true);
    expect(path).toBeNull();
  });
  it('logs reconciliation failures without the storage path', async () => {
    // Arrange
    path = oldPath;
    const errorLogger = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    update.mockRejectedValue(new Error('DB failed'));
    findOwned
      .mockImplementationOnce(() =>
        Promise.resolve({ id: 'trip', coverStoragePath: oldPath }),
      )
      .mockRejectedValueOnce(new Error('reconciliation failed'));

    try {
      // Act
      const replacement = service.replace('owner', 'trip', file);

      // Assert
      await expect(replacement).rejects.toThrow('DB failed');
      expect(errorLogger).toHaveBeenCalledWith('Cover reconciliation required.');
      expect(JSON.stringify(errorLogger.mock.calls)).not.toContain(oldPath);
    } finally {
      errorLogger.mockRestore();
    }
  });
});
