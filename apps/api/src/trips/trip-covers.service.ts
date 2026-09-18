import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { LOGGER_CONTEXT } from '../logger.constants.js';
import { CoverStorageService } from './cover-storage.service.js';
import { coverPrefix, ownsCoverPath, validateCover } from './cover-file.js';
import type { ICoverFile } from './types/cover-format.js';
import type { ITripCoverResponseDto } from './dto/trip-cover-response.dto.js';
import { TripCoversRepository } from './repositories/trip-covers.repository.js';
import type { IOwnedTripCoverRecord } from './types/trip-cover-record.js';

@Injectable()
export class TripCoversService {
  private readonly logger = new Logger(LOGGER_CONTEXT.TRIP_COVERS_SERVICE);

  constructor(
    private readonly trips: TripCoversRepository,
    private readonly storage: CoverStorageService,
  ) {}

  private async owned(
    userId: string,
    tripId: string,
  ): Promise<IOwnedTripCoverRecord> {
    coverPrefix(userId, tripId);
    const trip = await this.trips.findOwned(userId, tripId);
    if (!trip) throw new NotFoundException('Voyage introuvable.');
    return trip;
  }

  async readUrl(
    userId: string,
    tripId: string,
    path: string | null,
  ): Promise<string | null> {
    if (!path || !ownsCoverPath(userId, tripId, path)) return null;
    return this.storage.signedUrl(path);
  }

  private createCoverPath(
    userId: string,
    tripId: string,
    file: ICoverFile | undefined,
  ): string {
    const extension = validateCover(file);
    return `${coverPrefix(userId, tripId)}${randomUUID()}.${extension}`;
  }

  private async uploadCover(
    path: string,
    file: ICoverFile,
  ): Promise<string> {
    try {
      await this.storage.upload(path, file);

      const coverUrl = await this.storage.signedUrl(path);

      if (!coverUrl) {
        throw new ServiceUnavailableException(
          'La nouvelle cover ne peut pas être lue. Réessayez.',
        );
      }

      return coverUrl;
    } catch {
      await this.storage.cleanup(path);

      throw new ServiceUnavailableException(
        'Envoi de la cover impossible. Le voyage est conservé ; réessayez.',
      );
    }
  }

  private async updateCoverPath(
    userId: string,
    tripId: string,
    previousPath: string | null,
    newPath: string,
  ): Promise<void> {
    const updated = await this.trips.updatePath(
      userId,
      tripId,
      previousPath,
      newPath,
    );

    if (!updated) {
      throw new ConflictException(
        'La cover a changé. Rechargez le voyage et réessayez.',
      );
    }
  }

  private async completeReplacement(
    userId: string,
    tripId: string,
    previousPath: string | null,
    newPath: string,
    coverUrl: string,
  ): Promise<ITripCoverResponseDto> {
    const cleanupPending = await this.cleanupOld(
      userId,
      tripId,
      previousPath,
    );

    return {
      coverStoragePath: newPath,
      coverUrl,
      cleanupPending,
    };
  }

  private async reconcileFailedUpdate(
    userId: string,
    tripId: string,
    previousPath: string | null,
    newPath: string,
    coverUrl: string,
  ): Promise<ITripCoverResponseDto | null> {
    try {
      const current = await this.owned(userId, tripId);

      if (current.coverStoragePath === newPath) {
        return await this.completeReplacement(
          userId,
          tripId,
          previousPath,
          newPath,
          coverUrl,
        );
      }

      await this.storage.cleanup(newPath);

      return null;
    } catch {
      this.logger.error('Cover reconciliation required.');

      return null;
    }
  }

  async replace(
    userId: string,
    tripId: string,
    file: ICoverFile | undefined,
  ): Promise<ITripCoverResponseDto> {
    const trip = await this.owned(userId, tripId);
    const path = this.createCoverPath(userId, tripId, file);
    const coverUrl = await this.uploadCover(path, file!);

    try {
      await this.updateCoverPath(
        userId,
        tripId,
        trip.coverStoragePath,
        path,
      );
    } catch (error: unknown) {
      const reconciled = await this.reconcileFailedUpdate(
        userId,
        tripId,
        trip.coverStoragePath,
        path,
        coverUrl,
      );

      if (reconciled) {
        this.logger.log('Trip cover replaced.');
        return reconciled;
      }

      throw error;
    }

    const replacement = await this.completeReplacement(
      userId,
      tripId,
      trip.coverStoragePath,
      path,
      coverUrl,
    );
    this.logger.log('Trip cover replaced.');
    return replacement;
  }

  private async removeCoverPath(
    userId: string,
    tripId: string,
    previousPath: string,
  ): Promise<void> {
    const updated = await this.trips.updatePath(
      userId,
      tripId,
      previousPath,
      null,
    );

    if (!updated) {
      throw new ConflictException(
        'La cover a changé. Rechargez le voyage et réessayez.',
      );
    }
  }

  private async reconcileFailedRemoval(
    userId: string,
    tripId: string,
    previousPath: string,
  ): Promise<ITripCoverResponseDto | null> {
    try {
      const current = await this.owned(userId, tripId);

      if (current.coverStoragePath === null) {
        return await this.completeRemoval(
          userId,
          tripId,
          previousPath,
        );
      }

      if (current.coverStoragePath !== previousPath) {
        await this.cleanupOld(
          userId,
          tripId,
          previousPath,
        );
      }

      return null;
    } catch {
      this.logger.error('Cover reconciliation required.');

      return null;
    }
  }

  private async completeRemoval(
    userId: string,
    tripId: string,
    previousPath: string,
  ): Promise<ITripCoverResponseDto> {
    const cleanupPending = await this.cleanupOld(
      userId,
      tripId,
      previousPath,
    );

    return {
      coverStoragePath: null,
      coverUrl: null,
      cleanupPending,
    };
  }

  private emptyCoverResponse(): ITripCoverResponseDto {
    return {
      coverStoragePath: null,
      coverUrl: null,
      cleanupPending: false,
    };
  }

  async remove(
    userId: string,
    tripId: string,
  ): Promise<ITripCoverResponseDto> {
    const trip = await this.owned(userId, tripId);
    if (!trip.coverStoragePath) {
      return this.emptyCoverResponse();
    }

    try {
      await this.removeCoverPath(
        userId,
        tripId,
        trip.coverStoragePath,
      );
    } catch (error: unknown) {
      const reconciled = await this.reconcileFailedRemoval(
        userId,
        tripId,
        trip.coverStoragePath,
      );

      if (reconciled) {
        this.logger.log('Trip cover removed.');
        return reconciled;
      }

      throw error;
    }

    const removal = await this.completeRemoval(
      userId,
      tripId,
      trip.coverStoragePath,
    );
    this.logger.log('Trip cover removed.');
    return removal;
  }

  private async cleanupOld(
    userId: string,
    tripId: string,
    path: string | null,
  ): Promise<boolean> {
    if (!path || !ownsCoverPath(userId, tripId, path)) return false;
    try {
      if (await this.trips.isSubmitted(tripId, path)) return false;
    } catch {
      return true;
    }
    return !(await this.storage.cleanup(path));
  }
}
