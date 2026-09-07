import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../prisma/database.service.js';
import { CoverStorageService } from './cover-storage.service.js';
import { coverPrefix, ownsCoverPath, validateCover } from './cover-file.js';
import type { CoverFile } from './cover-file.js';

@Injectable()
export class TripCoversService {
  private readonly logger = new Logger(TripCoversService.name);
  constructor(
    private readonly database: DatabaseService,
    private readonly storage: CoverStorageService,
  ) {}

  private async owned(userId: string, tripId: string) {
    coverPrefix(userId, tripId);
    const trip = await this.database.client.orm.public.Trip.where({
      id: tripId,
      userId,
    })
      .select('id', 'coverStoragePath')
      .first();
    if (!trip) throw new NotFoundException('Voyage introuvable.');
    return trip;
  }

  async readUrl(userId: string, tripId: string, path: string | null) {
    if (!path || !ownsCoverPath(userId, tripId, path)) return null;
    return this.storage.signedUrl(path);
  }

  async replace(userId: string, tripId: string, file: CoverFile | undefined) {
    const trip = await this.owned(userId, tripId);
    const extension = validateCover(file);
    const path = `${coverPrefix(userId, tripId)}${randomUUID()}.${extension}`;
    let coverUrl: string | null;
    try {
      await this.storage.upload(path, file!);
      coverUrl = await this.storage.signedUrl(path);
      if (!coverUrl)
        throw new ServiceUnavailableException(
          'La nouvelle cover ne peut pas être lue. Réessayez.',
        );
    } catch {
      await this.storage.cleanup(path);
      throw new ServiceUnavailableException(
        'Envoi de la cover impossible. Le voyage est conservé ; réessayez.',
      );
    }
    try {
      const updated = await this.database.client.orm.public.Trip.where({
        id: tripId,
        userId,
        coverStoragePath: trip.coverStoragePath,
      }).update({ coverStoragePath: path });
      if (!updated)
        throw new ConflictException(
          'La cover a changé. Rechargez le voyage et réessayez.',
        );
    } catch (error) {
      // A lost DB acknowledgement can mean the update committed. Never remove a referenced cover.
      try {
        const current = await this.owned(userId, tripId);
        if (current.coverStoragePath === path) {
          const cleanupPending = await this.cleanupOld(
            userId,
            tripId,
            trip.coverStoragePath,
          );
          return { coverStoragePath: path, coverUrl, cleanupPending };
        }
        await this.storage.cleanup(path);
      } catch {
        this.logger.error(`Cover reconciliation required: ${path}`);
      }
      throw error;
    }
    const cleanupPending = await this.cleanupOld(
      userId,
      tripId,
      trip.coverStoragePath,
    );
    return { coverStoragePath: path, coverUrl, cleanupPending };
  }

  async remove(userId: string, tripId: string) {
    const trip = await this.owned(userId, tripId);
    if (!trip.coverStoragePath)
      return { coverStoragePath: null, coverUrl: null, cleanupPending: false };
    try {
      const updated = await this.database.client.orm.public.Trip.where({
        id: tripId,
        userId,
        coverStoragePath: trip.coverStoragePath,
      }).update({ coverStoragePath: null });
      if (!updated)
        throw new ConflictException(
          'La cover a changé. Rechargez le voyage et réessayez.',
        );
    } catch (error) {
      try {
        const current = await this.owned(userId, tripId);
        if (current.coverStoragePath === null) {
          const cleanupPending = await this.cleanupOld(
            userId,
            tripId,
            trip.coverStoragePath,
          );
          return { coverStoragePath: null, coverUrl: null, cleanupPending };
        }
        if (current.coverStoragePath !== trip.coverStoragePath)
          await this.cleanupOld(userId, tripId, trip.coverStoragePath);
      } catch {
        this.logger.error(
          `Cover reconciliation required: ${trip.coverStoragePath}`,
        );
      }
      throw error;
    }
    const cleanupPending = await this.cleanupOld(
      userId,
      tripId,
      trip.coverStoragePath,
    );
    return { coverStoragePath: null, coverUrl: null, cleanupPending };
  }

  private async cleanupOld(
    userId: string,
    tripId: string,
    path: string | null,
  ) {
    if (!path || !ownsCoverPath(userId, tripId, path)) return false;
    return !(await this.storage.cleanup(path));
  }
}
